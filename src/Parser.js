/**
 * Parser for glue semantics formulas and sequents
 * Converted from Haskell Parser.hs
 */

import { 
  Formula, 
  Type, 
  Linearity, 
  Sequent, 
  LambdaTerm,
  DecoratedFormula
} from './DataTypes.js';

// Simple parser combinator implementation
class Parser {
  constructor(parseFunction) {
    this.parse = parseFunction;
  }

  static of(value) {
    return new Parser(input => [{ result: value, remaining: input }]);
  }

  static failure() {
    return new Parser(input => []);
  }

  map(fn) {
    return new Parser(input => {
      const results = this.parse(input);
      return results.map(({ result, remaining }) => ({
        result: fn(result),
        remaining
      }));
    });
  }

  flatMap(fn) {
    return new Parser(input => {
      const results = this.parse(input);
      return results.flatMap(({ result, remaining }) => 
        fn(result).parse(remaining)
      );
    });
  }

  or(other) {
    return new Parser(input => [
      ...this.parse(input),
      ...other.parse(input)
    ]);
  }

  static choice(...parsers) {
    return parsers.reduce((acc, parser) => acc.or(parser), Parser.failure());
  }

  many() {
    return this.flatMap(first =>
      this.many().map(rest => [first, ...rest])
    ).or(Parser.of([]));
  }

  sepBy(separator) {
    return this.flatMap(first =>
      separator.flatMap(() => this).many().map(rest => [first, ...rest])
    ).or(Parser.of([]));
  }

  between(open, close) {
    return open.flatMap(() =>
      this.flatMap(result =>
        close.map(() => result)
      )
    );
  }

  optional() {
    return this.map(result => result).or(Parser.of(null));
  }
}

// Basic parsers
const char = (c) => new Parser(input => {
  if (input.length > 0 && input[0] === c) {
    return [{ result: c, remaining: input.slice(1) }];
  }
  return [];
});

const string = (str) => new Parser(input => {
  if (input.startsWith(str)) {
    return [{ result: str, remaining: input.slice(str.length) }];
  }
  return [];
});

const regex = (pattern) => new Parser(input => {
  const match = input.match(pattern);
  if (match && match.index === 0) {
    return [{ result: match[0], remaining: input.slice(match[0].length) }];
  }
  return [];
});

const satisfy = (predicate) => new Parser(input => {
  if (input.length > 0 && predicate(input[0])) {
    return [{ result: input[0], remaining: input.slice(1) }];
  }
  return [];
});

// Whitespace handling
const whitespace = regex(/^\s*/);
const skipSpaces = whitespace.map(() => null);

// Character classes
const isLower = c => /^[a-z]$/.test(c);
const isUpper = c => /^[A-Z]$/.test(c);
const isAlphaNum = c => /^[a-zA-Z0-9]$/.test(c);
const isDigit = c => /^[0-9]$/.test(c);

// Token parsers
const lowerAlphaNum = regex(/^[a-z][a-zA-Z0-9]*/);
const upperAlphaNum = regex(/^[A-Z][a-zA-Z0-9]*/);
const alphaNum = regex(/^[a-zA-Z0-9]+/);
const digits = regex(/^[0-9]+/);

// Atom parser
const atom = Parser.choice(
  // Lowercase atom: a.type
  skipSpaces.flatMap(() =>
    lowerAlphaNum.flatMap(name =>
      char('.').flatMap(() =>
        alphaNum.flatMap(typeName =>
          skipSpaces.map(() => 
            Formula.atom(name, Type.atomic(typeName), Linearity.LINEAR)
          )
        )
      )
    )
  ),
  // Uppercase variable: A.type
  skipSpaces.flatMap(() =>
    upperAlphaNum.flatMap(name =>
      char('.').flatMap(() =>
        alphaNum.flatMap(typeName =>
          skipSpaces.map(() => 
            Formula.variable(name, Type.atomic(typeName), Linearity.LINEAR)
          )
        )
      )
    )
  )
);

// Monadic formula parser: <modality>formula
const monadic = skipSpaces.flatMap(() =>
  char('<').flatMap(() =>
    alphaNum.flatMap(modality =>
      char('>').flatMap(() =>
        formulaParser.map(formula => {
          const monadicType = Type.monadic(modality, formula.getType());
          return Formula.monadic(formula, modality, monadicType, Linearity.LINEAR);
        })
      )
    )
  )
);

// Parenthesized formula
const parenthesized = skipSpaces.flatMap(() =>
  char('(').flatMap(() =>
    skipSpaces.flatMap(() =>
      formulaParser.flatMap(formula =>
        skipSpaces.flatMap(() =>
          char(')').flatMap(() =>
            skipSpaces.map(() => formula)
          )
        )
      )
    )
  )
);

// Binary operator parsers
const implicationOp = skipSpaces.flatMap(() => 
  Parser.choice(
    string('->'),
    string('⊸'),
    string('-o')
  ).flatMap(() => skipSpaces)
);

const tensorOp = skipSpaces.flatMap(() => 
  Parser.choice(
    string('*'),
    string('⊗')
  ).flatMap(() => skipSpaces)
);

// Forward declaration for recursive parsing
let formulaParser;

// Base formula parser (atoms, variables, monadic, parenthesized)
const baseFormula = Parser.choice(
  atom,
  monadic,
  parenthesized
);

// Binary formula parser with operator precedence
const binaryFormula = baseFormula.flatMap(left =>
  Parser.choice(
    // Implication (right-associative)
    implicationOp.flatMap(() =>
      formulaParser.map(right => {
        const funcType = Type.functional(left.getType(), right.getType());
        return Formula.implication(left, right, funcType, Linearity.LINEAR);
      })
    ),
    // Tensor (left-associative)
    tensorOp.flatMap(() =>
      baseFormula.map(right => {
        const pairType = Type.pair(left.getType(), right.getType());
        return Formula.pair(left, right, pairType, Linearity.LINEAR);
      })
    ),
    Parser.of(left)
  )
);

formulaParser = binaryFormula;

// Lambda term parser
const variable = skipSpaces.flatMap(() =>
  regex(/^v[0-9]+/).map(v => {
    const index = parseInt(v.slice(1));
    return LambdaTerm.variable(index);
  })
);

const constant = skipSpaces.flatMap(() =>
  alphaNum.map(name => LambdaTerm.constant(name))
);

const lambdaTerm = Parser.choice(
  variable,
  constant
);

// Term and formula pair parser for decorated sequents
const termAndFormula = skipSpaces.flatMap(() =>
  lambdaTerm.flatMap(term =>
    skipSpaces.flatMap(() =>
      char(':').flatMap(() =>
        skipSpaces.flatMap(() =>
          formulaParser.map(formula => [term, formula])
        )
      )
    )
  )
);

// Sequent parser
const sequentParser = Parser.choice(
  // Simple sequent: formula1, formula2, ... => conclusion
  formulaParser.sepBy(
    skipSpaces.flatMap(() =>
      char(',').flatMap(() => skipSpaces)
    )
  ).flatMap(premises =>
    skipSpaces.flatMap(() =>
      string('=>').flatMap(() =>
        skipSpaces.flatMap(() =>
          formulaParser.map(conclusion => ({
            type: 'simple',
            sequent: new Sequent(premises, conclusion)
          }))
        )
      )
    )
  ),
  
  // Decorated sequent: term1:formula1, term2:formula2, ... => conclusion
  termAndFormula.sepBy(
    skipSpaces.flatMap(() =>
      char(',').flatMap(() => skipSpaces)
    )
  ).flatMap(decoratedPremises =>
    skipSpaces.flatMap(() =>
      string('=>').flatMap(() =>
        skipSpaces.flatMap(() =>
          formulaParser.map(conclusion => ({
            type: 'decorated',
            premises: decoratedPremises,
            conclusion
          }))
        )
      )
    )
  )
);

// Main parsing functions
export function parseFormula(input) {
  try {
    const results = formulaParser.parse(input.trim());
    const successful = results.filter(r => r.remaining.trim() === '');
    
    if (successful.length > 0) {
      return { success: true, result: successful[0].result };
    } else if (results.length > 0) {
      return { 
        success: false, 
        error: `Unexpected input remaining: "${results[0].remaining}"` 
      };
    } else {
      return { success: false, error: `Cannot parse formula: "${input}"` };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export function parseSequent(input) {
  try {
    const results = sequentParser.parse(input.trim());
    const successful = results.filter(r => r.remaining.trim() === '');
    
    if (successful.length > 0) {
      return { success: true, result: successful[0].result };
    } else if (results.length > 0) {
      return { 
        success: false, 
        error: `Unexpected input remaining: "${results[0].remaining}"` 
      };
    } else {
      return { success: false, error: `Cannot parse sequent: "${input}"` };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export function parseLambdaTerm(input) {
  try {
    const results = lambdaTerm.parse(input.trim());
    const successful = results.filter(r => r.remaining.trim() === '');
    
    if (successful.length > 0) {
      return { success: true, result: successful[0].result };
    } else if (results.length > 0) {
      return { 
        success: false, 
        error: `Unexpected input remaining: "${results[0].remaining}"` 
      };
    } else {
      return { success: false, error: `Cannot parse lambda term: "${input}"` };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Convenience functions for creating common formulas
export function createAtom(name, typeName = '*') {
  return Formula.atom(name, Type.atomic(typeName), Linearity.LINEAR);
}

export function createVariable(name, typeName = '*') {
  return Formula.variable(name, Type.atomic(typeName), Linearity.LINEAR);
}

export function createImplication(antecedent, consequent) {
  const funcType = Type.functional(antecedent.getType(), consequent.getType());
  return Formula.implication(antecedent, consequent, funcType, Linearity.LINEAR);
}

export function createMonadic(formula, modality) {
  const monadicType = Type.monadic(modality, formula.getType());
  return Formula.monadic(formula, modality, monadicType, Linearity.LINEAR);
}

export function createPair(left, right) {
  const pairType = Type.pair(left.getType(), right.getType());
  return Formula.pair(left, right, pairType, Linearity.LINEAR);
}

// Example usage and testing
export function exampleFormulas() {
  return {
    atom: createAtom('john', 'e'),
    variable: createVariable('X', 'e'),
    implication: parseFormula('p.t -> q.t'),
    monadic: parseFormula('<ci>p.t'),
    complex: parseFormula('p.s -> <ci>q.s'),
    sequent: parseSequent('p.s, p.s -> q.s => q.s')
  };
}

// Export parser classes for advanced usage
export { Parser, char, string, regex, satisfy, skipSpaces };
/**
 * Core data types and structures for the glue semantics theorem prover
 * Converted from Haskell DataTypes.hs
 */

// Type system
export class Type {
  constructor(type, ...args) {
    this.type = type;
    this.args = args;
  }

  static atomic(name) {
    return new Type('atomic', name);
  }

  static monadic(modality, innerType) {
    return new Type('monadic', modality, innerType);
  }

  static pair(leftType, rightType) {
    return new Type('pair', leftType, rightType);
  }

  static functional(fromType, toType) {
    return new Type('functional', fromType, toType);
  }

  equals(other) {
    if (!(other instanceof Type) || this.type !== other.type) return false;
    if (this.args.length !== other.args.length) return false;
    return this.args.every((arg, i) => {
      if (arg instanceof Type) return arg.equals(other.args[i]);
      return arg === other.args[i];
    });
  }

  toString() {
    switch (this.type) {
      case 'atomic': return this.args[0];
      case 'monadic': return `◊${this.args[0]}(${this.args[1]})`;
      case 'pair': return `(${this.args[0]} * ${this.args[1]})`;
      case 'functional': return `(${this.args[0]} → ${this.args[1]})`;
      default: return 'Unknown';
    }
  }
}

// Linearity
export const Linearity = {
  LINEAR: 'linear',
  CLASSICAL: 'classical'
};

// Formula structures
export class Formula {
  constructor(type, ...args) {
    this.type = type;
    this.args = args;
    this.formulaType = args[args.length - 2] || Type.atomic('*');
    this.linearity = args[args.length - 1] || Linearity.LINEAR;
  }

  static atom(name, type = Type.atomic('*'), linearity = Linearity.LINEAR) {
    return new Formula('atom', name, type, linearity);
  }

  static variable(name, type = Type.atomic('*'), linearity = Linearity.LINEAR) {
    return new Formula('var', name, type, linearity);
  }

  static monadic(formula, modality, type, linearity = Linearity.LINEAR) {
    return new Formula('monadic', formula, modality, type, linearity);
  }

  static pair(left, right, type, linearity = Linearity.LINEAR) {
    return new Formula('pair', left, right, type, linearity);
  }

  static implication(antecedent, consequent, type, linearity = Linearity.LINEAR) {
    return new Formula('implication', antecedent, consequent, type, linearity);
  }

  isLinear() {
    return this.linearity === Linearity.LINEAR;
  }

  getType() {
    return this.formulaType;
  }

  changeLinearity(newLinearity) {
    const newFormula = Object.create(Object.getPrototypeOf(this));
    Object.assign(newFormula, this);
    newFormula.linearity = newLinearity;
    return newFormula;
  }

  equals(other) {
    if (!(other instanceof Formula) || this.type !== other.type) return false;
    if (this.args.length !== other.args.length) return false;
    return this.args.every((arg, i) => {
      if (arg instanceof Formula) return arg.equals(other.args[i]);
      if (arg instanceof Type) return arg.equals(other.args[i]);
      return arg === other.args[i];
    });
  }

  toString() {
    switch (this.type) {
      case 'atom': return this.args[0];
      case 'var': return this.args[0];
      case 'monadic': return `◊${this.args[1]}(${this.args[0]})`;
      case 'pair': return `(${this.args[0]} ⊗ ${this.args[1]})`;
      case 'implication': return `(${this.args[0]} ⊸ ${this.args[1]})`;
      default: return 'Unknown';
    }
  }
}

// Sequent: (Context, Formula)
export class Sequent {
  constructor(context, conclusion) {
    this.context = context || [];
    this.conclusion = conclusion;
  }

  toString() {
    const contextStr = this.context.map(f => f.toString()).join(', ');
    return `${contextStr} ⊢ ${this.conclusion.toString()}`;
  }
}

// Binary tree for proof structures
export class BinTree {
  constructor(type, label, value, ...children) {
    this.type = type;
    this.label = label;
    this.value = value;
    this.children = children;
  }

  static leaf(label, value) {
    return new BinTree('leaf', label, value);
  }

  static unary(label, value, child) {
    return new BinTree('unary', label, value, child);
  }

  static branch(label, left, value, right) {
    return new BinTree('branch', label, left, value, right);
  }

  getValue() {
    return this.value;
  }

  setValue(newValue) {
    return new BinTree(this.type, this.label, newValue, ...this.children);
  }

  map(fn) {
    const newValue = fn(this.value);
    const newChildren = this.children.map(child => 
      child instanceof BinTree ? child.map(fn) : child
    );
    return new BinTree(this.type, this.label, newValue, ...newChildren);
  }

  foldMap(fn, mappend = (a, b) => a + b, mempty = '') {
    const valueResult = fn(this.value);
    const childResults = this.children
      .filter(child => child instanceof BinTree)
      .map(child => child.foldMap(fn, mappend, mempty));
    
    return childResults.reduce(mappend, valueResult);
  }
}

// Proof rule labels
export const Label = {
  ID: 'id',
  IMP_L: 'imp_l',
  IMP_R: 'imp_r',
  TENS_L: 'tens_l',
  TENS_R: 'tens_r',
  MON_L: 'mon_l',
  MON_R: 'mon_r'
};

// Lambda calculus terms
export class LambdaTerm {
  constructor(type, ...args) {
    this.type = type;
    this.args = args;
  }

  static variable(index) {
    return new LambdaTerm('var', index);
  }

  static constant(name) {
    return new LambdaTerm('const', name);
  }

  static lambda(variable, body) {
    return new LambdaTerm('lambda', variable, body);
  }

  static application(func, arg) {
    return new LambdaTerm('app', func, arg);
  }

  static pair(left, right) {
    return new LambdaTerm('pair', left, right);
  }

  static firstProjection(term) {
    return new LambdaTerm('fst', term);
  }

  static secondProjection(term) {
    return new LambdaTerm('snd', term);
  }

  static eta(term) {
    return new LambdaTerm('eta', term);
  }

  static bind(monad, continuation) {
    return new LambdaTerm('bind', monad, continuation);
  }

  equals(other) {
    if (!(other instanceof LambdaTerm) || this.type !== other.type) return false;
    if (this.args.length !== other.args.length) return false;
    return this.args.every((arg, i) => {
      if (arg instanceof LambdaTerm) return arg.equals(other.args[i]);
      return arg === other.args[i];
    });
  }

  toString() {
    switch (this.type) {
      case 'var': return `v${this.args[0]}`;
      case 'const': return this.args[0];
      case 'lambda': return `λ${this.args[0]}.${this.args[1]}`;
      case 'app': return `(${this.args[0]} ${this.args[1]})`;
      case 'pair': return `⟨${this.args[0]}, ${this.args[1]}⟩`;
      case 'fst': return `π₁(${this.args[0]})`;
      case 'snd': return `π₂(${this.args[0]})`;
      case 'eta': return `η(${this.args[0]})`;
      case 'bind': return `(${this.args[0]} >>= ${this.args[1]})`;
      default: return 'Unknown';
    }
  }

  toHaskell() {
    switch (this.type) {
      case 'var': return `__v${this.args[0]}__`;
      case 'const': return this.args[0];
      case 'lambda': return `(\\ ${this.args[0].toHaskell()} -> ${this.args[1].toHaskell()})`;
      case 'app': return `(${this.args[0].toHaskell()} ${this.args[1].toHaskell()})`;
      case 'pair': return `(${this.args[0].toHaskell()}, ${this.args[1].toHaskell()})`;
      case 'fst': return `(fst ${this.args[0].toHaskell()})`;
      case 'snd': return `(snd ${this.args[0].toHaskell()})`;
      case 'eta': return `(return ${this.args[0].toHaskell()})`;
      case 'bind': return `(${this.args[0].toHaskell()} >>= ${this.args[1].toHaskell()})`;
      default: return 'Unknown';
    }
  }
}

// Decorated formula for proof tracking
export class DecoratedFormula {
  constructor(identifier, term, formula) {
    this.identifier = identifier;
    this.term = term;
    this.formula = formula;
  }

  equals(other) {
    return other instanceof DecoratedFormula && 
           this.identifier === other.identifier;
  }

  toString() {
    return `${this.identifier}: ${this.term} :: ${this.formula}`;
  }
}

// Decorated sequent
export class DecoratedSequent {
  constructor(context, conclusion) {
    this.context = context || [];
    this.conclusion = conclusion;
  }

  toString() {
    const contextStr = this.context.map(df => df.toString()).join(', ');
    return `${contextStr} ⊢ ${this.conclusion.toString()}`;
  }
}

// State for proof search
export class ProofState {
  constructor(counter = -1, vars = new Map()) {
    this.counter = counter;
    this.vars = vars;
  }

  getAndDecrement() {
    const current = this.counter;
    this.counter = current - 1;
    return current;
  }

  clone() {
    return new ProofState(this.counter, new Map(this.vars));
  }
}

// Non-deterministic state monad
export class NonDeterministicState {
  constructor(computation) {
    this.computation = computation;
  }

  static of(value) {
    return new NonDeterministicState(state => [[value, state]]);
  }

  static failure() {
    return new NonDeterministicState(state => []);
  }

  static get() {
    return new NonDeterministicState(state => [[state, state]]);
  }

  static put(newState) {
    return new NonDeterministicState(state => [[undefined, newState]]);
  }

  static modify(fn) {
    return NonDeterministicState.get().flatMap(state => 
      NonDeterministicState.put(fn(state))
    );
  }

  flatMap(fn) {
    return new NonDeterministicState(state => {
      const results = this.computation(state);
      return results.flatMap(([value, newState]) => 
        fn(value).computation(newState)
      );
    });
  }

  map(fn) {
    return this.flatMap(value => NonDeterministicState.of(fn(value)));
  }

  run(state) {
    return this.computation(state);
  }

  eval(state) {
    return this.run(state).map(([value, _]) => value);
  }

  static choice(...alternatives) {
    return new NonDeterministicState(state => 
      alternatives.flatMap(alt => alt.computation(state))
    );
  }

  static every(alternatives) {
    return NonDeterministicState.choice(...alternatives);
  }
}

// Utility constants
export const SANE_VARS = ["x", "y", "z", "w", "v", "k", "h", "l", "m", "n", "a", "b", "c", "d", "e"];

// Helper functions
export function split(arr) {
  if (arr.length === 0) return [{ left: [], right: [] }];
  if (arr.length === 1) return [
    { left: [], right: [arr[0]] },
    { left: [arr[0]], right: [] }
  ];
  
  const [first, ...rest] = arr;
  const restSplits = split(rest);
  
  const leftSplits = restSplits.map(({ left, right }) => ({
    left: [first, ...left],
    right
  }));
  
  const rightSplits = restSplits.map(({ left, right }) => ({
    left,
    right: [first, ...right]
  }));
  
  return [...leftSplits, ...rightSplits];
}

export function deleteItem(item, array) {
  const index = array.findIndex(x => 
    typeof x.equals === 'function' ? x.equals(item) : x === item
  );
  if (index === -1) return array;
  return [...array.slice(0, index), ...array.slice(index + 1)];
}

export function unionArrays(arr1, arr2) {
  const result = [...arr1];
  for (const item of arr2) {
    if (!result.some(x => 
      typeof x.equals === 'function' ? x.equals(item) : x === item
    )) {
      result.push(item);
    }
  }
  return result;
}
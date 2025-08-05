/**
 * Theorem Prover for Glue Semantics
 * Converted from Haskell TP.hs
 */

import {
  Formula,
  Type,
  Linearity,
  Sequent,
  DecoratedSequent,
  DecoratedFormula,
  BinTree,
  Label,
  LambdaTerm,
  ProofState,
  NonDeterministicState,
  SANE_VARS,
  split,
  deleteItem,
  unionArrays
} from './DataTypes.js';

// Starting state for proof search
export const startState = new ProofState(-1, new Map());

// Utility functions

/**
 * Gets a fresh variable and decrements the counter
 */
function getAndDecrement() {
  return NonDeterministicState.get().flatMap(state => {
    const currentId = state.counter;
    const newState = new ProofState(currentId - 1, state.vars);
    return NonDeterministicState.put(newState).map(() => currentId);
  });
}

/**
 * Converts a sequent to a decorated sequent with fresh variables
 */
export function toDecorated(sequent) {
  const decorateFormula = (formula) => {
    return getAndDecrement().flatMap(id => 
      getAndDecrement().map(varId => 
        new DecoratedFormula(id, LambdaTerm.variable(varId), formula)
      )
    );
  };

  // Handle context formulas sequentially
  let contextComputation = NonDeterministicState.of([]);
  
  for (const formula of sequent.context) {
    contextComputation = contextComputation.flatMap(acc =>
      decorateFormula(formula).map(decorated => [...acc, decorated])
    );
  }

  return contextComputation.flatMap(decoratedContext =>
    decorateFormula(sequent.conclusion).map(decoratedConclusion =>
      new DecoratedSequent(decoratedContext, decoratedConclusion)
    )
  );
}

/**
 * Unification function for formulas
 */
function unify(formula1, formula2) {
  // Simple structural unification
  if (formula1.type !== formula2.type) return false;
  
  switch (formula1.type) {
    case 'atom':
    case 'var':
      return formula1.args[0] === formula2.args[0] && 
             formula1.formulaType.equals(formula2.formulaType);
    
    case 'monadic':
      return formula1.args[1] === formula2.args[1] && // same modality
             unify(formula1.args[0], formula2.args[0]); // same inner formula
    
    case 'pair':
    case 'implication':
      return unify(formula1.args[0], formula2.args[0]) &&
             unify(formula1.args[1], formula2.args[1]);
    
    default:
      return false;
  }
}

/**
 * Substitution function for lambda terms
 */
function substitute(replacement, target, term) {
  if (term.equals(target)) return replacement;
  
  switch (term.type) {
    case 'var':
    case 'const':
      return term;
    
    case 'lambda':
      return LambdaTerm.lambda(
        substitute(replacement, target, term.args[0]),
        substitute(replacement, target, term.args[1])
      );
    
    case 'app':
      return LambdaTerm.application(
        substitute(replacement, target, term.args[0]),
        substitute(replacement, target, term.args[1])
      );
    
    case 'pair':
      return LambdaTerm.pair(
        substitute(replacement, target, term.args[0]),
        substitute(replacement, target, term.args[1])
      );
    
    case 'fst':
      return LambdaTerm.firstProjection(
        substitute(replacement, target, term.args[0])
      );
    
    case 'snd':
      return LambdaTerm.secondProjection(
        substitute(replacement, target, term.args[0])
      );
    
    case 'eta':
      return LambdaTerm.eta(
        substitute(replacement, target, term.args[0])
      );
    
    case 'bind':
      return LambdaTerm.bind(
        substitute(replacement, target, term.args[0]),
        substitute(replacement, target, term.args[1])
      );
    
    default:
      return term;
  }
}

/**
 * Find a decorated formula by identifier in a context
 */
function lookupFormula(identifier, context) {
  if (!context || !Array.isArray(context)) {
    throw new Error(`Context is not an array: ${context}`);
  }
  const result = context.find(df => df && df.identifier === identifier);
  if (!result) {
    throw new Error(`Formula with identifier ${identifier} not found in context`);
  }
  return result;
}

/**
 * Safe delete item with error checking
 */
function safeDeleteItem(item, array) {
  if (!array || !Array.isArray(array)) {
    console.warn('safeDeleteItem: array is not an array:', array);
    return [];
  }
  return deleteItem(item, array);
}

/**
 * Main proof search function
 */
export function proofs(decoratedSequent) {
  if (!decoratedSequent || !decoratedSequent.context || !decoratedSequent.conclusion) {
    return NonDeterministicState.failure();
  }
  
  const [context, conclusion] = [decoratedSequent.context, decoratedSequent.conclusion];
  
  const rightRules = [identityRightRule, implicationRightRule, monadRightRule, tensorRightRule];
  
  const rightAlternatives = rightRules.map(rule => rule(decoratedSequent));
  
  const leftAlternatives = [];
  const leftRules = [identityRule, implicationLeftRule, monadLeftRule, tensorLeftRule];
  
  for (const formula of context) {
    for (const rule of leftRules) {
      const newContext = safeDeleteItem(formula, context);
      const newSequent = new DecoratedSequent(newContext, conclusion);
      leftAlternatives.push(rule(formula, newSequent));
    }
  }

  const allAlternatives = [...rightAlternatives, ...leftAlternatives];
  return NonDeterministicState.choice(...allAlternatives);
}

/**
 * Identity rule: A ⊢ A
 */
function identityRule(selectedFormula, sequent) {
  const [context, conclusion] = [sequent.context, sequent.conclusion];
  
  // Check if all hypotheses are non-linear (only applies if there are other hypotheses)
  const otherHypotheses = context.filter(df => df.identifier !== selectedFormula.identifier);
  const hasLinearHypotheses = otherHypotheses.some(df => df.formula.isLinear());
  if (hasLinearHypotheses) {
    return NonDeterministicState.failure();
  }

  // Try to unify the selected formula with the conclusion
  if (!unify(selectedFormula.formula, conclusion.formula)) {
    return NonDeterministicState.failure();
  }

  return getAndDecrement().map(varId => {
    const variable = LambdaTerm.variable(varId);
    const decoratedPremise = new DecoratedFormula(
      selectedFormula.identifier, 
      variable, 
      selectedFormula.formula
    );
    const decoratedConclusion = new DecoratedFormula(
      conclusion.identifier,
      variable,
      conclusion.formula
    );
    
    return BinTree.leaf(Label.ID, new DecoratedSequent([decoratedPremise], decoratedConclusion));
  });
}

/**
 * Identity right rule (for axioms)
 */
function identityRightRule(sequent) {
  // Identity can only work if we have the same formula in the context
  const [context, conclusion] = [sequent.context, sequent.conclusion];
  
  for (const premise of context) {
    if (unify(premise.formula, conclusion.formula)) {
      return identityRule(premise, sequent);
    }
  }
  
  return NonDeterministicState.failure();
}

/**
 * Left implication rule: Γ ⊢ A  Δ, B ⊢ C / Γ, Δ, A ⊸ B ⊢ C
 */
function implicationLeftRule(implicationFormula, sequent) {
  if (implicationFormula.formula.type !== 'implication') {
    return NonDeterministicState.failure();
  }

  const [antecedent, consequent] = implicationFormula.formula.args;
  const [context, conclusion] = [sequent.context, sequent.conclusion];

  return getAndDecrement().flatMap(antecedentId =>
    getAndDecrement().flatMap(consequentId =>
      getAndDecrement().flatMap(termVarId =>
        getAndDecrement().flatMap(argVarId => {
          const termVar = LambdaTerm.variable(termVarId);
          const argVar = LambdaTerm.variable(argVarId);
          
          const splits = split(context);
          
          const proveChildren = (leftContext, rightContext) => {
            const leftGoal = new DecoratedSequent(
              leftContext,
              new DecoratedFormula(antecedentId, termVar, antecedent)
            );
            
            const rightGoal = new DecoratedSequent(
              [new DecoratedFormula(consequentId, argVar, consequent), ...rightContext],
              conclusion
            );
            
            return proofs(leftGoal).flatMap(leftProof =>
              proofs(rightGoal).map(rightProof => ({ leftProof, rightProof }))
            );
          };

          const childProofAlternatives = splits.map(({ left, right }) => proveChildren(left, right));
          return NonDeterministicState.choice(...childProofAlternatives).map(({ leftProof, rightProof }) => {
            const leftResult = leftProof.getValue();
            const rightResult = rightProof.getValue();
            
            const consequentFormula = lookupFormula(consequentId, rightResult.context);
            const newContext = safeDeleteItem(consequentFormula, rightResult.context);
            
            const resultVar = LambdaTerm.variable(termVarId);
            const appTerm = LambdaTerm.application(resultVar, leftResult.conclusion.term);
            const resultTerm = substitute(
              appTerm,
              consequentFormula.term,
              rightResult.conclusion.term
            );
            
                          const combinedContext = unionArrays(leftResult.context || [], newContext || []);
              const resultSequent = new DecoratedSequent(
                [implicationFormula, ...combinedContext],
              new DecoratedFormula(
                rightResult.conclusion.identifier,
                resultTerm,
                rightResult.conclusion.formula
              )
            );
            
            return BinTree.branch(Label.IMP_L, leftProof, resultSequent, rightProof);
          });
        })
      )
    )
  );
}

/**
 * Right implication rule: Γ, A ⊢ B / Γ ⊢ A ⊸ B
 */
function implicationRightRule(sequent) {
  const [context, conclusion] = [sequent.context, sequent.conclusion];
  
  if (conclusion.formula.type !== 'implication') {
    return NonDeterministicState.failure();
  }

  const [antecedent, consequent] = conclusion.formula.args;

  return getAndDecrement().flatMap(antecedentId =>
    getAndDecrement().flatMap(consequentId =>
      getAndDecrement().flatMap(argVarId => {
        const argVar = LambdaTerm.variable(argVarId);
        
        const childGoal = new DecoratedSequent(
          [new DecoratedFormula(antecedentId, argVar, antecedent), ...context],
          new DecoratedFormula(consequentId, argVar, consequent)
        );
        
        return proofs(childGoal).map(childProof => {
          const childResult = childProof.getValue();
          const antecedentFormula = lookupFormula(antecedentId, childResult.context);
          const newContext = safeDeleteItem(antecedentFormula, childResult.context);
          
          const lambdaTerm = LambdaTerm.lambda(
            antecedentFormula.term,
            childResult.conclusion.term
          );
          
          const resultSequent = new DecoratedSequent(
            newContext,
            new DecoratedFormula(conclusion.identifier, lambdaTerm, conclusion.formula)
          );
          
          return BinTree.unary(Label.IMP_R, resultSequent, childProof);
        });
      })
    )
  );
}

/**
 * Left monadic rule: Γ, A ⊢ ◊B / Γ, ◊A ⊢ ◊B
 */
function monadLeftRule(monadFormula, sequent) {
  if (monadFormula.formula.type !== 'monadic') {
    return NonDeterministicState.failure();
  }

  const [innerFormula, modality1] = monadFormula.formula.args;
  const [context, conclusion] = [sequent.context, sequent.conclusion];
  
  if (conclusion.formula.type !== 'monadic') {
    return NonDeterministicState.failure();
  }
  
  const [, modality2] = conclusion.formula.args;
  
  if (modality1 !== modality2) {
    return NonDeterministicState.failure();
  }

  return getAndDecrement().flatMap(innerId => {
    const innerVar = LambdaTerm.variable(innerId);
    
    const childGoal = new DecoratedSequent(
      [new DecoratedFormula(innerId, innerVar, innerFormula), ...context],
      conclusion
    );
    
    return proofs(childGoal).map(childProof => {
      const childResult = childProof.getValue();
      const innerDecoratedFormula = lookupFormula(innerId, childResult.context);
      const newContext = safeDeleteItem(innerDecoratedFormula, childResult.context);
      
      const bindTerm = LambdaTerm.bind(
        monadFormula.term,
        LambdaTerm.lambda(innerDecoratedFormula.term, childResult.conclusion.term)
      );
      
      const resultSequent = new DecoratedSequent(
        [monadFormula, ...newContext],
        new DecoratedFormula(
          childResult.conclusion.identifier,
          bindTerm,
          childResult.conclusion.formula
        )
      );
      
      return BinTree.unary(Label.MON_L, resultSequent, childProof);
    });
  });
}

/**
 * Right monadic rule: Γ ⊢ A / Γ ⊢ ◊A
 */
function monadRightRule(sequent) {
  const [context, conclusion] = [sequent.context, sequent.conclusion];
  
  if (conclusion.formula.type !== 'monadic') {
    return NonDeterministicState.failure();
  }

  const [innerFormula] = conclusion.formula.args;

  return getAndDecrement().flatMap(innerId => {
    const childGoal = new DecoratedSequent(
      context,
      new DecoratedFormula(innerId, LambdaTerm.variable(innerId), innerFormula)
    );
    
    return proofs(childGoal).map(childProof => {
      const childResult = childProof.getValue();
      
      const etaTerm = LambdaTerm.eta(childResult.conclusion.term);
      
      const resultSequent = new DecoratedSequent(
        childResult.context,
        new DecoratedFormula(conclusion.identifier, etaTerm, conclusion.formula)
      );
      
      return BinTree.unary(Label.MON_R, resultSequent, childProof);
    });
  });
}

/**
 * Left tensor rule: Γ, A, B ⊢ C / Γ, A ⊗ B ⊢ C
 */
function tensorLeftRule(tensorFormula, sequent) {
  if (tensorFormula.formula.type !== 'pair') {
    return NonDeterministicState.failure();
  }

  const [leftFormula, rightFormula] = tensorFormula.formula.args;
  const [context, conclusion] = [sequent.context, sequent.conclusion];

  return getAndDecrement().flatMap(leftId =>
    getAndDecrement().flatMap(rightId =>
      getAndDecrement().flatMap(leftVarId =>
        getAndDecrement().flatMap(rightVarId => {
          const leftVar = LambdaTerm.variable(leftVarId);
          const rightVar = LambdaTerm.variable(rightVarId);
          
          const childGoal = new DecoratedSequent(
            [
              new DecoratedFormula(leftId, leftVar, leftFormula),
              new DecoratedFormula(rightId, rightVar, rightFormula),
              ...context
            ],
            conclusion
          );
          
          return proofs(childGoal).map(childProof => {
            const childResult = childProof.getValue();
            const leftDecoratedFormula = lookupFormula(leftId, childResult.context);
            const rightDecoratedFormula = lookupFormula(rightId, childResult.context);
            
            const tempContext = safeDeleteItem(leftDecoratedFormula, childResult.context);
            const newContext = safeDeleteItem(rightDecoratedFormula, tempContext);
            
            const substitutedTerm = substitute(
              LambdaTerm.secondProjection(tensorFormula.term),
              rightDecoratedFormula.term,
              substitute(
                LambdaTerm.firstProjection(tensorFormula.term),
                leftDecoratedFormula.term,
                childResult.conclusion.term
              )
            );
            
            const resultSequent = new DecoratedSequent(
              [tensorFormula, ...newContext],
              new DecoratedFormula(
                childResult.conclusion.identifier,
                substitutedTerm,
                childResult.conclusion.formula
              )
            );
            
            return BinTree.unary(Label.TENS_L, resultSequent, childProof);
          });
        })
      )
    )
  );
}

/**
 * Right tensor rule: Γ ⊢ A  Δ ⊢ B / Γ, Δ ⊢ A ⊗ B
 */
function tensorRightRule(sequent) {
  const [context, conclusion] = [sequent.context, sequent.conclusion];
  
  if (conclusion.formula.type !== 'pair') {
    return NonDeterministicState.failure();
  }

  const [leftFormula, rightFormula] = conclusion.formula.args;
  const splits = split(context);

  return getAndDecrement().flatMap(leftId =>
    getAndDecrement().flatMap(rightId => {
      const proveChildren = (leftContext, rightContext) => {
        const leftGoal = new DecoratedSequent(
          leftContext,
          new DecoratedFormula(leftId, LambdaTerm.variable(leftId), leftFormula)
        );
        
        const rightGoal = new DecoratedSequent(
          rightContext,
          new DecoratedFormula(rightId, LambdaTerm.variable(rightId), rightFormula)
        );
        
        return proofs(leftGoal).flatMap(leftProof =>
          proofs(rightGoal).map(rightProof => ({ leftProof, rightProof }))
        );
      };

      const childProofAlternatives = splits.map(({ left, right }) => proveChildren(left, right));
      return NonDeterministicState.choice(...childProofAlternatives).map(({ leftProof, rightProof }) => {
        const leftResult = leftProof.getValue();
        const rightResult = rightProof.getValue();
        
        const pairTerm = LambdaTerm.pair(
          leftResult.conclusion.term,
          rightResult.conclusion.term
        );
        
        const combinedContext = unionArrays(leftResult.context || [], rightResult.context || []);
        const resultSequent = new DecoratedSequent(
          combinedContext,
          new DecoratedFormula(conclusion.identifier, pairTerm, conclusion.formula)
        );
        
        return BinTree.branch(Label.TENS_R, leftProof, resultSequent, rightProof);
      });
    })
  );
}

/**
 * Lambda term reduction functions
 */

export function betaReduce(term) {
  return betaReduceWithSubstitutions(term, new Map());
}

function betaReduceWithSubstitutions(term, substitutions) {
  switch (term.type) {
    case 'var':
      return substitutions.get(term.args[0]) || term;
    
    case 'const':
      return term;
    
    case 'app':
      const [func, arg] = term.args;
      if (func.type === 'lambda') {
        const [param, body] = func.args;
        if (param.type === 'var') {
          const newSubs = new Map(substitutions);
          newSubs.set(param.args[0], arg);
          return betaReduceWithSubstitutions(body, newSubs);
        }
      }
      
      const reducedFunc = betaReduceWithSubstitutions(func, substitutions);
      if (!reducedFunc.equals(func)) {
        return betaReduceWithSubstitutions(
          LambdaTerm.application(reducedFunc, arg),
          substitutions
        );
      }
      
      return LambdaTerm.application(
        reducedFunc,
        betaReduceWithSubstitutions(arg, substitutions)
      );
    
    case 'lambda':
      return LambdaTerm.lambda(
        betaReduceWithSubstitutions(term.args[0], substitutions),
        betaReduceWithSubstitutions(term.args[1], substitutions)
      );
    
    case 'eta':
      return LambdaTerm.eta(betaReduceWithSubstitutions(term.args[0], substitutions));
    
    case 'bind':
      return LambdaTerm.bind(
        betaReduceWithSubstitutions(term.args[0], substitutions),
        betaReduceWithSubstitutions(term.args[1], substitutions)
      );
    
    case 'pair':
      return LambdaTerm.pair(
        betaReduceWithSubstitutions(term.args[0], substitutions),
        betaReduceWithSubstitutions(term.args[1], substitutions)
      );
    
    case 'fst':
      return LambdaTerm.firstProjection(
        betaReduceWithSubstitutions(term.args[0], substitutions)
      );
    
    case 'snd':
      return LambdaTerm.secondProjection(
        betaReduceWithSubstitutions(term.args[0], substitutions)
      );
    
    default:
      return term;
  }
}

export function etaReduce(term) {
  switch (term.type) {
    case 'var':
    case 'const':
      return term;
    
    case 'lambda':
      const [param, body] = term.args;
      if (body.type === 'app' && 
          body.args[1].type === 'var' && 
          param.type === 'var' &&
          body.args[1].args[0] === param.args[0]) {
        return etaReduce(body.args[0]);
      }
      
      const reducedParam = etaReduce(param);
      const reducedBody = etaReduce(body);
      
      if (reducedBody.equals(body)) {
        return LambdaTerm.lambda(reducedParam, reducedBody);
      } else {
        return etaReduce(LambdaTerm.lambda(reducedParam, reducedBody));
      }
    
    case 'app':
      return LambdaTerm.application(etaReduce(term.args[0]), etaReduce(term.args[1]));
    
    case 'eta':
      return LambdaTerm.eta(etaReduce(term.args[0]));
    
    case 'bind':
      return LambdaTerm.bind(etaReduce(term.args[0]), etaReduce(term.args[1]));
    
    case 'pair':
      return LambdaTerm.pair(etaReduce(term.args[0]), etaReduce(term.args[1]));
    
    case 'fst':
      return LambdaTerm.firstProjection(etaReduce(term.args[0]));
    
    case 'snd':
      return LambdaTerm.secondProjection(etaReduce(term.args[0]));
    
    default:
      return term;
  }
}

export function monadReduce(term) {
  switch (term.type) {
    case 'bind':
      const [monad, continuation] = term.args;
      
      // (η t) >>= u ≡ u t
      if (monad.type === 'eta') {
        return LambdaTerm.application(
          monadReduce(continuation),
          monadReduce(monad.args[0])
        );
      }
      
      // t >>= (λx. η x) ≡ t
      if (continuation.type === 'lambda') {
        const [param, body] = continuation.args;
        if (body.type === 'eta' && 
            body.args[0].type === 'var' &&
            param.type === 'var' &&
            body.args[0].args[0] === param.args[0]) {
          return monadReduce(monad);
        }
      }
      
      const reducedMonad = monadReduce(monad);
      const reducedContinuation = monadReduce(continuation);
      
      if (reducedMonad.equals(monad) && reducedContinuation.equals(continuation)) {
        return term;
      } else {
        return monadReduce(LambdaTerm.bind(reducedMonad, reducedContinuation));
      }
    
    case 'var':
    case 'const':
      return term;
    
    case 'app':
      return LambdaTerm.application(
        monadReduce(term.args[0]),
        monadReduce(term.args[1])
      );
    
    case 'lambda':
      return LambdaTerm.lambda(
        monadReduce(term.args[0]),
        monadReduce(term.args[1])
      );
    
    case 'eta':
      return LambdaTerm.eta(monadReduce(term.args[0]));
    
    case 'pair':
      return LambdaTerm.pair(
        monadReduce(term.args[0]),
        monadReduce(term.args[1])
      );
    
    case 'fst':
      return LambdaTerm.firstProjection(monadReduce(term.args[0]));
    
    case 'snd':
      return LambdaTerm.secondProjection(monadReduce(term.args[0]));
    
    default:
      return term;
  }
}

/**
 * Convenience function to prove a sequent and return all proofs
 */
export function proveSequent(sequent) {
  return toDecorated(sequent).flatMap(decoratedSequent => 
    proofs(decoratedSequent)
  );
}

/**
 * Convenience function to get the first proof of a sequent
 */
export function findProof(sequent) {
  const proofResults = proveSequent(sequent).eval(startState);
  return proofResults.length > 0 ? proofResults[0] : null;
}
#!/usr/bin/env node

/**
 * Demonstration of the JavaScript Glue Semantics Theorem Prover
 */

import { parseSequent } from './src/Parser.js';
import { findProof } from './src/TheoremProver.js';
import { HTMLFormatter, LaTeXFormatter, TextFormatter } from './src/Formatters.js';

console.log('🔬 JavaScript Glue Semantics Theorem Prover Demo\n');
console.log('Converted from Haskell original by Gianluca Giorgolo\n');

const examples = [
  {
    name: 'Identity',
    sequent: 'p.s => p.s',
    description: 'Basic identity proof'
  },
  {
    name: 'Implication',
    sequent: 'p.s -> q.s, p.s => q.s',
    description: 'Modus ponens (implication elimination)'
  },
  {
    name: 'Monadic Identity',
    sequent: '<ci>p.s => <ci>p.s',
    description: 'Identity with modal operator'
  },
  {
    name: 'Non-provable',
    sequent: 'p.s => q.s',
    description: 'Should fail - cannot derive q from p'
  }
];

for (const example of examples) {
  console.log(`\n=== ${example.name} ===`);
  console.log(`Description: ${example.description}`);
  console.log(`Input: ${example.sequent}`);
  
  try {
    const parseResult = parseSequent(example.sequent);
    
    if (!parseResult.success) {
      console.log(`❌ Parse error: ${parseResult.error}`);
      continue;
    }
    
    console.log(`Parsed: ${parseResult.result.sequent.toString()}`);
    
    const proof = findProof(parseResult.result.sequent);
    
    if (proof) {
      console.log('✅ Proof found!');
      console.log(`Text: ${TextFormatter.decoratedSequent2text(proof.value)}`);
      
      // Show HTML snippet
      const html = HTMLFormatter.proof2html(proof);
      console.log(`HTML: ${html.substring(0, 100)}...`);
      
      // Show LaTeX snippet  
      const latex = LaTeXFormatter.proof2tex(proof);
      console.log(`LaTeX: ${latex.substring(0, 80)}...`);
    } else {
      console.log('❌ No proof found (as expected)');
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
}

console.log('\n🎉 Demo completed!');
console.log('\n📚 Try the web interface at http://localhost:8080');
console.log('📘 Or use the CLI: node src/index.js "your_sequent_here"');
console.log('🧪 Run tests: node src/test.js');
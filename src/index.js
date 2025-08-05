/**
 * Main entry point for the JavaScript Glue Semantics Theorem Prover
 * Provides CLI interface and example usage
 */

import { parseSequent, parseFormula, exampleFormulas } from './Parser.js';
import { proveSequent, findProof, startState, toDecorated } from './TheoremProver.js';
import { formatProof, HTMLFormatter, LaTeXFormatter, TextFormatter } from './Formatters.js';
import { Formula, Sequent, Type, Linearity } from './DataTypes.js';

// Example sequents for testing
const examples = {
  simple: {
    input: 'p.s => p.s',
    description: 'Simple identity'
  },
  implication: {
    input: 'p.s -> q.s, p.s => q.s', 
    description: 'Modus ponens'
  },
  monadic: {
    input: '<ci>p.s => <ci>p.s',
    description: 'Monadic identity'
  },
  complex: {
    input: '<p>s.s, s.s -> <ci>s.s, <p>s.s -> <p>f.f => <p><ci>f.f',
    description: 'Complex glue semantics example'
  }
};

function runExample(exampleKey) {
  console.log(`\n=== ${examples[exampleKey].description} ===`);
  console.log(`Input: ${examples[exampleKey].input}`);
  
  try {
    const parseResult = parseSequent(examples[exampleKey].input);
    
    if (!parseResult.success) {
      console.error(`Parse error: ${parseResult.error}`);
      return;
    }

    const sequent = parseResult.result.sequent;
    console.log(`Parsed sequent: ${sequent.toString()}`);
    
    const proof = findProof(sequent);
    
    if (proof) {
      console.log('✓ Proof found!');
      console.log('\nText representation:');
      console.log(TextFormatter.decoratedSequent2text(proof.value));
      
      console.log('\nHTML proof tree:');
      const htmlProof = HTMLFormatter.proof2html(proof);
      console.log(htmlProof.substring(0, 200) + '...');
      
    } else {
      console.log('✗ No proof found');
    }
    
  } catch (error) {
    console.error(`Error: ${error.message}`);
  }
}

function runAllExamples() {
  console.log('🔬 Glue Semantics Theorem Prover - JavaScript Implementation');
  console.log('Converted from Haskell original by Gianluca Giorgolo\n');
  
  Object.keys(examples).forEach(runExample);
}

function showHelp() {
  console.log(`
Usage: node src/index.js [OPTIONS] [SEQUENT]

OPTIONS:
  --help, -h        Show this help message
  --examples        Run example proofs
  --format FORMAT   Output format: text, html, latex, json (default: text)
  --interactive     Start interactive mode

SEQUENT:
  A logical sequent in the format: "premises => conclusion"
  
Examples:
  node src/index.js "p.s => p.s"
  node src/index.js "p.s -> q.s, p.s => q.s"
  node src/index.js "<ci>p.s => <ci>p.s"
  
Interactive mode:
  node src/index.js --interactive
  
Run examples:
  node src/index.js --examples
  `);
}

function interactive() {
  console.log('🔬 Interactive Glue Semantics Theorem Prover');
  console.log('Enter sequents to prove, or "quit" to exit\n');
  
  // Note: In a real implementation, you'd use readline
  // For now, we'll just show how it would work
  console.log('Example session:');
  console.log('> p.s => p.s');
  runExample('simple');
  
  console.log('\n> p.s -> q.s, p.s => q.s');
  runExample('implication');
  
  console.log('\nType "node src/index.js --examples" to see all examples');
}

function proveSequentString(sequentStr, format = 'text') {
  try {
    const parseResult = parseSequent(sequentStr);
    
    if (!parseResult.success) {
      return { error: `Parse error: ${parseResult.error}` };
    }

    const sequent = parseResult.result.sequent;
    const proof = findProof(sequent);
    
    if (proof) {
      return {
        success: true,
        sequent: sequent.toString(),
        proof: formatProof(proof, format),
        proofTree: proof
      };
    } else {
      return {
        success: false, 
        sequent: sequent.toString(),
        message: 'No proof found'
      };
    }
    
  } catch (error) {
    return { error: error.message };
  }
}

// Main CLI handler
function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }
  
  if (args.includes('--examples')) {
    runAllExamples();
    return;
  }
  
  if (args.includes('--interactive')) {
    interactive();
    return;
  }
  
  // Find format option
  let format = 'text';
  const formatIndex = args.indexOf('--format');
  if (formatIndex !== -1 && formatIndex + 1 < args.length) {
    format = args[formatIndex + 1];
  }
  
  // Find sequent argument (last non-option argument)
  const sequentArg = args.filter(arg => !arg.startsWith('--')).pop();
  
  if (!sequentArg) {
    console.error('Error: No sequent provided');
    showHelp();
    return;
  }
  
  console.log(`Proving: ${sequentArg}`);
  const result = proveSequentString(sequentArg, format);
  
  if (result.error) {
    console.error(`Error: ${result.error}`);
  } else if (result.success) {
    console.log('✓ Proof found!');
    console.log(`\nSequent: ${result.sequent}`);
    console.log(`\nProof (${format}):`);
    console.log(result.proof);
  } else {
    console.log('✗ No proof found');
    console.log(`Sequent: ${result.sequent}`);
  }
}

// Export for use as library
export {
  proveSequentString,
  runExample,
  runAllExamples,
  examples
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
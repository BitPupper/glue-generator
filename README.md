# Glue Semantics Theorem Prover (JavaScript)

🔬 **Interactive JavaScript implementation for formal semantic analysis using glue semantics**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

This is a JavaScript conversion of the original Haskell glue semantics theorem prover by Gianluca Giorgolo. It provides a complete implementation of a theorem prover for monadic lambda calculus with applications in computational linguistics and formal semantics.

## 🚀 Features

- **Complete theorem prover** for glue semantics with natural deduction rules
- **Interactive web interface** for real-time proof exploration
- **Multiple output formats**: HTML, LaTeX, plain text, and JSON
- **Parser** for logical formulas and sequents using standard notation
- **Lambda calculus** with beta, eta, and monad reduction
- **Linear logic** support with proper resource management
- **Comprehensive test suite** with extensive examples
- **Modern ES6+** JavaScript with modular architecture

## 🎯 Quick Start

### Web Interface

1. **Clone and serve the project:**
   ```bash
   git clone <repository-url>
   cd glue-semantics-js
   python3 -m http.server 8000
   ```

2. **Open your browser** and navigate to `http://localhost:8000`

3. **Try examples** like:
   - `p.s => p.s` (Identity)
   - `p.s -> q.s, p.s => q.s` (Modus ponens)
   - `<ci>p.s => <ci>p.s` (Monadic identity)

### Command Line Interface

```bash
# Run examples
node src/index.js --examples

# Prove a specific sequent
node src/index.js "p.s => p.s"

# Get different output formats
node src/index.js --format latex "p.s -> q.s, p.s => q.s"

# Show help
node src/index.js --help
```

### As a Library

```javascript
import { parseSequent, findProof } from './src/index.js';
import { HTMLFormatter } from './src/Formatters.js';

// Parse and prove a sequent
const result = parseSequent('p.s => p.s');
if (result.success) {
    const proof = findProof(result.result.sequent);
    if (proof) {
        console.log('Proof found!');
        console.log(HTMLFormatter.proof2html(proof));
    }
}
```

## 📚 Understanding Glue Semantics

Glue semantics is a framework for compositional semantics that uses linear logic to manage semantic resources. Each word in a sentence contributes meaning (semantic content) along with instructions (glue formulas) for how that meaning can be combined with others.

### Key Concepts

- **Formulas**: Logical expressions representing semantic types
- **Sequents**: Inference rules in the form `premises ⊢ conclusion`
- **Linear Logic**: Resource-sensitive logic where each premise must be used exactly once
- **Modalities**: Operators like `◊` that control structural properties

### Formula Syntax

| Syntax | Meaning | Example |
|--------|---------|---------|
| `a.e` | Atomic formula of type e | `john.e` |
| `X.t` | Variable of type t | `X.t` |
| `A -> B` | Linear implication | `np.e -> s.t` |
| `A * B` | Multiplicative conjunction (tensor) | `det.e * noun.e` |
| `<m>A` | Modality m applied to A | `<subj>np.e` |

## 🏗️ Architecture

The system is organized into modular components:

```
src/
├── DataTypes.js      # Core data structures and types
├── Parser.js         # Formula and sequent parsing
├── TheoremProver.js  # Main proving engine with natural deduction rules
├── Formatters.js     # Output formatting (HTML, LaTeX, text, JSON)
├── index.js          # CLI interface and examples
└── test.js           # Comprehensive test suite
```

### Core Components

#### 1. **DataTypes.js**
- Type system (atomic, functional, monadic, pair types)
- Formula structures (atoms, variables, implications, modals, tensors)
- Lambda calculus terms with proper variable handling
- Non-deterministic state monad for proof search
- Binary trees for proof representation

#### 2. **Parser.js**
- Parser combinators for flexible parsing
- Support for standard logical notation
- Error handling with informative messages
- Both simple and decorated sequent parsing

#### 3. **TheoremProver.js**
- Complete natural deduction calculus
- Rules: Identity, Implication L/R, Modal L/R, Tensor L/R
- Lambda term reduction (beta, eta, monad)
- Non-deterministic proof search
- Proper variable management and substitution

#### 4. **Formatters.js**
- HTML with styled proof trees
- LaTeX using bussproofs package
- Plain text for debugging
- JSON for programmatic access

## 🧪 Testing

Run the comprehensive test suite:

```bash
# Run all tests
node src/test.js

# Or use npm script
npm test
```

The test suite covers:
- ✅ Data type creation and equality
- ✅ Parser functionality with various inputs
- ✅ Theorem prover correctness
- ✅ Lambda calculus reductions
- ✅ Output formatting
- ✅ Integration tests
- ✅ Error handling
- ✅ Performance benchmarks

## 📖 Examples

### Basic Identity
```
Input:  p.s => p.s
Result: ✓ Proof found (Identity rule)
```

### Modus Ponens
```
Input:  p.s -> q.s, p.s => q.s
Result: ✓ Proof found (Implication elimination)
```

### Monadic Operations
```
Input:  <ci>p.s => <ci>p.s  
Result: ✓ Proof found (Monadic identity)
```

### Complex Glue Semantics
```
Input:  <subj>np.e, np.e -> s.t => <subj>s.t
Result: Analysis of semantic composition
```

## 🎨 Web Interface Features

The interactive web interface provides:

- **Real-time proof search** with visual feedback
- **Multiple output formats** with tabbed interface
- **Example gallery** with common proof patterns
- **Responsive design** for desktop and mobile
- **Error handling** with helpful messages
- **Proof tree visualization** with proper mathematical notation

## 🔧 API Reference

### Core Functions

#### `parseSequent(input: string)`
Parses a sequent string into internal representation.
```javascript
const result = parseSequent('p.s => p.s');
// Returns: { success: boolean, result?: Sequent, error?: string }
```

#### `findProof(sequent: Sequent)`
Finds the first proof for a given sequent.
```javascript
const proof = findProof(sequent);
// Returns: BinTree<DecoratedSequent> | null
```

#### `formatProof(proof: BinTree, format: string)`
Formats a proof tree in the specified format.
```javascript
const html = formatProof(proof, 'html');
const latex = formatProof(proof, 'latex');
```

### Formula Construction

```javascript
import { createAtom, createImplication, createMonadic } from './src/Parser.js';

const john = createAtom('john', 'e');
const pred = createAtom('run', 'e->t');
const sentence = createImplication(john, pred);
```

## 🔬 Research Applications

This implementation is suitable for:

- **Computational linguistics** research
- **Formal semantics** education and exploration
- **Natural language processing** with semantic analysis
- **Logic programming** and automated reasoning
- **Linguistic theory** validation and testing

## 🎓 Educational Use

Perfect for:
- Teaching formal semantics and logic
- Demonstrating proof-theoretic approaches to meaning
- Exploring the syntax-semantics interface
- Understanding resource-sensitive logics

## 🚧 Limitations and Future Work

Current limitations:
- Basic unification algorithm (structural only)
- Minimal optimization for large proof searches
- Limited built-in semantic lexicon

Potential extensions:
- Advanced unification with constraints
- Parallel proof search
- Integration with syntactic parsers
- Semantic lexicon database
- Proof explanation generation

## 📄 License

This project is licensed under the MIT License - see the [LICENSE.txt](LICENSE.txt) file for details.

## 🙏 Acknowledgments

- **Gianluca Giorgolo** for the original Haskell implementation
- The **glue semantics** research community
- Contributors to **linear logic** and **computational linguistics**

## 📞 Contributing

Contributions are welcome! Please feel free to submit issues, feature requests, or pull requests.

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## 📚 References

- Dalrymple, M. (2001). *Lexical Functional Grammar*. Academic Press.
- Girard, J.-Y. (1987). Linear Logic. *Theoretical Computer Science*.
- Crouch, D. & van Genabith, J. (2000). Linear Logic for Linguistic Analyses.

---

**Happy proving! 🔬✨**
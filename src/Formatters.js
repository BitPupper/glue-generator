/**
 * Output formatters for proof trees and formulas
 * Converted from Haskell HTML.hs, XHTML.hs, Latex.hs, Txt.hs
 */

import { 
  BinTree, 
  Label, 
  DecoratedSequent, 
  DecoratedFormula, 
  LambdaTerm, 
  Formula,
  SANE_VARS 
} from './DataTypes.js';

// Text formatter
export class TextFormatter {
  static lambda2text(term) {
    switch (term.type) {
      case 'const':
        return term.args[0];
      
      case 'var':
        const index = term.args[0];
        if (index >= 0 && index < SANE_VARS.length) {
          return SANE_VARS[index];
        }
        return `v${index}`;
      
      case 'lambda':
        return `\\${this.lambda2text(term.args[0])}.${this.lambda2text(term.args[1])}`;
      
      case 'eta':
        return `eta(${this.lambda2text(term.args[0])})`;
      
      case 'app':
        const [func, arg] = term.args;
        if (func.type === 'lambda' || func.type === 'bind') {
          return `(${this.lambda2text(func)})(${this.lambda2text(arg)})`;
        }
        return `${this.lambda2text(func)}(${this.lambda2text(arg)})`;
      
      case 'bind':
        return `${this.lambda2text(term.args[0])}>>=${this.lambda2text(term.args[1])}`;
      
      case 'pair':
        return `<${this.lambda2text(term.args[0])},${this.lambda2text(term.args[1])}>`;
      
      case 'fst':
        return `p1(${this.lambda2text(term.args[0])})`;
      
      case 'snd':
        return `p2(${this.lambda2text(term.args[0])})`;
      
      default:
        return 'Unknown';
    }
  }

  static formula2text(formula) {
    switch (formula.type) {
      case 'atom':
        return formula.args[0];
      
      case 'var':
        return formula.args[0];
      
      case 'monadic':
        const [innerFormula, modality] = formula.args;
        if (innerFormula.type === 'atom' || innerFormula.type === 'var') {
          return `<${modality}>${this.formula2text(innerFormula)}`;
        }
        return `<${modality}>(${this.formula2text(innerFormula)})`;
      
      case 'implication':
        const [antecedent, consequent] = formula.args;
        const antStr = (antecedent.type === 'atom' || antecedent.type === 'var' || antecedent.type === 'monadic') 
          ? this.formula2text(antecedent)
          : `(${this.formula2text(antecedent)})`;
        return `${antStr} -> ${this.formula2text(consequent)}`;
      
      case 'pair':
        const [left, right] = formula.args;
        const leftStr = (left.type === 'atom' || left.type === 'var' || left.type === 'monadic')
          ? this.formula2text(left)
          : `(${this.formula2text(left)})`;
        return `${leftStr} * ${this.formula2text(right)}`;
      
      default:
        return 'Unknown';
    }
  }

  static decoratedFormula2text(df) {
    return `${this.lambda2text(df.term)} :: ${this.formula2text(df.formula)}`;
  }

  static decoratedSequent2text(ds) {
    const contextStr = ds.context.map(df => this.decoratedFormula2text(df)).join(', ');
    const conclusionStr = this.decoratedFormula2text(ds.conclusion);
    return `${contextStr} ⊢ ${conclusionStr}`;
  }
}

// HTML formatter
export class HTMLFormatter {
  static label2html(label) {
    switch (label) {
      case Label.ID: return 'id';
      case Label.IMP_L: return '&rarr;L';
      case Label.IMP_R: return '&rarr;R';
      case Label.MON_L: return '&loz;L';
      case Label.MON_R: return '&loz;R';
      case Label.TENS_L: return '&otimes;L';
      case Label.TENS_R: return '&otimes;R';
      default: return label;
    }
  }

  static lambda2html(term) {
    const text = TextFormatter.lambda2text(term);
    return text
      .replace(/\\/g, '&lambda;')
      .replace(/>>/g, '&gt;&gt;')
      .replace(/=/g, '=')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  static formula2html(formula) {
    const text = TextFormatter.formula2text(formula);
    return text
      .replace(/->/g, '&rarr;')
      .replace(/\*/g, '&otimes;')
      .replace(/<([^>]+)>/g, '&loz;$1');
  }

  static decoratedFormula2html(df) {
    return `${this.lambda2html(df.term)} :: ${this.formula2html(df.formula)}`;
  }

  static decoratedSequent2html(ds) {
    const contextItems = ds.context.map(df => 
      `<span class="formula">${this.decoratedFormula2html(df)}</span>`
    );
    const contextStr = contextItems.join(', ');
    const conclusionStr = `<span class="conclusion">${this.decoratedFormula2html(ds.conclusion)}</span>`;
    
    return `<div class="sequent">${contextStr} ⊢ ${conclusionStr}</div>`;
  }

  static proof2html(proof) {
    switch (proof.type) {
      case 'leaf':
        return `
          <table class="proof-tree">
            <tr><td></td></tr>
            <tr>
              <td class="rule-line">
                <hr>
                <span class="rule-label">${this.label2html(proof.label)}</span>
              </td>
            </tr>
            <tr><td class="sequent">${this.decoratedSequent2html(proof.value)}</td></tr>
          </table>
        `;
      
      case 'unary':
        return `
          <table class="proof-tree">
            <tr><td>${this.proof2html(proof.children[0])}</td></tr>
            <tr>
              <td class="rule-line">
                <hr>
                <span class="rule-label">${this.label2html(proof.label)}</span>
              </td>
            </tr>
            <tr><td class="sequent">${this.decoratedSequent2html(proof.value)}</td></tr>
          </table>
        `;
      
      case 'branch':
        const [leftProof, rightProof] = proof.children;
        return `
          <table class="proof-tree">
            <tr>
              <td>${this.proof2html(leftProof)}</td>
              <td>${this.proof2html(rightProof)}</td>
            </tr>
            <tr>
              <td colspan="2" class="rule-line">
                <hr>
                <span class="rule-label">${this.label2html(proof.label)}</span>
              </td>
            </tr>
            <tr><td colspan="2" class="sequent">${this.decoratedSequent2html(proof.value)}</td></tr>
          </table>
        `;
      
      default:
        return '<div class="error">Unknown proof structure</div>';
    }
  }

  static getCSS() {
    return `
      <style>
        .proof-tree {
          margin: 10px;
          border-collapse: collapse;
          font-family: 'Times New Roman', serif;
          text-align: center;
        }
        
        .proof-tree td {
          padding: 5px;
          vertical-align: top;
        }
        
        .rule-line {
          position: relative;
          padding: 2px 0;
        }
        
        .rule-line hr {
          border: none;
          border-top: 1px solid #000;
          margin: 0;
        }
        
        .rule-label {
          position: absolute;
          right: -20px;
          top: -8px;
          font-size: 0.8em;
          background: white;
          padding: 0 2px;
        }
        
        .sequent {
          white-space: nowrap;
          font-size: 14px;
        }
        
        .formula {
          margin: 0 2px;
        }
        
        .conclusion {
          font-weight: bold;
        }
        
        .error {
          color: red;
          font-weight: bold;
        }
      </style>
    `;
  }

  static wrapHTML(content, title = 'Glue Semantics Proof') {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        ${this.getCSS()}
      </head>
      <body>
        <div class="container">
          <h1>${title}</h1>
          ${content}
        </div>
      </body>
      </html>
    `;
  }
}

// LaTeX formatter  
export class LaTeXFormatter {
  static getHeader() {
    return '\\usepackage{amsmath,amssymb,bussproofs}\\usepackage[paperwidth=40cm]{geometry}';
  }

  static label2tex(label) {
    switch (label) {
      case Label.ID: return '\\RightLabel{$id$}';
      case Label.IMP_L: return '\\RightLabel{$\\multimap L$}';
      case Label.IMP_R: return '\\RightLabel{$\\multimap R$}';
      case Label.MON_L: return '\\RightLabel{$\\lozenge L$}';
      case Label.MON_R: return '\\RightLabel{$\\lozenge R$}';
      case Label.TENS_L: return '\\RightLabel{$\\otimes L$}';
      case Label.TENS_R: return '\\RightLabel{$\\otimes R$}';
      default: return `\\RightLabel{${label}}`;
    }
  }

  static lambda2tex(term) {
    switch (term.type) {
      case 'const':
        return `\\mathbf{${term.args[0]}}`;
      
      case 'var':
        const index = term.args[0];
        if (index >= 0 && index < SANE_VARS.length) {
          return SANE_VARS[index];
        }
        return `v_{${index}}`;
      
      case 'lambda':
        return `\\lambda ${this.lambda2tex(term.args[0])} . ${this.lambda2tex(term.args[1])}`;
      
      case 'eta':
        return `\\eta(${this.lambda2tex(term.args[0])})`;
      
      case 'app':
        const [func, arg] = term.args;
        if (func.type === 'lambda' || func.type === 'bind') {
          return `(${this.lambda2tex(func)})(${this.lambda2tex(arg)})`;
        }
        return `${this.lambda2tex(func)}(${this.lambda2tex(arg)})`;
      
      case 'bind':
        return `${this.lambda2tex(term.args[0])} \\gg\\!= ${this.lambda2tex(term.args[1])}`;
      
      case 'pair':
        return `\\langle ${this.lambda2tex(term.args[0])}, ${this.lambda2tex(term.args[1])} \\rangle`;
      
      case 'fst':
        return `\\pi_1(${this.lambda2tex(term.args[0])})`;
      
      case 'snd':
        return `\\pi_2(${this.lambda2tex(term.args[0])})`;
      
      default:
        return '\\text{Unknown}';
    }
  }

  static formula2latex(formula) {
    switch (formula.type) {
      case 'atom':
      case 'var':
        return formula.args[0];
      
      case 'monadic':
        const [innerFormula, modality] = formula.args;
        return `\\lozenge_{${modality}}(${this.formula2latex(innerFormula)})`;
      
      case 'implication':
        const [antecedent, consequent] = formula.args;
        return `(${this.formula2latex(antecedent)} \\multimap ${this.formula2latex(consequent)})`;
      
      case 'pair':
        const [left, right] = formula.args;
        return `(${this.formula2latex(left)} \\otimes ${this.formula2latex(right)})`;
      
      default:
        return '\\text{Unknown}';
    }
  }

  static decoratedFormula2tex(df) {
    return `${this.lambda2tex(df.term)} :: ${this.formula2latex(df.formula)}`;
  }

  static decoratedSequent2tex(ds) {
    const contextStr = ds.context.map(df => this.decoratedFormula2tex(df)).join(', ');
    const conclusionStr = this.decoratedFormula2tex(ds.conclusion);
    return `${contextStr} \\vdash ${conclusionStr}`;
  }

  static proof2tex(proof) {
    switch (proof.type) {
      case 'leaf':
        return `\\AxiomC{}${this.label2tex(proof.label)}\\UnaryInfC{$${this.decoratedSequent2tex(proof.value)}$}\n`;
      
      case 'unary':
        return this.proof2tex(proof.children[0]) + 
               `${this.label2tex(proof.label)}\\UnaryInfC{$${this.decoratedSequent2tex(proof.value)}$}\n`;
      
      case 'branch':
        const [leftProof, rightProof] = proof.children;
        return this.proof2tex(leftProof) + 
               this.proof2tex(rightProof) + 
               `${this.label2tex(proof.label)}\\BinaryInfC{$${this.decoratedSequent2tex(proof.value)}$}\n`;
      
      default:
        return '% Unknown proof structure\n';
    }
  }

  static simpleProof2tex(proof) {
    const texifySequent = (ds) => {
      const contextStr = ds.context.map(df => this.formula2latex(df.formula)).join(', ');
      return `${contextStr} \\vdash ${this.formula2latex(ds.conclusion.formula)}`;
    };

    switch (proof.type) {
      case 'leaf':
        return `\\AxiomC{}${this.label2tex(proof.label)}\\UnaryInfC{$${texifySequent(proof.value)}$}\n`;
      
      case 'unary':
        return this.simpleProof2tex(proof.children[0]) + 
               `${this.label2tex(proof.label)}\\UnaryInfC{$${texifySequent(proof.value)}$}\n`;
      
      case 'branch':
        const [leftProof, rightProof] = proof.children;
        return this.simpleProof2tex(leftProof) + 
               this.simpleProof2tex(rightProof) + 
               `${this.label2tex(proof.label)}\\BinaryInfC{$${texifySequent(proof.value)}$}\n`;
      
      default:
        return '% Unknown proof structure\n';
    }
  }

  static wrapDocument(content, title = 'Glue Semantics Proof') {
    return `
\\documentclass{article}
${this.getHeader()}
\\title{${title}}
\\begin{document}
\\maketitle

\\begin{prooftree}
${content}
\\end{prooftree}

\\end{document}
    `.trim();
  }
}

// JSON formatter for API responses
export class JSONFormatter {
  static proof2json(proof) {
    const result = {
      type: proof.type,
      label: proof.label,
      sequent: {
        context: proof.value.context.map(df => ({
          identifier: df.identifier,
          term: this.lambda2json(df.term),
          formula: this.formula2json(df.formula)
        })),
        conclusion: {
          identifier: proof.value.conclusion.identifier,
          term: this.lambda2json(proof.value.conclusion.term),
          formula: this.formula2json(proof.value.conclusion.formula)
        }
      }
    };

    if (proof.children && proof.children.length > 0) {
      result.children = proof.children.map(child => this.proof2json(child));
    }

    return result;
  }

  static lambda2json(term) {
    return {
      type: term.type,
      args: term.args.map(arg => 
        arg instanceof LambdaTerm ? this.lambda2json(arg) : arg
      ),
      toString: term.toString()
    };
  }

  static formula2json(formula) {
    return {
      type: formula.type,
      args: formula.args.map(arg => 
        arg instanceof Formula ? this.formula2json(arg) : arg
      ),
      formulaType: this.type2json(formula.formulaType),
      linearity: formula.linearity,
      toString: formula.toString()
    };
  }

  static type2json(type) {
    return {
      type: type.type,
      args: type.args.map(arg => 
        arg && typeof arg.type !== 'undefined' ? this.type2json(arg) : arg
      ),
      toString: type.toString()
    };
  }
}

// Factory function to get formatter by type
export function getFormatter(type) {
  switch (type.toLowerCase()) {
    case 'html':
      return HTMLFormatter;
    case 'latex':
    case 'tex':
      return LaTeXFormatter;
    case 'text':
    case 'txt':
      return TextFormatter;
    case 'json':
      return JSONFormatter;
    default:
      throw new Error(`Unknown formatter type: ${type}`);
  }
}

// Convenience functions
export function formatProof(proof, type = 'html') {
  const formatter = getFormatter(type);
  switch (type.toLowerCase()) {
    case 'html':
      return formatter.proof2html(proof);
    case 'latex':
    case 'tex':
      return formatter.proof2tex(proof);
    case 'text':
    case 'txt':
      return TextFormatter.decoratedSequent2text(proof.value);
    case 'json':
      return JSON.stringify(formatter.proof2json(proof), null, 2);
    default:
      throw new Error(`Unknown formatter type: ${type}`);
  }
}

export function formatSequent(sequent, type = 'text') {
  const formatter = getFormatter(type);
  switch (type.toLowerCase()) {
    case 'html':
      return formatter.decoratedSequent2html(sequent);
    case 'latex':
    case 'tex':
      return formatter.decoratedSequent2tex(sequent);
    case 'text':
    case 'txt':
      return formatter.decoratedSequent2text(sequent);
    default:
      return sequent.toString();
  }
}

export function formatFormula(formula, type = 'text') {
  switch (type.toLowerCase()) {
    case 'html':
      return HTMLFormatter.formula2html(formula);
    case 'latex':
    case 'tex':
      return LaTeXFormatter.formula2latex(formula);
    case 'text':
    case 'txt':
      return TextFormatter.formula2text(formula);
    case 'json':
      return JSON.stringify(JSONFormatter.formula2json(formula), null, 2);
    default:
      return formula.toString();
  }
}
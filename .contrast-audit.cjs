// Auditoría de contraste verde menta / blanco. node .contrast-audit.cjs [--fix]
const fs = require('fs'), path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const FIX = process.argv.includes('--fix');
const DARK_GREEN = '#0d7a5f', BORDER_GREEN = '#1fa37e', DARK_TEXT = '#404040';

function files(d, out = []) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) files(p, out);
    else if (/\.(jsx|js)$/.test(f)) out.push(p);
  }
  return out;
}
const op = t => { const m = t.match(/\/(\d+)$/); return m ? +m[1] : 100; };
const base = t => t.split(':').pop();
const variant = t => t.includes(':') ? t.slice(0, t.lastIndexOf(':') + 1) : '';

function bgKind(tokens) {
  const kinds = new Set();
  const plain = tokens.filter(t => !t.includes(':'));
  const hasGrad = plain.some(t => t.startsWith('bg-gradient'));
  for (const t of plain) {
    if (/^bg-(\[#41f2c0\]|\[#35d4a7\]|\[#2ab88f\]|primary)(\/\d+)?$/.test(t)) kinds.add(op(t) >= 50 ? 'mint' : 'light');
    else if (/^bg-(\[#404040\]|\[#303030\]|gray-(700|800|900)|slate-(800|900)|neutral-(800|900))(\/\d+)?$/.test(t)) kinds.add(op(t) >= 60 ? 'dark' : 'overlay');
    else if (/^bg-black/.test(t)) kinds.add('overlay');
    else if (/^bg-(white|gray|slate|neutral|zinc|stone|red|orange|amber|yellow|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|pink|rose|\[#f)/.test(t)) kinds.add('light');
  }
  if (hasGrad) {
    const from = plain.find(t => t.startsWith('from-'));
    if (from) kinds.add(/41f2c0|35d4a7|2ab88f/.test(from) && op(from) >= 50 ? 'mint' : /404040|303030|gray-(8|9)/.test(from) ? 'dark' : 'light');
  }
  kinds.delete('overlay');
  return kinds;
}

const report = [];
let fixes = 0;
for (const file of files('src')) {
  const src = fs.readFileSync(file, 'utf8');
  if (!/41f2c0|35d4a7|2ab88f|text-primary|text-white/.test(src)) continue;
  let ast;
  try { ast = parser.parse(src, { sourceType: 'module', plugins: ['jsx'] }); } catch (e) { report.push(`${file}: PARSE ERROR ${e.message}`); continue; }
  const edits = [];
  const lineOf = pos => src.slice(0, pos).split('\n').length;

  traverse(ast, {
    JSXElement: {
      enter(p) {
        const parentCtx = p.findParent(q => q.isJSXElement() && q.node._ctx);
        const inherited = parentCtx ? parentCtx.node._ctx : { bg: 'light', text: 'dark' };
        const attr = p.node.openingElement.attributes.find(a => a.type === 'JSXAttribute' && a.name && a.name.name === 'className');
        const lits = [];
        if (attr && attr.value) {
          const collect = n => {
            if (!n) return;
            if (n.type === 'StringLiteral') lits.push({ start: n.start + 1, end: n.end - 1, value: n.value });
            else if (n.type === 'TemplateLiteral') n.quasis.forEach(q => lits.push({ start: q.start, end: q.end, value: q.value.raw }));
            else for (const k of Object.keys(n)) { const v = n[k]; if (k === 'loc' || k === 'leadingComments' || k === 'trailingComments') continue; if (v && typeof v === 'object') { if (Array.isArray(v)) v.forEach(x => x && typeof x.type === 'string' && collect(x)); else if (typeof v.type === 'string') collect(v); } }
          };
          collect(attr.value);
        }
        const tokens = lits.flatMap(l => l.value.split(/\s+/).filter(Boolean));
        const kinds = bgKind(tokens);
        let bg = inherited.bg, ambiguous = false;
        if (kinds.size === 1) bg = [...kinds][0];
        else if (kinds.size > 1) { ambiguous = true; bg = kinds.has('mint') ? 'mint?' : [...kinds][0]; }
        const plainText = tokens.filter(t => !t.includes(':') && /^text-(white|\[#|gray|primary|black)/.test(t));
        let text = inherited.text;
        if (plainText.some(t => /^text-white/.test(t))) text = 'white';
        else if (plainText.length) text = 'other';
        p.node._ctx = { bg: bg.replace('?', ''), text };
        const line = lineOf(p.node.start);
        if (ambiguous && tokens.some(t => /41f2c0|text-white/.test(t))) report.push(`${file}:${line} AMBIGUO bg=${[...kinds]} :: ${tokens.join(' ').slice(0, 160)}`);

        for (const l of lits) {
          const newVal = l.value.replace(/\S+/g, tok => {
            const b = base(tok), v = variant(tok);
            if (/^(focus-visible:|focus:)?ring-offset/.test(tok)) return tok;
            // texto/iconos menta (o menta medio) sobre fondo claro
            if (bg === 'light' && /^(text|fill|stroke|decoration|placeholder|caret)-(\[#41f2c0\]|\[#35d4a7\]|\[#2ab88f\]|primary)(\/\d+)?$/.test(b)) {
              report.push(`${file}:${line} menta sobre claro: ${tok}`);
              return v + b.replace(/\[#41f2c0\]|\[#35d4a7\]|\[#2ab88f\]|primary/, `[${DARK_GREEN}]`).replace(/\/\d+$/, '');
            }
            // bordes / anillos menta sobre fondo claro (>=50 % opacidad)
            if (bg === 'light' && /^(border|ring|outline|divide)(-[trblxy])?-(\[#41f2c0\]|\[#35d4a7\])(\/\d+)?$/.test(b) && op(b) >= 50) {
              report.push(`${file}:${line} borde menta sobre claro: ${tok}`);
              return v + b.replace(/\[#41f2c0\]|\[#35d4a7\]/, `[${BORDER_GREEN}]`).replace(/\/\d+$/, '');
            }
            // texto blanco sobre menta
            if (bg === 'mint' && /^text-white(\/\d+)?$/.test(b) && !v) {
              report.push(`${file}:${line} blanco sobre menta: ${tok}`);
              return `text-[${DARK_TEXT}]` + (op(b) < 100 ? '/80' : '');
            }
            if (bg === 'mint' && /^(text|fill|stroke)-(\[#41f2c0\]|\[#35d4a7\])$/.test(b) && !v) {
              report.push(`${file}:${line} menta sobre menta: ${tok}`);
              return `${b.split('-')[0]}-[${DARK_TEXT}]`;
            }
            if (bg === 'mint' && /^(border)-white(\/\d+)?$/.test(b) && !v) {
              report.push(`${file}:${line} borde blanco sobre menta: ${tok}`);
              return `border-[${DARK_TEXT}]`;
            }
            return tok;
          });
          if (newVal !== l.value) edits.push({ start: l.start, end: l.end, value: newVal });
        }
        // hereda texto blanco sobre menta sin clase propia de texto
        if (bg === 'mint' && text === 'white' && !plainText.length && kinds.size && !ambiguous) report.push(`${file}:${line} REVISAR: hijo hereda blanco sobre menta`);
      }
    }
  });
  if (FIX && edits.length) {
    edits.sort((a, b) => b.start - a.start);
    let out = src;
    for (const e of edits) out = out.slice(0, e.start) + e.value + out.slice(e.end);
    fs.writeFileSync(file, out);
    fixes += edits.length;
  }
}
console.log(report.join('\n'));
console.log(`\n${report.length} hallazgos${FIX ? `, ${fixes} literales corregidos` : ''}`);

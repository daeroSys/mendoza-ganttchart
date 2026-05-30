const fs = require('fs');
const css = fs.readFileSync('./src/index.css', 'utf-8');
const start = Date.now();
const res1 = css.replace(/@import\s+(url\([^)]+\)|"[^"]+"|'[^']+'|[^;]+);?/g, '');
const res2 = res1.replace(/@font-face\s*\{[\s\S]*?\}/g, '');
const res3 = res2.replace(/url\(\s*(['"]?)([^#].*?)\1\s*\)/g, 'none');
console.log('Time taken:', Date.now() - start, 'ms');
console.log('Result length:', res3.length);

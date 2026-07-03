const fs = require('fs');
const path = 'dist/assets/index-BIaZcUP1.css';
const text = fs.readFileSync(path, 'utf8');
const idx = text.indexOf('.dark');
console.log('index', idx);
console.log(text.slice(Math.max(0, idx-120), Math.min(text.length, idx+260)));

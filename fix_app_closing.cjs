const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

code = code.replace(/<\/div>\}/g, '</div>');

fs.writeFileSync('src/App.tsx', code);

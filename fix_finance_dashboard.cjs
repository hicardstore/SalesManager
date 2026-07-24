const fs = require('fs');
let code = fs.readFileSync('src/components/FinanceDashboard.tsx', 'utf-8');

code = code.replace(/op\.date \|\| \(op as any\)\.createdAt/g, 'op.date');
code = code.replace(/a\.date \|\| \(a as any\)\.createdAt/g, 'a.date');
code = code.replace(/b\.date \|\| \(b as any\)\.createdAt/g, 'b.date');
code = code.replace(/selectedOp\.date \|\| \(selectedOp as any\)\.createdAt/g, 'selectedOp.date');

fs.writeFileSync('src/components/FinanceDashboard.tsx', code);

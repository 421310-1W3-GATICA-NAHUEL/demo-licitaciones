const fs = require('fs');
let code = fs.readFileSync('src/test_full_match.js', 'utf8');
code = code.replace('AMOXICILINA 172 MG', 'PARACETAMOL 500mg X 50 COMP');
fs.writeFileSync('src/test_full_match2.js', code);

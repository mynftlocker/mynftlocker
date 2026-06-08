const fs = require('fs');
let t = fs.readFileSync('app/lib-teams.ts', 'utf8');
t = t.replace("display:'LA CLIPPERS'", "display:'LOS ANGELES CLIPPERS'");
fs.writeFileSync('app/lib-teams.ts', t);
console.log('OK - LA CLIPPERS -> LOS ANGELES CLIPPERS');

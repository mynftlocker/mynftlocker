const fs = require("fs");

console.log("\n=== Nettoyage public/ (fichiers sensibles exposes publiquement) ===\n");

// getToken.js : doublon exact confirme par fc -> on supprime juste la copie public/
if (fs.existsSync("public/getToken.js")) {
  fs.unlinkSync("public/getToken.js");
  console.log("[SUPPRIME] public/getToken.js (doublon identique a la racine)");
} else {
  console.log("[ABSENT] public/getToken.js");
}

// token-test.js : pas de doublon a la racine -> on deplace
if (fs.existsSync("public/token-test.js")) {
  if (fs.existsSync("token-test.js")) {
    console.log("[CONFLIT] token-test.js existe deja a la racine. public/token-test.js NON touche. Previens Claude.");
  } else {
    fs.renameSync("public/token-test.js", "token-test.js");
    console.log("[DEPLACE] public/token-test.js -> token-test.js");
  }
} else {
  console.log("[ABSENT] public/token-test.js");
}

console.log("\n--- Verification finale ---");
console.log("public/getToken.js existe encore : " + fs.existsSync("public/getToken.js"));
console.log("public/token-test.js existe encore : " + fs.existsSync("public/token-test.js"));
console.log("getToken.js a la racine : " + fs.existsSync("getToken.js"));
console.log("token-test.js a la racine : " + fs.existsSync("token-test.js"));
console.log("\nProchaine etape : git add -A, commit, push, PUIS Redeploy Vercel (attends l'instruction de Claude).");

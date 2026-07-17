const fs = require("fs");
const path = require("path");

console.log("\n=== Installation de la route /api/auth/verify ===\n");

if (!fs.existsSync("verify_route.ts")) {
  console.log("[ARRET] verify_route.ts introuvable a la racine. Verifie le telechargement.");
  process.exit(1);
}

const authDir = path.join("app", "api", "auth");
if (!fs.existsSync(authDir)) {
  console.log("[ARRET] Dossier " + authDir + " introuvable. Structure inattendue. Previens Claude.");
  process.exit(1);
}

const verifyDir = path.join(authDir, "verify");
const verifyTarget = path.join(verifyDir, "route.ts");

if (fs.existsSync(verifyTarget)) {
  console.log("[ARRET] " + verifyTarget + " existe deja. Rien ecrase. Previens Claude.");
  process.exit(1);
}

fs.mkdirSync(verifyDir, { recursive: true });
fs.copyFileSync("verify_route.ts", verifyTarget);
console.log("[OK] " + verifyTarget + " cree");

fs.unlinkSync("verify_route.ts");
console.log("[OK] Fichier temporaire retire de la racine");

console.log("\n--- Verification finale ---");
console.log("app/api/auth/verify/route.ts existe : " + fs.existsSync(verifyTarget));

console.log("\nProchaine etape : npm run build pour tester la compilation (attends l'instruction de Claude).");

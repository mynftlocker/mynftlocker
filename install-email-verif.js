const fs = require("fs");
const path = require("path");

console.log("\n=== Installation des fichiers verification email ===\n");

// Verification que les fichiers sources existent bien a la racine
if (!fs.existsSync("email.ts")) {
  console.log("[ARRET] email.ts introuvable a la racine. Verifie le telechargement.");
  process.exit(1);
}
if (!fs.existsSync("signup_route.ts")) {
  console.log("[ARRET] signup_route.ts introuvable a la racine. Verifie le telechargement.");
  process.exit(1);
}

// 1. lib/email.ts
fs.mkdirSync("lib", { recursive: true });
fs.copyFileSync("email.ts", path.join("lib", "email.ts"));
console.log("[OK] lib/email.ts installe");

// 2. Sauvegarde de l'ancien signup avant remplacement
const signupDir = path.join("app", "api", "auth", "signup");
const signupTarget = path.join(signupDir, "route.ts");
if (!fs.existsSync(signupDir)) {
  console.log("[ARRET] Dossier " + signupDir + " introuvable. Ne correspond pas a la structure attendue. Previens Claude.");
  process.exit(1);
}
if (fs.existsSync(signupTarget)) {
  fs.copyFileSync(signupTarget, path.join(signupDir, "route.ts.backup"));
  console.log("[OK] Ancien signup sauvegarde en route.ts.backup (au cas ou)");
}
fs.copyFileSync("signup_route.ts", signupTarget);
console.log("[OK] " + signupTarget + " remplace");

// 3. Nettoyage des fichiers sources a la racine (plus besoin une fois copies)
fs.unlinkSync("email.ts");
fs.unlinkSync("signup_route.ts");
console.log("[OK] Fichiers temporaires retires de la racine");

console.log("\n--- Verification finale ---");
console.log("lib/email.ts existe : " + fs.existsSync(path.join("lib", "email.ts")));
console.log("app/api/auth/signup/route.ts existe : " + fs.existsSync(signupTarget));
console.log("Sauvegarde route.ts.backup presente : " + fs.existsSync(path.join(signupDir, "route.ts.backup")));

console.log("\nProchaine etape : NE PAS pousser sur git. Lancer d'abord le test de compilation (npm run build) - attends l'instruction de Claude.");

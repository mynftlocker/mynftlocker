const fs = require("fs");
const path = require("path");

console.log("\n=== Patch login : blocage comptes non verifies (v2, tolerant CRLF) ===\n");

const target = path.join("app", "api", "auth", "login", "route.ts");
if (!fs.existsSync(target)) {
  console.log("[ARRET] " + target + " introuvable. Previens Claude.");
  process.exit(1);
}

const original = fs.readFileSync(target, "utf8");
const usesCRLF = original.includes("\r\n");

// On travaille sur une version normalisee (LF) pour que la comparaison soit fiable,
// peu importe les fins de ligne reelles du fichier.
let code = original.replace(/\r\n/g, "\n");

const GUARD = "emailVerified";
if (code.includes(GUARD)) {
  console.log("[ARRET] Le fichier contient deja 'emailVerified' — le patch a peut-etre deja ete applique. Rien touche. Previens Claude.");
  process.exit(1);
}

const OLD = `    if (!match) {
      return NextResponse.json({ error: 'identifiants_invalides' }, { status: 401 });
    }
    const token = crypto.randomBytes(32).toString('hex');`;

const NEW = `    if (!match) {
      return NextResponse.json({ error: 'identifiants_invalides' }, { status: 401 });
    }
    if (!user.emailVerified) {
      return NextResponse.json({ error: 'email_non_verifie' }, { status: 403 });
    }
    const token = crypto.randomBytes(32).toString('hex');`;

const count = code.split(OLD).length - 1;
if (count !== 1) {
  console.log("[ARRET] Bloc attendu trouve " + count + " fois (attendu: 1) meme apres normalisation. Previens Claude avec ce message.");
  process.exit(1);
}

code = code.replace(OLD, NEW);

// On remet les fins de ligne d'origine (CRLF) si le fichier les utilisait, pour rester coherent avec le reste du projet.
if (usesCRLF) {
  code = code.replace(/\n/g, "\r\n");
}

fs.writeFileSync(target, code);
console.log("[OK] login/route.ts patche : blocage des comptes emailVerified=false");
console.log("(fins de ligne d'origine preservees : " + (usesCRLF ? "CRLF" : "LF") + ")");

console.log("\nProchaine etape : npm run build pour tester la compilation (attends l'instruction de Claude).");

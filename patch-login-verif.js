const fs = require("fs");
const path = require("path");

console.log("\n=== Patch login : blocage comptes non verifies ===\n");

const target = path.join("app", "api", "auth", "login", "route.ts");
if (!fs.existsSync(target)) {
  console.log("[ARRET] " + target + " introuvable. Previens Claude.");
  process.exit(1);
}

let code = fs.readFileSync(target, "utf8");

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
  console.log("[ARRET] Bloc attendu trouve " + count + " fois (attendu: 1). Le fichier reel differe de la version connue. Aucun changement. Previens Claude.");
  process.exit(1);
}

code = code.replace(OLD, NEW);
fs.writeFileSync(target, code);
console.log("[OK] login/route.ts patche : blocage des comptes emailVerified=false");

console.log("\nProchaine etape : npm run build pour tester la compilation (attends l'instruction de Claude).");

const fs = require("fs");
const path = require("path");

console.log("\n=== Patch login : blocage comptes non verifies (v3, ancrage ligne unique) ===\n");

const target = path.join("app", "api", "auth", "login", "route.ts");
if (!fs.existsSync(target)) {
  console.log("[ARRET] " + target + " introuvable. Previens Claude.");
  process.exit(1);
}

const original = fs.readFileSync(target, "utf8");

if (original.includes("emailVerified")) {
  console.log("[ARRET] Le fichier contient deja 'emailVerified' — le patch a peut-etre deja ete applique. Rien touche. Previens Claude.");
  process.exit(1);
}

// Ancrage : la ligne qui cree le token de session, avec capture de son indentation exacte.
const anchorRegex = /([ \t]*)const token = crypto\.randomBytes\(32\)\.toString\('hex'\);/;
const matches = original.match(new RegExp(anchorRegex.source, "g"));

if (!matches || matches.length !== 1) {
  console.log("[ARRET] Ligne d'ancrage trouvee " + (matches ? matches.length : 0) + " fois (attendu: 1). Previens Claude avec ce message et colle-lui le contenu de " + target + ".");
  process.exit(1);
}

const singleMatch = original.match(anchorRegex);
const indent = singleMatch[1]; // l'indentation exacte utilisee dans le vrai fichier

const insertion = indent + "if (!user.emailVerified) {\n" +
  indent + "  return NextResponse.json({ error: 'email_non_verifie' }, { status: 403 });\n" +
  indent + "}\n";

const patched = original.replace(anchorRegex, insertion + singleMatch[0]);

fs.writeFileSync(target, patched);
console.log("[OK] login/route.ts patche (methode ancrage ligne unique)");
console.log("Indentation detectee et reutilisee : " + JSON.stringify(indent));

console.log("\nProchaine etape : npm run build pour tester la compilation (attends l'instruction de Claude).");

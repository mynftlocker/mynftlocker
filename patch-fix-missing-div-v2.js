const fs = require("fs");

const target = "app/page.tsx";
console.log("\n=== Correctif v2 (tolerant CRLF) : balise div manquante ===\n");

if (!fs.existsSync(target)) {
  console.log("[ARRET] " + target + " introuvable. Previens Claude.");
  process.exit(1);
}

const original = fs.readFileSync(target, "utf8");
const usesCRLF = original.includes("\r\n");
let code = original.replace(/\r\n/g, "\n");

if (!code.includes("acctMenuSection")) {
  console.log("[ARRET] Le marqueur 'acctMenuSection' est absent : le patch etape 2 ne semble pas applique. Previens Claude.");
  process.exit(1);
}

const anchor = `          )}
        </div>

        {/* NAV Vestiaire / Galerie */}`;

const count = code.split(anchor).length - 1;
if (count !== 1) {
  console.log("[ARRET] Ancre trouvee " + count + " fois (attendu: 1) meme apres normalisation. Previens Claude avec ce message.");
  process.exit(1);
}

const replacement = `          )}
          </div>
        </div>

        {/* NAV Vestiaire / Galerie */}`;

code = code.replace(anchor, replacement);

if (usesCRLF) {
  code = code.replace(/\n/g, "\r\n");
}

fs.writeFileSync(target, code);
console.log("[OK] Balise fermante manquante ajoutee (fins de ligne d'origine preservees : " + (usesCRLF ? "CRLF" : "LF") + ")");

console.log("\nProchaine etape : npm run build pour tester la compilation (attends l'instruction de Claude).");

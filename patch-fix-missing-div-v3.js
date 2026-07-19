const fs = require("fs");

const target = "app/page.tsx";
console.log("\n=== Correctif final : deuxieme balise de fermeture ===\n");

if (!fs.existsSync(target)) {
  console.log("[ARRET] " + target + " introuvable. Previens Claude.");
  process.exit(1);
}

const original = fs.readFileSync(target, "utf8");

const anchor = `              ))}
            </div>
          )}
          </div>

        {/* NAV Vestiaire / Galerie */}`;

const count = original.split(anchor).length - 1;
if (count !== 1) {
  console.log("[ARRET] Ancre trouvee " + count + " fois (attendu: 1). Previens Claude et colle-lui le contenu de app/page.tsx autour du menu Mon compte.");
  process.exit(1);
}

const replacement = `              ))}
            </div>
          )}
          </div>
        </div>

        {/* NAV Vestiaire / Galerie */}`;

const patched = original.replace(anchor, replacement);
fs.writeFileSync(target, patched);
console.log("[OK] Deuxieme balise de fermeture ajoutee");

console.log("\nProchaine etape : npm run build pour tester la compilation (attends l'instruction de Claude).");

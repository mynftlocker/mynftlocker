const fs = require("fs");

const target = "app/api/auth/signup/route.ts";
console.log("\n=== Patch : annulation propre du compte si l'email echoue ===\n");

if (!fs.existsSync(target)) {
  console.log("[ARRET] " + target + " introuvable. Previens Claude.");
  process.exit(1);
}

const original = fs.readFileSync(target, "utf8");

if (original.includes("await redis.del(emailKey)")) {
  console.log("[ARRET] Le patch semble deja applique (marqueur 'redis.del(emailKey)' trouve). Rien touche. Previens Claude.");
  process.exit(1);
}

const anchor = `    } catch (emailErr) {
      // Le compte est créé mais l'email n'est pas parti : on le signale clairement plutôt que de faire semblant.
      return NextResponse.json({ error: 'email_non_envoye', detail: String(emailErr) }, { status: 502 });
    }`;

const count = original.split(anchor).length - 1;
if (count !== 1) {
  console.log("[ARRET] Ancre trouvee " + count + " fois (attendu: 1). Previens Claude.");
  process.exit(1);
}

const replacement = `    } catch (emailErr) {
      // L'email n'est pas parti : on annule proprement la creation (compte + token de verif),
      // pour ne jamais laisser de compte fantome qui bloquerait l'adresse email.
      await redis.del(emailKey);
      await redis.del('verify:' + verifyToken);
      return NextResponse.json({ error: 'email_non_envoye', detail: String(emailErr) }, { status: 502 });
    }`;

const patched = original.replace(anchor, replacement);
fs.writeFileSync(target, patched);
console.log("[OK] signup/route.ts patche : annulation propre si l'email echoue");

console.log("\nProchaine etape : npm run build pour tester la compilation (attends l'instruction de Claude).");

const readline = require("readline");
const bcrypt = require("bcryptjs");
const { spawnSync } = require("child_process");

const AUD = "mynftlocker";
const GQL = "https://api.sorare.com/graphql";
const MUTATION = `mutation SignInMutation($input: signInInput!) { signIn(input: $input) { currentUser { slug } jwtToken(aud: "${AUD}") { token expiredAt } otpSessionChallenge errors { message } } }`;

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((res) => rl.question(q, res));
const gql = (vars) => fetch(GQL, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ operationName: "SignInMutation", variables: { input: vars }, query: MUTATION })
}).then(r => r.json());

(async () => {
  try {
    console.log("\n=== Copier un token Sorare PROPRE dans le presse-papier ===\n");
    const email = (await ask("Email Sorare    : ")).trim();
    const password = (await ask("Mot de passe    : ")).trim();

    console.log("\n[1/3] Salt...");
    const saltRes = await fetch(`https://api.sorare.com/api/v1/users/${encodeURIComponent(email)}`);
    if (!saltRes.ok) throw new Error("Email inconnu (HTTP " + saltRes.status + ")");
    const { salt } = await saltRes.json();
    if (!salt) throw new Error("Salt vide");

    console.log("[2/3] Connexion...");
    const hashed = bcrypt.hashSync(password, salt);
    let j = await gql({ email, password: hashed });
    let s = j && j.data && j.data.signIn;
    let token = s && s.jwtToken && s.jwtToken.token;

    if (!token) {
      const challenge = s && s.otpSessionChallenge;
      if (!challenge) { console.log("\n[ECHEC] connexion :", JSON.stringify(s && s.errors)); rl.close(); return; }
      console.log("[3/3] 2FA requise...");
      const otp = (await ask("Code 2FA (app authenticator) : ")).trim();
      j = await gql({ otpSessionChallenge: challenge, otpAttempt: otp });
      s = j && j.data && j.data.signIn;
      token = s && s.jwtToken && s.jwtToken.token;
    }
    if (!token) { console.log("\n[ECHEC] pas de token :", JSON.stringify((s && s.errors) || j)); rl.close(); return; }

    const r = spawnSync("clip", { input: token });
    console.log("\n==================== RESULTAT ====================");
    if (r.status === 0) {
      console.log("[OK] Token copie dans le presse-papier.");
      console.log("Longueur du token : " + token.length + " caracteres.");
      console.log("=> Va dans Vercel, champ SORARE_JWT, et colle avec Ctrl+V. Ne tape rien d'autre.");
    } else {
      console.log("[ATTENTION] Copie automatique impossible sur ce PC. Previens Claude.");
    }
    console.log("=================================================");
    console.log("\nColle a Claude UNIQUEMENT la ligne [OK] avec la longueur (jamais le token).");
  } catch (e) {
    console.error("\n[ERREUR]", e.message || e);
  } finally { rl.close(); }
})();

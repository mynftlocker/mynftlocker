const readline = require("readline");
const bcrypt = require("bcryptjs");

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
    console.log("\n=== Sorare : generer un token ET le tester ===\n");
    const email = (await ask("Email Sorare    : ")).trim();
    const password = (await ask("Mot de passe    : ")).trim();

    console.log("\n[1/4] Salt...");
    const saltRes = await fetch(`https://api.sorare.com/api/v1/users/${encodeURIComponent(email)}`);
    if (!saltRes.ok) throw new Error("Email inconnu (HTTP " + saltRes.status + ")");
    const { salt } = await saltRes.json();
    if (!salt) throw new Error("Salt vide");

    console.log("[2/4] Connexion...");
    const hashed = bcrypt.hashSync(password, salt);
    let j = await gql({ email, password: hashed });
    let s = j && j.data && j.data.signIn;
    let token = s && s.jwtToken && s.jwtToken.token;

    if (!token) {
      const challenge = s && s.otpSessionChallenge;
      if (!challenge) { console.log("\n[ECHEC] connexion :", JSON.stringify(s && s.errors)); rl.close(); return; }
      console.log("[3/4] 2FA requise...");
      const otp = (await ask("Code 2FA (app authenticator) : ")).trim();
      j = await gql({ otpSessionChallenge: challenge, otpAttempt: otp });
      s = j && j.data && j.data.signIn;
      token = s && s.jwtToken && s.jwtToken.token;
    }
    if (!token) { console.log("\n[ECHEC] pas de token :", JSON.stringify((s && s.errors) || j)); rl.close(); return; }

    console.log("\n[OK] Token genere (expire :", s.jwtToken.expiredAt, ")");

    console.log("[4/4] Test du token contre Sorare (comme le fait le site)...");
    const testRes = await fetch(GQL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token, "JWT-AUD": AUD },
      body: JSON.stringify({ query: "{ currentUser { slug } }" })
    });
    const testJson = await testRes.json();
    const slug = testJson && testJson.data && testJson.data.currentUser && testJson.data.currentUser.slug;
    const err = testJson && testJson.errors && testJson.errors[0] && testJson.errors[0].message;

    console.log("\n==================== RESULTAT ====================");
    if (slug) {
      console.log("[TOKEN VALIDE] Sorare a accepte le token. Slug: " + slug);
      console.log("=> Le probleme est donc le stockage dans Vercel (copier-coller).");
      console.log("\n--- A recopier dans Vercel (ne colle PAS ces lignes a Claude) ---");
      console.log("SORARE_JWT =", token);
      console.log("SORARE_AUD =", AUD);
    } else {
      console.log("[TOKEN REFUSE] Sorare repond : " + (err || JSON.stringify(testJson)));
      console.log("=> Le probleme vient du token / compte / aud, PAS de Vercel.");
    }
    console.log("=================================================");
    console.log("\nColle a Claude UNIQUEMENT la ligne [TOKEN VALIDE] ou [TOKEN REFUSE].");
  } catch (e) {
    console.error("\n[ERREUR]", e.message || e);
  } finally { rl.close(); }
})();

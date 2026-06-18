const readline = require('readline');
const bcrypt = require('bcryptjs');
const AUD = 'mynftlocker';
const GQL = 'https://api.sorare.com/federation/graphql';
const MUTATION = `mutation SignInMutation($input: signInInput!) { signIn(input: $input) { currentUser { slug } jwtToken(aud: "${AUD}") { token expiredAt } otpSessionChallenge errors { message } } }`;
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((res) => rl.question(q, res));
const gql = (vars) => fetch(GQL, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ operationName:'SignInMutation', variables:{ input: vars }, query: MUTATION }) }).then(r=>r.json());

(async () => {
  try {
    console.log('\n=== Connexion Sorare -> JWT ===\n');
    const email    = (await ask('Email Sorare    : ')).trim();
    const password = (await ask('Mot de passe    : ')).trim();

    // Etape 1 : recuperer le salt
    console.log('\n[1/3] Salt...');
    const saltRes = await fetch(`https://api.sorare.com/api/v1/users/${encodeURIComponent(email)}`);
    if (!saltRes.ok) throw new Error(`Email inconnu (HTTP ${saltRes.status})`);
    const { salt } = await saltRes.json();
    if (!salt) throw new Error('Salt vide');

    // Etape 2 : premiere mutation (email + password hache)
    console.log('[2/3] Connexion...');
    const hashed = bcrypt.hashSync(password, salt);
    const j1 = await gql({ email, password: hashed });
    const s1 = j1?.data?.signIn;

    // Cas 1 : succes direct (sans 2FA)
    if (s1?.jwtToken?.token) {
      console.log('\n✅ JWT obtenu (expire :', s1.jwtToken.expiredAt, ')');
      console.log('\nSORARE_JWT =', s1.jwtToken.token);
      console.log('SORARE_AUD =', AUD);
      rl.close(); return;
    }

    // Cas 2 : 2FA requise -> otpSessionChallenge
    const challenge = s1?.otpSessionChallenge;
    if (!challenge) {
      console.log('\n❌ Echec etape 1 :', JSON.stringify(s1?.errors));
      rl.close(); return;
    }

    console.log('[3/3] 2FA requise...');
    const otp = (await ask('Code 2FA (app authenticator) : ')).trim();
    const j2 = await gql({ otpSessionChallenge: challenge, otpAttempt: otp });
    const s2 = j2?.data?.signIn;
    const token = s2?.jwtToken?.token;

    if (!token) {
      console.log('\n❌ Echec 2FA :', JSON.stringify(s2?.errors || j2));
      rl.close(); return;
    }

    console.log('\n✅ JWT obtenu ! (expire :', s2.jwtToken.expiredAt, ')');
    console.log('   Slug :', s2.currentUser?.slug);
    console.log('\n=== A AJOUTER DANS VERCEL > Environment Variables ===\n');
    console.log('SORARE_JWT =', token);
    console.log('SORARE_AUD =', AUD);
    console.log('\nCoche Production + Preview > Save > Redeploy.');
    console.log('⚠️  Token expire dans ~30 jours, relance ce script pour renouveler.');
  } catch(e) {
    console.error('\n❌', e.message || e);
  } finally { rl.close(); }
})();

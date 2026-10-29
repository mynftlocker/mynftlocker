// lib/email.ts
// Envoi d'email via l'API REST Resend (pas besoin du package npm resend)

const RESEND_API_URL = 'https://api.resend.com/emails';
const FROM_ADDRESS = 'myNFTlocker <no-reply@mynftlocker.com>';

export async function sendVerificationEmail(to: string, verifyUrl: string, lang: 'fr' | 'en' = 'fr') {
  const en = lang === 'en';
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY manquante');
  }

  const res = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_ADDRESS,
      to: [to],
      subject: en ? 'Confirm your myNFTlocker account' : 'Confirme ton compte myNFTlocker',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
          <h2 style="color:#111;">${en ? 'Welcome to myNFTlocker' : 'Bienvenue sur myNFTlocker'}</h2>
          <p>${en ? 'Click the button below to confirm your email address and activate your account.' : 'Clique sur le bouton ci-dessous pour confirmer ton adresse email et activer ton compte.'}</p>
          <p style="text-align:center;margin:32px 0;">
            <a href="${verifyUrl}" style="background:#40e8ff;color:#111;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">
              ${en ? 'Confirm my account' : 'Confirmer mon compte'}
            </a>
          </p>
          <p style="color:#666;font-size:13px;">${en ? 'This link expires in 24 hours. If you did not sign up, just ignore this email.' : "Ce lien expire dans 24 heures. Si tu n'es pas à l'origine de cette inscription, ignore cet email."}</p>
        </div>
      `,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error('Echec envoi email Resend: ' + errText);
  }

  return res.json();
}

// ===== Changement d'adresse e-mail =====
async function sendMail(to: string, subject: string, html: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('RESEND_API_KEY manquante');
  const res = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM_ADDRESS, to: [to], subject, html }),
  });
  if (!res.ok) throw new Error('Echec envoi email Resend: ' + (await res.text()));
}

// Lien de confirmation envoye a la NOUVELLE adresse
export async function sendEmailChangeConfirm(to: string, url: string, lang: 'fr' | 'en' = 'fr') {
  const en = lang === 'en';
  await sendMail(to, en ? 'Confirm your new email address' : 'Confirme ta nouvelle adresse e-mail', `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
      <h2 style="color:#111;">${en ? 'New email address' : 'Nouvelle adresse e-mail'}</h2>
      <p>${en ? 'Click the button below to use this address for your myNFTlocker account.' : 'Clique sur le bouton ci-dessous pour utiliser cette adresse sur ton compte myNFTlocker.'}</p>
      <p style="text-align:center;margin:32px 0;"><a href="${url}" style="background:#40e8ff;color:#111;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">${en ? 'Confirm this address' : 'Confirmer cette adresse'}</a></p>
      <p style="color:#666;font-size:13px;">${en ? 'This link expires in 24 hours. If you did not ask for this, ignore this email: nothing will change.' : "Ce lien expire dans 24 heures. Si tu n'es pas à l'origine de cette demande, ignore cet e-mail : rien ne changera."}</p>
    </div>`);
}

// Alerte envoyee a l'ANCIENNE adresse
export async function sendEmailChangeAlert(to: string, newEmail: string, lang: 'fr' | 'en' = 'fr') {
  const en = lang === 'en';
  await sendMail(to, en ? 'Email change requested on your account' : 'Changement d’adresse e-mail demandé sur ton compte', `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
      <h2 style="color:#111;">${en ? 'Email change requested' : 'Changement d’adresse e-mail demandé'}</h2>
      <p>${en ? `A request was made to replace this address with <b>${newEmail}</b> on your myNFTlocker account. Nothing changes until the new address is confirmed.` : `Une demande a été faite pour remplacer cette adresse par <b>${newEmail}</b> sur ton compte myNFTlocker. Rien ne change tant que la nouvelle adresse n’est pas confirmée.`}</p>
      <p style="color:#666;font-size:13px;">${en ? 'If this was not you, change your password right away.' : "Si ce n'est pas toi, change ton mot de passe immédiatement."}</p>
    </div>`);
}

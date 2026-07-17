// lib/email.ts
// Envoi d'email via l'API REST Resend (pas besoin du package npm resend)

const RESEND_API_URL = 'https://api.resend.com/emails';
const FROM_ADDRESS = 'myNFTlocker <onboarding@resend.dev>'; // TODO: remplacer par une adresse sur votre domaine une fois celui-ci créé et vérifié dans Resend

export async function sendVerificationEmail(to: string, verifyUrl: string) {
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
      subject: 'Confirme ton compte myNFTlocker',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
          <h2 style="color:#111;">Bienvenue sur myNFTlocker</h2>
          <p>Clique sur le bouton ci-dessous pour confirmer ton adresse email et activer ton compte.</p>
          <p style="text-align:center;margin:32px 0;">
            <a href="${verifyUrl}" style="background:#40e8ff;color:#111;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">
              Confirmer mon compte
            </a>
          </p>
          <p style="color:#666;font-size:13px;">Ce lien expire dans 24 heures. Si tu n'es pas à l'origine de cette inscription, ignore cet email.</p>
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

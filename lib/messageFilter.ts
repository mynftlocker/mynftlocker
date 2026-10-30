// lib/messageFilter.ts
// Filtre GRATUIT des messages entre managers (aucune IA, aucun cout) :
//  - interdit les liens, e-mails, numeros de telephone, adresses de portefeuille ;
//  - interdit de proposer un paiement ou un echange hors de la plateforme NFT (PayPal, virement, WhatsApp, Discord...) ;
//  - interdit insultes et menaces.
// Les textes sont normalises (minuscules, sans accents, separateurs retires) pour attraper les contournements simples ("p a y p a l", "paypal", "p@ypal").
// Ce n'est PAS une garantie : il complete le signalement et le blocage, il ne les remplace pas.

export type FilterCode = 'empty' | 'long' | 'link' | 'contact' | 'payment' | 'platform' | 'insult' | 'threat';

export const MAX_LEN = 500;

const strip = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const unleet = (s: string) => s.replace(/0/g, 'o').replace(/[1!|]/g, 'i').replace(/3/g, 'e').replace(/[4@]/g, 'a').replace(/[5$]/g, 's').replace(/7/g, 't');
const squash = (s: string) => s.replace(/[^a-z0-9]/g, '');

const TLD = 'com|fr|net|org|io|me|gg|ly|co|eu|app|xyz|link|to|be|ch|de|uk|us|tv|info|biz|shop|store|online|site|cc|gl|sh|im';
const RE_LINK = new RegExp('(https?\\s*:|www\\s*\\.|\\b[a-z0-9-]{2,}\\s*\\.\\s*(' + TLD + ')\\b|\\b(dot|point)\\s+(com|fr|net|org|io)\\b)');
const RE_EMAIL = /@|\barobase\b|\b\w+\s+(at)\s+\w+\s+(dot|point)\s+\w+/;
const RE_PHONE = /(?:\d[\s.\-()]*){8,}/;
const RE_WALLET = /\b0x[a-f0-9]{16,}\b|\b[a-z0-9]{28,}\b/;

// Mots (collables par "squash") : paiement hors plateforme
const PAYMENT_LONG = ['paypal', 'revolut', 'lydia', 'westernunion', 'moneygram', 'cashapp', 'venmo', 'zelle', 'virement', 'banktransfer', 'wiretransfer', 'bitcoin', 'ethereum', 'metamask', 'paysafecard', 'cartecadeau', 'giftcard', 'amazoncard'];
// Mots courts : seulement en mot entier (sinon trop de faux positifs)
const PAYMENT_SHORT = /\b(iban|rib|btc|eth|usdt|wero|pcs)\b/;
// Autres plateformes / messageries : l'echange se fait sur Sorare uniquement
const PLATFORM_LONG = ['whatsapp', 'telegram', 'discord', 'snapchat', 'instagram', 'facebook', 'messenger', 'skype', 'viber', 'wechat', 'leboncoin', 'vinted', 'ebay', 'opensea', 'magiceden', 'whatnot', 'cardmarket', 'twitter'];
const PLATFORM_SHORT = /\b(snap|insta|fb|dm|mp|wa|tg|x\.com|signal)\b/;
const RE_OFFPLATFORM = /(hors|en\s+dehors)\s+(de\s+)?(sorare|la\s+plateforme|plateforme|site)|\boff\s*-?\s*(sorare|platform|site)|\boutside\s+(of\s+)?(sorare|the\s+platform)|\bsans\s+passer\s+par\s+(sorare|la\s+plateforme)|\bwithout\s+(going\s+)?through\s+sorare|\ben\s+main\s+propre\b/;

const INSULT_LONG = ['connard', 'connasse', 'salope', 'enculer', 'enculé', 'enculez', 'batard', 'merdeux', 'debile', 'abruti', 'cretin', 'bouffon', 'pourriture', 'nigger', 'nigga', 'bougnoule', 'youpin', 'faggot', 'bitch', 'asshole', 'motherfucker', 'cunt', 'dickhead', 'fuckyou', 'fuckoff', 'shithead', 'idiot', 'tagueule', 'fermetagueule', 'vatefairefoutre', 'vatefaire'];
const INSULT_SHORT = /\b(pd|pede|tg|pute|putes|putain|fdp|ntm|moron|ordure|degenere|gros\s+naze|naze|nul\s+a\s+chier|conne|kys|retarded|scum)\b/;
const THREAT = [/\bje\s+vais\s+te\s+(tuer|frapper|retrouver|casser|detruire|pourrir|faire\s+la\s+peau)/, /\bje\s+(te\s+retrouve|sais\s+ou\s+tu\s+(habites|vis|travailles))/, /\bi\s+(will|am\s+going\s+to|'ll)\s+(kill|hurt|find|destroy)\s+you/, /\bi\s+know\s+where\s+you\s+(live|work)/, /\b(tu\s+vas\s+le\s+regretter|tu\s+vas\s+payer|you\s+will\s+regret|you('ll|\s+will)\s+pay\s+for)/, /\bkill\s+yourself|\bsuicide\s*-?\s*toi/, /\bje\s+vais\s+(porter\s+plainte|te\s+denoncer|te\s+signaler\s+partout)\s+si\b/];

export function checkMessage(raw: string): { ok: true; text: string } | { ok: false; code: FilterCode } {
  const text = String(raw || '').replace(/\s+/g, ' ').trim();
  if (!text) return { ok: false, code: 'empty' };
  if (text.length > MAX_LEN) return { ok: false, code: 'long' };
  const low = strip(text);
  const sq = squash(unleet(low));
  if (RE_LINK.test(low)) return { ok: false, code: 'link' };
  if (RE_EMAIL.test(low)) return { ok: false, code: 'contact' };
  if (RE_PHONE.test(low) || RE_WALLET.test(low)) return { ok: false, code: 'contact' };
  if (PAYMENT_LONG.some(w => sq.includes(w)) || PAYMENT_SHORT.test(low)) return { ok: false, code: 'payment' };
  if (PLATFORM_LONG.some(w => sq.includes(w)) || PLATFORM_SHORT.test(low) || RE_OFFPLATFORM.test(low)) return { ok: false, code: 'platform' };
  if (THREAT.some(r => r.test(low))) return { ok: false, code: 'threat' };
  if (INSULT_LONG.some(w => sq.includes(strip(w))) || INSULT_SHORT.test(low)) return { ok: false, code: 'insult' };
  return { ok: true, text };
}

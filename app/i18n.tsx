'use client';
// Internationalisation minimale : le texte FRANCAIS sert de cle. t('Texte FR') renvoie le texte EN si la langue est 'en',
// sinon le texte FR inchange (=> zero regression en francais).
import { useSyncExternalStore } from 'react';

export type Lang = 'fr' | 'en';
let _lang: Lang = 'fr';
const subs = new Set<() => void>();
const notify = () => subs.forEach(f => f());
const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };

// A appeler une fois au montage cote client : langue sauvegardee, sinon langue du navigateur (non francais => anglais)
export function initLang() {
  try {
    const s = localStorage.getItem('mnfl_lang');
    let next: Lang = 'fr';
    if (s === 'fr' || s === 'en') next = s;
    else if (navigator.language && !navigator.language.toLowerCase().startsWith('fr')) next = 'en';
    if (next !== _lang) { _lang = next; notify(); }
  } catch (e) {}
}
export function getLang(): Lang { return _lang; }
export function setLang(l: Lang) {
  _lang = l;
  try { localStorage.setItem('mnfl_lang', l); } catch (e) {}
  try { document.documentElement.lang = l; } catch (e) {}
  notify();
}
// Hook : fait re-rendre le composant quand la langue change. Serveur = toujours 'fr' (pas de decalage d'hydratation).
export function useLang(): Lang {
  return useSyncExternalStore(subscribe, () => _lang, () => 'fr' as Lang);
}

const EN: Record<string, string> = {
  // --- Navigation / filtres ---
  'Vestiaire': 'Locker room', 'Galerie': 'Gallery', 'Joueur': 'Player', 'Équipe': 'Team', 'Saison': 'Season',
  'Rareté': 'Scarcity', 'Set Arcade uniquement': 'Arcade set only', 'Retour à la galerie': 'Back to gallery', 'CRÉER UN COMPTE': 'CREATE ACCOUNT', 'Managers favoris': 'Favorite managers', 'Ajouter': 'Add', 'Retirer': 'Remove', 'Aucun favori pour l’instant': 'No favorites yet', 'Pourquoi créer un compte ?': 'Why create an account?', 'Ton Hall of Fame et ton 5 majeur gardés en mémoire': 'Your Hall of Fame and starting five, remembered', 'Ton équipe par défaut : le vestiaire s’ouvre où tu veux': 'Your default team: the locker room opens where you want', 'Tes managers favoris : leurs galeries en un clic': 'Your favorite managers: their galleries in one click', 'Tes réglages (Arcade, Gameplay) retrouvés sur tous tes appareils': 'Your settings (Arcade, Gameplay) on all your devices', 'Retour au vestiaire': 'Back to locker room', 'Aucune carte Arcade pour ce sport': 'No Arcade cards for this sport', 'Outils de composition': 'Lineup tools', 'Compétition': 'Competition', 'Disponibilité': 'Availability', 'Toutes': 'All', 'Tous': 'All', 'Sans blessure': 'Healthy', 'Blessés': 'Injured', 'Note en étoiles': 'Star Rating', 'Score prévu': 'Projected Score', 'Projection vs L10': 'Gain on Projection', 'ÉCART': 'GAIN', 'Proj. / ★': 'Proj. / ★', 'Édition de la carte': 'Card edition', 'Tri': 'Sort', 'Alphabétique': 'Alphabetical',
  'Défaut': 'Default', 'Étoiles': 'Stars', '↓ Décroissant': '↓ Descending', '↑ Croissant': '↑ Ascending',
  '↺ Réinitialiser les filtres': '↺ Reset filters', '⭐ Par défaut :': '⭐ Default:',
  '⭐ Définir comme équipe par défaut': '⭐ Set as default team', 'Filtres': 'Filters', 'FILTRES': 'FILTERS',
  'Voir les résultats': 'See results', 'VOIR LA GALERIE COMPLÈTE': 'VIEW FULL GALLERY', 'Fermer': 'Close', 'FERMER': 'CLOSE',
  'Rechercher...': 'Search...',
  'Toutes les saisons': 'All seasons', 'Toutes les raretés': 'All scarcities', 'Toutes les cartes': 'All cards',
  'Standard uniquement': 'Standard only', 'Spéciales uniquement': 'Special only',
  'Tous les championnats': 'All leagues', 'Toutes les ligues': 'All leagues',
  'cartes': 'cards', 'Aucune carte': 'No cards', 'Taille': 'Size',
  // --- Compte ---
  'Mon compte': 'My account', 'Changer de galerie consultée': 'Switch viewed gallery', 'Valider': 'Confirm',
  'Confidentialité & données': 'Privacy & data', 'Se déconnecter': 'Sign out', "Retour à l'accueil": 'Back to home',
  'Adresse email': 'Email address', 'Mot de passe': 'Password', 'Pseudo': 'Username', 'Slug Sorare': 'Sorare slug',
  'La modification de ces informations arrive prochainement.': 'Editing this information is coming soon.',
  "Tu n'es pas connecté à un compte myNFTlocker.": "You're not signed in to a myNFTlocker account.",
  'Bientot disponible': 'Coming soon',
  'Tu pourras bientot connecter ton compte Sorare officiel ici.': 'You will soon be able to connect your official Sorare account here.',
  'Les formules d’abonnement seront proposees ici le moment venu.': 'Subscription plans will be offered here when the time comes.',
  'Gestion de tes données et suppression de compte à venir.': 'Data management and account deletion coming soon.',
  'Un espace d’aide et de contact arrive prochainement.': 'A help and contact space is coming soon.',
  // --- Connexion / inscription ---
  'Connexion': 'Log in', 'Creer un compte': 'Create account', 'CREER UN COMPTE': 'CREATE ACCOUNT', 'SE CONNECTER': 'LOG IN',
  'Se connecter': 'Log in', "S'inscrire": 'Sign up', 'Inscriptions bientôt ouvertes': 'Sign-ups open soon',
  'Slug Sorare (ex: pseudo-email-com)': 'Sorare slug (e.g. username-email-com)', 'Confirmer le mot de passe': 'Confirm password',
  'Compte créé ! Vérifie ta boîte mail (et les spams) pour confirmer ton adresse avant de te connecter.': 'Account created! Check your inbox (and spam) to confirm your address before logging in.',
  'Deja un compte ? ': 'Already have an account? ', 'Pas encore de compte ? ': 'No account yet? ',
  '10 caractères minimum, avec au moins une lettre et un chiffre.': '10 characters minimum, with at least one letter and one digit.',
  'Les mots de passe ne correspondent pas.': 'Passwords do not match.', 'Cet email est déjà utilisé.': 'This email is already in use.',
  'Email ou mot de passe incorrect.': 'Incorrect email or password.',
  'Mot de passe : 10 caractères minimum, avec au moins une lettre et un chiffre.': 'Password: 10 characters minimum, with at least one letter and one digit.',
  'Le slug Sorare est obligatoire.': 'The Sorare slug is required.', 'Une erreur est survenue.': 'Something went wrong.',
  'Connexion au serveur impossible.': 'Cannot reach the server.', 'Joueur introuvable': 'Player not found', 'Erreur réseau': 'Network error',
  // --- Ecran d'accueil ---
  'ENTRE TON SLUG SORARE POUR COMMENCER': 'ENTER YOUR SORARE SLUG TO START', 'ton-slug-sorare': 'your-sorare-slug',
  'CHARGEMENT...': 'LOADING...', 'DONNÉES CHARGÉES': 'DATA LOADED', 'SCAN EN COURS...': 'SCANNING...', 'INITIALISATION...': 'INITIALIZING...',
  // --- Pays (foot) ---
  'Sélection nationale': 'National team', 'Autres pays': 'Other countries', 'Belgique': 'Belgium', 'Allemagne': 'Germany',
  'Espagne': 'Spain', 'Angleterre': 'England', 'Ecosse': 'Scotland', 'Pays de Galles': 'Wales', 'Irlande du Nord': 'Northern Ireland',
  'Italie': 'Italy', 'Pays-Bas': 'Netherlands', 'Turquie': 'Turkey', 'Russie': 'Russia', 'Pologne': 'Poland', 'Autriche': 'Austria',
  'Suisse': 'Switzerland', 'Suede': 'Sweden', 'Norvege': 'Norway', 'Grece': 'Greece', 'Roumanie': 'Romania', 'Croatie': 'Croatia',
  'Hongrie': 'Hungary', 'Republique Tcheque': 'Czech Republic', 'Slovaquie': 'Slovakia', 'Bulgarie': 'Bulgaria', 'Etats-Unis': 'United States',
  'Mexique': 'Mexico', 'Bresil': 'Brazil', 'Perou': 'Peru', 'Equateur': 'Ecuador', 'Bolivie': 'Bolivia', 'Japon': 'Japan',
  'Coree du Sud': 'South Korea', 'Chine': 'China', 'Australie': 'Australia', 'Arabie Saoudite': 'Saudi Arabia',
  'Emirats Arabes Unis': 'United Arab Emirates', 'Maroc': 'Morocco', 'Egypte': 'Egypt', 'Afrique du Sud': 'South Africa',
  'Cote d Ivoire': 'Ivory Coast', 'Tunisie': 'Tunisia', 'Danemark': 'Denmark', 'Chili': 'Chile', 'Colombie': 'Colombia', 'Cameroun': 'Cameroon',
  'International': 'International',
  // --- ajouts ---
  'Manuel': 'Manual',
  'Nom': 'Name',
  '▶ OUVRIR': '▶ OPEN',
  '⭐ Par défaut : ': '⭐ Default: ',
  'Informations personnelles': 'Personal information',
  'Authentification': 'Authentication',
  'Abonnement': 'Subscription',
  'Aide / Contact': 'Help / Contact',
  // --- etape 2 ---
  'offre': 'offer', 'enchère': 'auction', 'achat': 'purchase', 'achat direct': 'buy now', 'parrainage': 'referral', 'récompense': 'reward', 'dépôt': 'deposit', 'retrait': 'withdrawal',
  'CGU': 'TERMS',
  'MOYENNE L10': 'L10 AVERAGE',
  'MOY. L10': 'AVG L10',
  'CARTE': 'CARD',
  'ÉQUIPE': 'TEAM',
  'SÉRIE': 'SERIAL',
  'SAISON': 'SEASON',
  'ÉDITION': 'EDITION',
  'ACHAT': 'PURCHASE',
  'Prix d’achat': 'Purchase price',
  'Acquise le': 'Acquired on',
  'Dernier détenteur': 'Last holder',
  '— (1ʳᵉ main)': '— (1st hand)',
  'Moyenne des 5 dernières ventes': 'Average of last 5 sales',
  'a battu son L10 sur': 'beat their L10 in',
  'de ses matchs': 'of their games',
  ' · record ': ' · best ',
  'GW au-dessus du L10': 'GW above L10',
  '(compteur Sorare': '(Sorare counter',
  'NBA · 10 derniers matchs': 'NBA · last 10 games',
  'FOOT · 15 derniers matchs': 'FOOT · last 15 games',
  'MJ': 'GP',
  'alignée L10 · source Sorare': 'L10 window · source Sorare',
  'stats non disponibles': 'stats unavailable',
  'Image téléchargée': 'Image downloaded',
  'Image copiée': 'Image copied',
  'Copie impossible': 'Copy failed',
  'Partage impossible': 'Sharing failed',
  'Préparation de l’image…': 'Preparing image…',
  'Image indisponible': 'Image unavailable',
  'PARTAGER LA CARTE': 'SHARE THE CARD',
  'PARTAGER': 'SHARE',
  'TÉLÉCHARGER': 'DOWNLOAD',
  'COPIER': 'COPY',
  'joueurs': 'players',
  'joueur': 'player',
  'Titulaire du 5 majeur': 'Starting five',
  'Retourner la carte': 'Flip the card',
  'Buts': 'Goals',
  'Passes décisives': 'Assists',
  'Tirs cadrés': 'Shots on target',
  'Passes réussies': 'Completed passes',
  'Matchs joués': 'Games played',
  'Titularisations': 'Starts',
  'Duels gagnés': 'Duels won',
  'Ballons récupérés': 'Recoveries',
  'Cartons jaunes': 'Yellow cards',
  'Cartons rouges': 'Red cards',
  'Minutes jouées': 'Minutes played',
  // --- etape 2 ---
  ' — voir la carte : ': ' — see the card: ',
};
export function t(fr: string): string {
  return _lang === 'en' ? (EN[fr] ?? fr) : fr;
}
export function addEn(extra: Record<string, string>) { Object.assign(EN, extra); }

// Petit selecteur FR | EN
export function LangSwitch({ style }: { style?: React.CSSProperties }) {
  const lang = useLang();
  const b = (l: Lang): React.CSSProperties => ({
    cursor: 'pointer', background: 'transparent', border: 'none', padding: '0 0.25rem',
    fontFamily: 'Courier New,monospace', fontSize: '0.6rem', letterSpacing: '0.14em',
    color: lang === l ? '#40e8ff' : 'rgba(207,228,251,0.4)', fontWeight: lang === l ? 700 : 400,
    borderBottom: lang === l ? '1px solid rgba(64,232,255,0.6)' : '1px solid transparent',
  });
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', ...style }}>
      <button type='button' onClick={() => setLang('fr')} style={b('fr')}>FR</button>
      <span style={{ color: 'rgba(207,228,251,0.25)', fontSize: '0.55rem' }}>|</span>
      <button type='button' onClick={() => setLang('en')} style={b('en')}>EN</button>
    </span>
  );
}

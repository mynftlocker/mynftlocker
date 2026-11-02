// Calendrier de l'Avent : regles de temps communes (client et serveur, aucune dependance serveur).
// La case N s'ouvre le N decembre a 9 h (heure de Paris), ce qui laisse le temps aux box scores de la nuit NBA d'etre tous publies.
export const ADVENT_YEAR = 2026;
export const OPEN_HOUR = 9;
export const parisNow = () => new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
// Nombre de cases ouvertes maintenant (0 avant le lancement, 24 apres Noel)
export function openDayNow(): number {
  const p = new Date(parisNow().getTime() - OPEN_HOUR * 3600e3); // avant 9 h on est encore "la veille"
  if (p.getFullYear() > ADVENT_YEAR) return 24;
  if (p.getFullYear() < ADVENT_YEAR || p.getMonth() < 11) return 0;
  return Math.min(24, p.getDate());
}
// Moment d'ouverture de la premiere case (heure de Paris exprimee en "heure locale Paris" comme parisNow)
export const launchMoment = () => new Date(ADVENT_YEAR, 11, 1, OPEN_HOUR, 0, 0);

// Code couleur des scores Sorare NBA (releve sur les cartes du jeu) : <5 rouge, 5-14 orange, 15-24 jaune, 25-34 vert-jaune, 35-49 vert, 50-74 cyan, 75+ nacre holographique
export const tier = (s: number) => (s >= 75 ? '#dfe6ff' : s >= 50 ? '#00f3eb' : s >= 35 ? '#25ed36' : s >= 25 ? '#b6ff1a' : s >= 15 ? '#f0ce1d' : s >= 5 ? '#ff7e34' : '#ff5a5a');
export const PEARL = 'linear-gradient(135deg,#ffffff,#bfd4ff 30%,#ffd1f0 55%,#c6fff0 80%,#ffffff)';
export const tierBg = (s: number) => (s >= 75 ? PEARL : tier(s));

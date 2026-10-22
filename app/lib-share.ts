// Manager (proprietaire de la galerie consultee) : pseudo Sorare + slug, utilises par l'image de partage (signature + QR code + lien).
let _manager='';
let _slug='';
export const setManager=(n:string,s?:string)=>{_manager=String(n||'').trim();if(s!==undefined)_slug=String(s||'').trim().toLowerCase();};
export const getManager=()=>_manager;
export const getManagerSlug=()=>_slug;
// Lien direct vers la galerie du manager sur myNFTlocker ('' si inconnu)
export const galleryLink=()=>_slug?((typeof window!=='undefined'?window.location.origin:'https://mynftlocker.com')+'/?u='+encodeURIComponent(_slug)):'';
// Lien direct vers UNE carte : galerie du manager + ?c=<slug carte> (ouvre la carte immediatement)
export const cardLink=(cardSlug:string)=>{const g=galleryLink();return g&&cardSlug?g+'&c='+encodeURIComponent(cardSlug):g;};

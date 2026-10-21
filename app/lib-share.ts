// Nom du manager (pseudo Sorare du proprietaire de la galerie consultee) : utilise pour la signature de l'image de partage.
let _manager='';
export const setManager=(n:string)=>{_manager=String(n||'').trim();};
export const getManager=()=>_manager;

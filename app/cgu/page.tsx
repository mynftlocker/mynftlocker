"use client";
import { useEffect } from 'react';
import { useLang, initLang, LangSwitch } from '../i18n';

// Conditions generales d'utilisation + mentions legales + confidentialite.
// Pour afficher la section "Editeur", renseigner EDITOR.name (les autres champs vides sont simplement omis).
const EDITOR={ name:'', status:'', address:'', publisher:'', email:'mynftlocker@gmail.com', x:'@myNFTlocker' };
const UPDATED='27/10/2026';

type Sec={h:string;p:string[]};
const FR:Sec[]=[
  {h:'1. Objet',p:['myNFTlocker est un outil gratuit de consultation et de présentation de cartes de jeux de sport numériques : galerie, vestiaire, statistiques, tris et filtres, partage d’images.','Il ne permet ni d’acheter, ni de vendre, ni d’échanger des cartes, et ne gère aucun paiement.','En utilisant le site ou en créant un compte, tu acceptes les présentes conditions.']},
  {h:'2. Indépendance',p:['myNFTlocker est un projet indépendant. Il n’est ni affilié à Sorare, ni approuvé, ni sponsorisé par Sorare.','Sorare, les noms de joueurs, de clubs, de ligues, les visuels de cartes et les marques cités appartiennent à leurs propriétaires respectifs. Ils sont affichés uniquement pour permettre à chacun de consulter sa propre collection.']},
  {h:'3. Les données affichées',p:['Les cartes et statistiques proviennent de l’API publique de Sorare, en direct. Elles peuvent être incomplètes, retardées ou erronées à la source. Certaines valeurs (par exemple la projection, l’écart ou le record d’une carte) sont des informations fournies par Sorare ou recalculées à partir d’elles.','Les outils de composition (mode Gameplay) sont une aide à la lecture : ils ne garantissent aucun résultat, ne constituent ni un conseil de jeu ni un conseil financier ou d’investissement.']},
  {h:'4. Compte',p:['La création d’un compte est facultative. Elle sert à retrouver tes préférences : Hall of Fame, 5 majeur, équipe par défaut, managers favoris, modes d’affichage.','Tu dois avoir au moins 18 ans. Les informations données à l’inscription doivent être exactes. Tu es responsable de la confidentialité de ton mot de passe et de l’usage de ton compte.','Tu peux changer ton mot de passe et supprimer ton compte à tout moment depuis « Mon compte ». La suppression est définitive.']},
  {h:'5. Usage acceptable',p:['Tu t’engages à ne pas perturber le service (requêtes automatisées abusives, tentative d’accès non autorisé, contournement des protections), à ne pas usurper l’identité d’autrui et à ne pas utiliser le site de manière illégale.','Nous pouvons suspendre ou supprimer un compte en cas d’abus.']},
  {h:'6. Propriété intellectuelle',p:['Le design du site, son code, ses textes et ses éléments graphiques propres (logo, lettrage, mises en page de la galerie et du vestiaire) sont protégés. Toute reproduction non autorisée est interdite.','Les images que tu partages à partir du site restent soumises aux droits des propriétaires des cartes et des marques affichées.']},
  {h:'7. Données personnelles',p:['Données conservées : pseudo, adresse e-mail, slug Sorare, mot de passe chiffré, date de création du compte, et tes préférences (Hall of Fame, 5 majeur, équipe par défaut, managers favoris, modes d’affichage).','Finalités : faire fonctionner ton compte, te permettre de te connecter, envoyer l’e-mail de confirmation et retrouver tes préférences. Base légale : l’exécution du service que tu demandes en créant un compte.','Durée : tant que ton compte existe. Quand tu le supprimes, ces données sont effacées.','Tes cartes ne sont pas stockées sur nos serveurs : elles sont lues en direct depuis l’API publique de Sorare. Un cache de tes cartes est gardé dans ton navigateur uniquement (tu peux le vider dans « Confidentialité & données »).','Prestataires techniques : Vercel (hébergement du site), Upstash (base de données des comptes) et Resend (envoi de l’e-mail de confirmation). Certains peuvent traiter des données hors de l’Union européenne, dans le cadre de garanties appropriées.','Aucune donnée n’est vendue ni cédée à des fins publicitaires. Le site n’utilise pas de cookie publicitaire ni d’outil de mesure d’audience tiers.','Tes droits : accès, rectification, effacement, limitation, opposition et portabilité. Tu peux supprimer ton compte toi-même, ou nous écrire pour exercer tes droits. Tu peux aussi saisir la CNIL (cnil.fr).']},
  {h:'8. Cookies et stockage local',p:['Un cookie technique de session (« mnfl_session ») te garde connecté. Il est indispensable au fonctionnement du compte.','Ton navigateur conserve aussi des préférences d’affichage et un cache de cartes (stockage local). Ils ne servent qu’au fonctionnement du site.']},
  {h:'9. Disponibilité et responsabilité',p:['Le service est fourni « en l’état », sans garantie de disponibilité ni d’exactitude des données. Nous ne sommes pas responsables des décisions prises à partir des informations affichées, ni d’une interruption du service ou de l’API de Sorare.','Nous pouvons modifier, suspendre ou arrêter tout ou partie du service.']},
  {h:'10. Évolution des conditions',p:['Ces conditions peuvent évoluer. La version en vigueur est celle publiée sur cette page, avec sa date de mise à jour.']},
  {h:'11. Droit applicable',p:['Les présentes conditions sont soumises au droit français. En cas de litige, une solution amiable sera recherchée avant toute action.']},
];
const EN:Sec[]=[
  {h:'1. Purpose',p:['myNFTlocker is a free tool to browse and showcase digital sports cards: gallery, locker room, stats, sorting and filters, image sharing.','It does not let you buy, sell or trade cards, and does not handle any payment.','By using the site or creating an account, you accept these terms.']},
  {h:'2. Independence',p:['myNFTlocker is an independent project. It is not affiliated with, endorsed or sponsored by Sorare.','Sorare, player, club and league names, card visuals and trademarks mentioned belong to their respective owners. They are displayed only so that everyone can browse their own collection.']},
  {h:'3. Displayed data',p:['Cards and stats come live from Sorare’s public API. They may be incomplete, delayed or wrong at the source. Some values (for example a card’s projection, gap or record) are provided by Sorare or recomputed from its data.','Lineup tools (Gameplay mode) are a reading aid: they guarantee no result and are neither gameplay advice nor financial or investment advice.']},
  {h:'4. Account',p:['Creating an account is optional. It lets you keep your preferences: Hall of Fame, starting five, default team, favorite managers, display modes.','You must be at least 18 years old. Information given at sign-up must be accurate. You are responsible for keeping your password confidential and for how your account is used.','You can change your password and delete your account at any time from “My account”. Deletion is permanent.']},
  {h:'5. Acceptable use',p:['You agree not to disrupt the service (abusive automated requests, unauthorized access attempts, bypassing protections), not to impersonate others and not to use the site unlawfully.','We may suspend or delete an account in case of abuse.']},
  {h:'6. Intellectual property',p:['The site’s design, code, texts and own graphic elements (logo, lettering, gallery and locker room layouts) are protected. Any unauthorized reproduction is prohibited.','Images you share from the site remain subject to the rights of the owners of the cards and trademarks displayed.']},
  {h:'7. Personal data',p:['Data kept: username, email address, Sorare slug, encrypted password, account creation date, and your preferences (Hall of Fame, starting five, default team, favorite managers, display modes).','Purposes: running your account, letting you sign in, sending the confirmation email and restoring your preferences. Legal basis: performing the service you request by creating an account.','Retention: as long as your account exists. When you delete it, this data is erased.','Your cards are not stored on our servers: they are read live from Sorare’s public API. A cache of your cards is kept in your browser only (you can clear it in “Privacy & data”).','Technical providers: Vercel (site hosting), Upstash (account database) and Resend (confirmation email). Some may process data outside the European Union, under appropriate safeguards.','No data is sold or shared for advertising. The site uses no advertising cookies and no third-party analytics.','Your rights: access, rectification, erasure, restriction, objection and portability. You can delete your account yourself, or write to us to exercise your rights. You may also lodge a complaint with the CNIL (cnil.fr).']},
  {h:'8. Cookies and local storage',p:['A technical session cookie (“mnfl_session”) keeps you signed in. It is essential for the account to work.','Your browser also keeps display preferences and a card cache (local storage). They are only used to run the site.']},
  {h:'9. Availability and liability',p:['The service is provided “as is”, with no guarantee of availability or data accuracy. We are not responsible for decisions made from the information displayed, nor for an interruption of the service or of Sorare’s API.','We may change, suspend or stop all or part of the service.']},
  {h:'10. Changes to these terms',p:['These terms may change. The version in force is the one published on this page, with its update date.']},
  {h:'11. Governing law',p:['These terms are governed by French law. In case of dispute, an amicable solution will be sought before any action.']},
];

export default function Terms(){
  const lang=useLang();
  useEffect(()=>{initLang();},[]);
  const en=lang==='en';
  const items=en?EN:FR;
  const h2:React.CSSProperties={margin:'0 0 0.35rem',fontSize:'0.78rem',fontWeight:800,letterSpacing:'0.12em',textTransform:'uppercase',color:'#40e8ff'};
  const p:React.CSSProperties={margin:'0 0 0.5rem',fontSize:'0.88rem',lineHeight:1.7,color:'#b9c7d9'};
  return(
    <main style={{minHeight:'100vh',background:'radial-gradient(ellipse 120% 90% at 50% -10%,#0d111a 0%,#080b10 55%,#040507 100%)',color:'#cfe4fb',padding:'2.5rem 1.2rem'}}>
      <div style={{maxWidth:'720px',margin:'0 auto'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:'1px solid rgba(111,195,232,0.25)',paddingBottom:'1rem',marginBottom:'0.6rem'}}>
          <h1 style={{margin:0,fontSize:'1.35rem',fontWeight:800,color:'#eaf2ff'}}>{en?'Terms of use & legal notice':'Conditions d’utilisation & mentions légales'}</h1>
          <LangSwitch/>
        </div>
        <p style={{...p,fontSize:'0.74rem',color:'#7a8898',marginBottom:'1.6rem'}}>{(en?'Last updated: ':'Dernière mise à jour : ')+UPDATED}</p>
        {EDITOR.name&&(
          <section style={{marginBottom:'1.4rem'}}>
            <h2 style={h2}>{en?'Publisher':'Éditeur du site'}</h2>
            <p style={p}>{EDITOR.name}{EDITOR.status?' — '+EDITOR.status:''}{EDITOR.address?' — '+EDITOR.address:''}</p>
            {EDITOR.publisher&&<p style={p}>{(en?'Publication director: ':'Directeur de la publication : ')+EDITOR.publisher}</p>}
            <p style={p}>{(en?'Contact: ':'Contact : ')+EDITOR.email+' · '+EDITOR.x}</p>
            <p style={p}>{en?'Hosting: Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, USA.':'Hébergeur : Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis.'}</p>
          </section>
        )}
        {items.map(s=>(
          <section key={s.h} style={{marginBottom:'1.4rem'}}>
            <h2 style={h2}>{s.h}</h2>
            {s.p.map(t=><p key={t} style={p}>{t}</p>)}
          </section>
        ))}
        <section style={{marginBottom:'1.4rem'}}>
          <h2 style={h2}>{en?'12. Contact':'12. Contact'}</h2>
          <p style={p}>{(en?'Any question or request: ':'Pour toute question ou demande : ')+EDITOR.email+' · '+EDITOR.x}</p>
        </section>
        <a href='/' style={{display:'inline-block',marginTop:'1rem',color:'#40e8ff',fontSize:'0.8rem',textDecoration:'none'}}>← myNFTlocker</a>
      </div>
    </main>
  );
}

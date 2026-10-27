"use client";
import { useEffect } from 'react';
import { useLang, initLang, LangSwitch } from '../i18n';

// Conditions generales d'utilisation (version de lancement). A completer avec les mentions legales de l'editeur avant l'ouverture publique.
const FR:[string,string][]=[
  ['Objet','myNFTlocker est un outil gratuit de consultation et de présentation de cartes de jeux de sport numériques (galerie, vestiaire, statistiques). Il ne permet ni d’acheter, ni de vendre, ni d’échanger des cartes.'],
  ['Indépendance','myNFTlocker est un projet indépendant. Il n’est ni affilié à Sorare, ni approuvé, ni sponsorisé par Sorare. Les noms, visuels et marques appartiennent à leurs propriétaires respectifs.'],
  ['Données','Les cartes et statistiques affichées proviennent de l’API publique de Sorare, en direct. Elles peuvent être incomplètes, retardées ou erronées à la source : elles sont fournies à titre indicatif, sans garantie, et ne constituent pas un conseil de jeu ni d’investissement.'],
  ['Compte','La création d’un compte est optionnelle. Tu es responsable de la confidentialité de ton mot de passe. Tu peux modifier ton mot de passe et supprimer ton compte à tout moment depuis « Mon compte ».'],
  ['Données personnelles','Nous conservons uniquement ton pseudo, ton adresse e-mail, ton slug Sorare et ton mot de passe chiffré, pour faire fonctionner ton compte. Ils ne sont ni vendus ni cédés. Le détail est visible dans « Mon compte » > « Confidentialité & données ».'],
  ['Responsabilité','Le service est fourni « en l’état », sans garantie de disponibilité. Nous ne sommes pas responsables des décisions prises à partir des informations affichées.'],
  ['Évolution','Ces conditions peuvent évoluer. La version en vigueur est celle publiée sur cette page.'],
  ['Contact','Pour toute question : @myNFTlocker sur X.'],
];
const EN:[string,string][]=[
  ['Purpose','myNFTlocker is a free tool to browse and showcase digital sports cards (gallery, locker room, stats). It does not let you buy, sell or trade cards.'],
  ['Independence','myNFTlocker is an independent project. It is not affiliated with, endorsed or sponsored by Sorare. Names, visuals and trademarks belong to their respective owners.'],
  ['Data','Cards and stats come live from Sorare’s public API. They may be incomplete, delayed or wrong at the source: they are provided for information only, without warranty, and are not gameplay or investment advice.'],
  ['Account','Creating an account is optional. You are responsible for keeping your password confidential. You can change your password and delete your account at any time from “My account”.'],
  ['Personal data','We only keep your username, email address, Sorare slug and encrypted password, to run your account. They are never sold or shared. Details are available in “My account” > “Privacy & data”.'],
  ['Liability','The service is provided “as is”, with no guarantee of availability. We are not responsible for decisions made from the information displayed.'],
  ['Changes','These terms may change. The version in force is the one published on this page.'],
  ['Contact','Any question: @myNFTlocker on X.'],
];

export default function Terms(){
  const lang=useLang();
  useEffect(()=>{initLang();},[]);
  const en=lang==='en';
  const items=en?EN:FR;
  return(
    <main style={{minHeight:'100vh',background:'radial-gradient(ellipse 120% 90% at 50% -10%,#0d111a 0%,#080b10 55%,#040507 100%)',color:'#cfe4fb',padding:'2.5rem 1.2rem'}}>
      <div style={{maxWidth:'720px',margin:'0 auto'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:'1px solid rgba(111,195,232,0.25)',paddingBottom:'1rem',marginBottom:'1.6rem'}}>
          <h1 style={{margin:0,fontSize:'1.35rem',fontWeight:800,color:'#eaf2ff'}}>{en?'Terms of use':'Conditions générales d’utilisation'}</h1>
          <LangSwitch/>
        </div>
        {items.map(([h,p])=>(
          <section key={h} style={{marginBottom:'1.2rem'}}>
            <h2 style={{margin:'0 0 0.3rem',fontSize:'0.78rem',fontWeight:800,letterSpacing:'0.14em',textTransform:'uppercase',color:'#40e8ff'}}>{h}</h2>
            <p style={{margin:0,fontSize:'0.88rem',lineHeight:1.7,color:'#b9c7d9'}}>{p}</p>
          </section>
        ))}
        <a href='/' style={{display:'inline-block',marginTop:'1rem',color:'#40e8ff',fontSize:'0.8rem',textDecoration:'none'}}>← myNFTlocker</a>
      </div>
    </main>
  );
}

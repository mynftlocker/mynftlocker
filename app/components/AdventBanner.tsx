'use client';
import { t } from '../i18n';

// Bandeau d'acces au calendrier de l'Avent (accueil) : logos TTFL x Sorare Arcade + le meme titre que la page du calendrier.
export default function AdventBanner({ inline = false }: { inline?: boolean }) {
  return (
    <a href='/calendrier' className={'adv-banner' + (inline ? ' inline' : '')} aria-label={t('Calendrier de l’Avent')}>
      <style>{`
.adv-banner{position:fixed;top:.9rem;left:50%;transform:translateX(-50%);z-index:3;display:flex;flex-direction:column;align-items:center;gap:.3rem;padding:.5rem 1.1rem .55rem;border-radius:14px;border:1px solid rgba(240,201,110,.55);background:rgba(6,10,21,.78);backdrop-filter:blur(8px);text-decoration:none;box-shadow:0 0 22px rgba(240,201,110,.22);animation:advBannerGlow 3.2s ease-in-out infinite;white-space:nowrap;width:max-content;max-width:94vw}
.adv-banner:hover{border-color:#f0c96e;box-shadow:0 0 30px rgba(240,201,110,.45)}
.adv-banner .ab-logos{display:flex;align-items:center;gap:.55rem}
.adv-banner .ab-ttfl{height:26px;width:auto;display:block}
.adv-banner .ab-x{color:#8fa3bd;font-size:.8rem}
.adv-banner .ab-sorare{display:inline-flex;align-items:center;gap:.35rem;font:800 .72rem system-ui;letter-spacing:.14em;color:#fff}
.adv-banner .ab-sorare img{width:24px;height:24px;object-fit:contain}
.adv-banner .ab-sorare em{font-style:normal;color:#40e8ff;letter-spacing:.16em;font-size:.6rem}
.adv-banner .ab-title{font:900 .98rem system-ui;letter-spacing:.14em;text-transform:uppercase;background:linear-gradient(180deg,#fff2c4 0%,#f0c96e 45%,#b98a2e 100%);-webkit-background-clip:text;background-clip:text;color:transparent}
@keyframes advBannerGlow{0%,100%{box-shadow:0 0 16px rgba(240,201,110,.18)}50%{box-shadow:0 0 30px rgba(240,201,110,.42)}}
.adv-banner .ab-sep{display:none}
@media(min-width:901px){.adv-banner{flex-direction:row;align-items:center;gap:.9rem;top:.7rem;padding:.3rem 1rem}.adv-banner .ab-sep{display:block;width:1px;height:22px;background:rgba(240,201,110,.45)}.adv-banner .ab-ttfl{height:22px}.adv-banner .ab-sorare img{width:20px;height:20px}.adv-banner .ab-title{font-size:.86rem}}
@media(max-width:640px){.adv-banner{top:.6rem;padding:.4rem .8rem .45rem}.adv-banner .ab-ttfl{height:22px}.adv-banner .ab-title{font-size:.82rem}}
@media(min-width:0px){.adv-banner.inline{position:relative;top:auto;left:auto;transform:none;margin:.9rem auto 0;z-index:2}}
@media(max-height:700px) and (max-width:900px){.adv-banner.inline{margin-top:.45rem;padding:.25rem .7rem .3rem;gap:.15rem}.adv-banner.inline .ab-ttfl{height:18px}.adv-banner.inline .ab-sorare img{width:18px;height:18px}.adv-banner.inline .ab-sorare{font-size:.64rem}.adv-banner.inline .ab-title{font-size:.72rem}}
@media(prefers-reduced-motion:reduce){.adv-banner{animation:none}}
`}</style>
      <span className='ab-logos'>
        <img src='/logo-ttfl.png' alt='TTFL' className='ab-ttfl' />
        <i className='ab-x' style={{ fontStyle: 'normal' }}>×</i>
        <span className='ab-sorare'><img src='/sorare-logo.png' alt='' />SORARE <em>ARCADE</em></span>
      </span>
      <i className='ab-sep' />
      <span className='ab-title'>{t('Calendrier de l’Avent')}</span>
    </a>
  );
}

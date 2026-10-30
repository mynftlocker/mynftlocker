'use client';
import { createContext } from 'react';

// Messagerie : permet au panneau d'une carte (StatPanel) d'ouvrir la fenetre "Contacter" geree par la page.
// canContact = on regarde la galerie d'un AUTRE manager (jamais la sienne).
export type MessagingCtxValue = { canContact: boolean; contact: (card: any) => void };
export const MessagingCtx = createContext<MessagingCtxValue>({ canContact: false, contact: () => {} });

/**
 * useIAP.js — In-App Purchase hook (Phase 1: localStorage)
 *
 * Public API:
 *   { isPro, purchasePro, restorePurchases, devToggle }
 *
 * Backward-compat aliases (used by existing App.js call sites):
 *   purchase → purchasePro
 *   restore  → restorePurchases
 *
 * Phase 2: swap internals for RevenueCat Capacitor — no callers change.
 *
 * Plans:
 *   'monthly'  $4.99/mo
 *   'yearly'   $49.99/yr
 */

import { useState } from 'react';

const STORAGE_KEY = 'guitar_pro';

export default function useIAP() {
  const [isPro, setIsPro] = useState(
    () => localStorage.getItem(STORAGE_KEY) === 'true'
  );

  async function purchasePro(plan = 'monthly') {
    // Phase 1: instant unlock — Phase 2: RevenueCat purchase flow goes here
    console.log('[IAP] purchasePro:', plan);
    localStorage.setItem(STORAGE_KEY, 'true');
    setIsPro(true);
  }

  function restorePurchases() {
    // Phase 1: re-read localStorage — Phase 2: RevenueCat restore goes here
    const stored = localStorage.getItem(STORAGE_KEY) === 'true';
    console.log('[IAP] restorePurchases — found:', stored);
    setIsPro(stored);
    return stored;
  }

  function devToggle() {
    const next = !isPro;
    if (next) {
      localStorage.setItem(STORAGE_KEY, 'true');
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    setIsPro(next);
    console.log('[IAP] devToggle → isPro:', next);
  }

  return {
    isPro,
    purchasePro,
    restorePurchases,
    devToggle,
    // backward-compat aliases so existing App.js call sites need no changes
    purchase: purchasePro,
    restore:  restorePurchases,
  };
}

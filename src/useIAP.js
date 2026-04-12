/**
 * useIAP.js — In-App Purchase hook (Phase 1: localStorage mock)
 *
 * Returns { isPro, purchase, restore }
 *
 * Phase 2 will swap the internals for RevenueCat without changing
 * the public API consumed by ChordPlay, ScalePlay, etc.
 */

import { useState } from 'react';

const STORAGE_KEY = 'iap_pro';

export default function useIAP() {
  const [isPro, setIsPro] = useState(
    () => localStorage.getItem(STORAGE_KEY) === 'true'
  );

  // Simulates a network purchase — resolves after 1 s
  async function purchase(productId = 'pro_lifetime') {
    await new Promise(resolve => setTimeout(resolve, 1000));
    localStorage.setItem(STORAGE_KEY, 'true');
    setIsPro(true);
  }

  // Checks localStorage and restores state (mirrors what RevenueCat restore will do)
  function restore() {
    const stored = localStorage.getItem(STORAGE_KEY) === 'true';
    setIsPro(stored);
    return stored;
  }

  return { isPro, purchase, restore };
}

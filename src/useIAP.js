/**
 * useIAP.js — In-App Purchase hook (RevenueCat)
 *
 * STATUS: FREE_FIRST_MODE flag controls whether all PRO features are unlocked
 * for everyone. Flip to false once App Store Connect products + RevenueCat
 * offering are configured (see dashboard checklist below).
 *
 * ── Three-tier pricing (confirmed 2026-05-01) ──
 *   Monthly:  $6.99    — product id `tunewise.guitar.monthly`     · auto-renewing sub
 *   Yearly:   $39.99   — product id `TuneWiseguitaryearly`        · auto-renewing sub (~52% off vs monthly)
 *   Lifetime: $99      — product id `TuneWiseGuitarLifetime`      · non-consumable
 *   Both subscriptions include a 7-day free trial.
 *
 * ── Implementation note (2026-05-04) ──
 *   We bypass RevenueCat's offerings/packages layer and call
 *   Purchases.getProducts() / Purchases.purchaseStoreProduct() directly with
 *   the hardcoded product IDs above. The RC dashboard for our project has a
 *   broken UI for assigning iOS products to packages, so the default
 *   offering's packages only point at "Test Store" placeholders. Entitlements
 *   (pro_guitar / all_access) still attach to the products themselves and
 *   activate normally when a purchase completes.
 *
 * ── Entitlement model (multi-app suite) ──
 *   `pro_guitar`  — unlocks PRO in this app. Granted by ANY of the three guitar products.
 *   `all_access`  — superset that unlocks every TuneWise app. Granted by the future
 *                   "TuneWise All-Access" tier (~$14.99/mo · $129.99/yr). Designed in
 *                   now so we can launch the cross-instrument tier later without
 *                   migrating any existing subscriber's entitlements.
 *   We treat user as PRO if they have EITHER entitlement active.
 *
 * ── RevenueCat dashboard checklist (one time) ──
 *   1. Register bundle id `com.orchestraaudition.guitar` at developer.apple.com
 *   2. Create app in App Store Connect with that bundle id (name: "TuneWise Tuner Guitar Lessons")
 *   3. App Store Connect → In-App Purchases:
 *        - Monthly auto-renewing sub:  `tunewise.guitar.monthly`   $6.99    7-day free trial
 *        - Yearly auto-renewing sub:   `TuneWiseguitaryearly`      $39.99   7-day free trial
 *        - Non-consumable:             `TuneWiseGuitarLifetime`    $99      one-time purchase
 *      Subscriptions share group "TuneWise Guitar PRO"
 *   4. RevenueCat: Project → Products → add all 3 product ids
 *   5. Create entitlement `pro_guitar` and attach all 3 products to it
 *      (also create empty `all_access` entitlement now — populated later when
 *       the cross-app tier launches)
 *   6. (Skipped — no offering needed.) We purchase products directly via
 *      Purchases.purchaseStoreProduct(), so the default offering's package
 *      contents do not matter. See "Implementation note" above.
 *   7. Copy public Apple API key (Project Settings → API keys → "Public Apple SDK")
 *      Paste into REVENUECAT_API_KEY below.
 *   8. Add sandbox tester account in App Store Connect → Users and Access → Sandbox
 *
 * After that: flip FREE_FIRST_MODE = false, redeploy, test purchase flow with
 * the sandbox tester account.
 */

import { useEffect, useState, useCallback } from 'react';
import { Purchases, LOG_LEVEL } from '@revenuecat/purchases-capacitor';
import { Capacitor } from '@capacitor/core';

// PASTE THE PUBLIC APPLE API KEY FROM REVENUECAT HERE.
// Format: appl_xxxxxxxxxxxxxxxxxxxx
const REVENUECAT_API_KEY = 'appl_KnsMTiIOgbUgWywjlluRngVsqRx';

// Set to false once dashboard + key above are wired up. Until then, every
// purchase UI gates on this flag (App.js, SettingsModal.jsx, OnboardingTour.jsx).
export const FREE_FIRST_MODE = false;

// Entitlement identifiers configured in RevenueCat dashboard. User is treated
// as PRO if EITHER is active. See header comment for the multi-app rationale.
const PRO_ENTITLEMENTS = ['pro_guitar', 'all_access'];

// App Store Connect product identifiers, attached in RevenueCat to the
// `pro_guitar` entitlement. Capitalization is intentional — these are the
// exact strings registered in App Store Connect; do not "normalize" them.
const PRODUCT_IDS = {
  monthly:  'tunewise.guitar.monthly',
  yearly:   'TuneWiseguitaryearly',
  lifetime: 'TuneWiseGuitarLifetime',
};
const ALL_PRODUCT_IDS = Object.values(PRODUCT_IDS);

function hasProEntitlement(customerInfo) {
  const active = customerInfo?.entitlements?.active || {};
  return PRO_ENTITLEMENTS.some(id => id in active);
}

let _configured = false;

async function configureOnce() {
  if (_configured) return;
  if (!Capacitor.isNativePlatform()) {
    // Web preview / desktop dev — RevenueCat native plugin is iOS-only.
    // Skip configuration so the page doesn't crash; isPro stays false.
    return;
  }
  if (!REVENUECAT_API_KEY || REVENUECAT_API_KEY.startsWith('REPLACE_')) {
    console.warn('[IAP] RevenueCat API key not set — IAP features disabled.');
    return;
  }
  try {
    await Purchases.setLogLevel({ level: LOG_LEVEL.WARN });
    await Purchases.configure({ apiKey: REVENUECAT_API_KEY });
    _configured = true;
  } catch (e) {
    console.warn('[IAP] configure failed:', e);
  }
}

export default function useIAP() {
  // While FREE_FIRST_MODE is on (RevenueCat not yet wired up), every user is
  // treated as PRO so that gated features remain reachable. Once App Store
  // Connect + RevenueCat are configured and the API key above is filled in,
  // flip FREE_FIRST_MODE to false and this initial state becomes the real
  // "not yet purchased" baseline.
  const [isPro, setIsPro] = useState(FREE_FIRST_MODE);

  // Configure RevenueCat once + read initial customer info + subscribe to updates
  useEffect(() => {
    let cancelled = false;
    let listenerHandle = null;

    (async () => {
      await configureOnce();
      if (!_configured || cancelled) return;
      try {
        const { customerInfo } = await Purchases.getCustomerInfo();
        if (!cancelled) setIsPro(hasProEntitlement(customerInfo));
      } catch (e) {
        console.warn('[IAP] getCustomerInfo failed:', e);
      }
      // Live updates when customer info changes (purchase, restore, expiration)
      try {
        listenerHandle = await Purchases.addCustomerInfoUpdateListener((info) => {
          setIsPro(hasProEntitlement(info));
        });
      } catch (e) {
        console.warn('[IAP] listener attach failed:', e);
      }
    })();

    return () => {
      cancelled = true;
      // Capacitor plugin returns a handle for removeListener (v7+)
      if (listenerHandle && typeof listenerHandle.remove === 'function') {
        try { listenerHandle.remove(); } catch (_) { /* noop */ }
      }
    };
  }, []);

  // Direct product purchase — bypasses RevenueCat offerings/packages.
  // Looks the product up by App Store Connect ID and hands the StoreProduct
  // to purchaseStoreProduct(). Entitlements still resolve normally on the
  // returned customerInfo.
  const purchaseProduct = useCallback(async (productId) => {
    if (!_configured) {
      console.warn('[IAP] purchaseProduct called before configure — no-op');
      return false;
    }
    try {
      const { products } = await Purchases.getProducts({
        productIdentifiers: [productId],
      });
      if (!products || products.length === 0) {
        console.warn('[IAP] product not found in App Store:', productId);
        return false;
      }
      const { customerInfo } = await Purchases.purchaseStoreProduct({
        product: products[0],
      });
      const active = hasProEntitlement(customerInfo);
      setIsPro(active);
      return active;
    } catch (e) {
      if (!e?.userCancelled) console.warn('[IAP] purchase failed:', e);
      return false;
    }
  }, []);

  // Trigger a purchase. plan = 'monthly' | 'yearly' | 'lifetime'
  const purchasePro = useCallback(async (plan = 'monthly') => {
    const productId = PRODUCT_IDS[plan];
    if (!productId) {
      console.warn('[IAP] unknown plan:', plan);
      return false;
    }
    return purchaseProduct(productId);
  }, [purchaseProduct]);

  // Fetch all 3 products from the App Store and return a plan-keyed map of
  // { price, priceString, currencyCode, productIdentifier, title }. UI can
  // use this if it wants live App Store prices instead of hardcoded strings.
  // Resolves to {} if not configured (web preview, missing API key, etc.).
  const getAvailableProducts = useCallback(async () => {
    if (!_configured) return {};
    try {
      const { products } = await Purchases.getProducts({
        productIdentifiers: ALL_PRODUCT_IDS,
      });
      const byPlan = {};
      for (const [plan, id] of Object.entries(PRODUCT_IDS)) {
        const p = products.find(pr => pr.identifier === id);
        if (p) {
          byPlan[plan] = {
            price:             p.price,
            priceString:       p.priceString,
            currencyCode:      p.currencyCode,
            productIdentifier: p.identifier,
            title:             p.title,
          };
        }
      }
      return byPlan;
    } catch (e) {
      console.warn('[IAP] getAvailableProducts failed:', e);
      return {};
    }
  }, []);

  // Restore previous purchases — required by Apple's IAP guidelines.
  const restorePurchases = useCallback(async () => {
    if (!_configured) return false;
    try {
      const { customerInfo } = await Purchases.restorePurchases();
      const active = hasProEntitlement(customerInfo);
      setIsPro(active);
      return active;
    } catch (e) {
      console.warn('[IAP] restore failed:', e);
      return false;
    }
  }, []);

  // Dev-only override for testing PRO-gated UI without a real purchase.
  const devToggle = useCallback(() => {
    setIsPro(p => !p);
  }, []);

  return {
    isPro,
    purchasePro,
    purchaseProduct,
    getAvailableProducts,
    restorePurchases,
    devToggle,
    // backward-compat aliases — call sites used both names historically
    purchase: purchasePro,
    restore:  restorePurchases,
  };
}

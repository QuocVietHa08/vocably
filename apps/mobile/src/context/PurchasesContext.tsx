import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import Purchases, {
  type PurchasesOffering,
  type PurchasesPackage,
  LOG_LEVEL,
} from 'react-native-purchases';

// ⚠️  Replace with your RevenueCat API keys from:
//     https://app.revenuecat.com → Project Settings → API Keys
const RC_KEY_IOS     = process.env.EXPO_PUBLIC_RC_KEY_IOS     ?? 'appl_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
const RC_KEY_ANDROID = process.env.EXPO_PUBLIC_RC_KEY_ANDROID ?? 'goog_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';

/* ─── Types ───────────────────────────────────────────────────── */

interface PurchasesContextValue {
  isPro:        boolean;
  offering:     PurchasesOffering | null;
  loading:      boolean;
  purchasing:   boolean;
  purchase:     (pkg: PurchasesPackage) => Promise<boolean>;
  restore:      () => Promise<boolean>;
}

const PurchasesContext = createContext<PurchasesContextValue>({
  isPro:      false,
  offering:   null,
  loading:    true,
  purchasing: false,
  purchase:   async () => false,
  restore:    async () => false,
});

/* ─── Provider ────────────────────────────────────────────────── */

export function PurchasesProvider({ children }: { children: React.ReactNode }) {
  const [isPro,      setIsPro]      = useState(false);
  const [offering,   setOffering]   = useState<PurchasesOffering | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    async function init() {
      try {
        if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.DEBUG);

        const apiKey = Platform.OS === 'ios' ? RC_KEY_IOS : RC_KEY_ANDROID;
        await Purchases.configure({ apiKey });

        // Check current entitlement
        const info = await Purchases.getCustomerInfo();
        setIsPro(!!info.entitlements.active['pro']);

        // Fetch offerings
        const { current } = await Purchases.getOfferings();
        setOffering(current);
      } catch (e) {
        console.warn('[Purchases] Init error:', e);
      } finally {
        setLoading(false);
      }
    }

    init();

    // Keep entitlement in sync
    const listener = Purchases.addCustomerInfoUpdateListener((info) => {
      setIsPro(!!info.entitlements.active['pro']);
    });

    return () => listener.remove();
  }, []);

  /* ── Purchase a package ───────────────────────────────────── */
  async function purchase(pkg: PurchasesPackage): Promise<boolean> {
    setPurchasing(true);
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      const active = !!customerInfo.entitlements.active['pro'];
      setIsPro(active);
      return active;
    } catch (e: any) {
      if (!e.userCancelled) console.warn('[Purchases] Purchase error:', e);
      return false;
    } finally {
      setPurchasing(false);
    }
  }

  /* ── Restore purchases ────────────────────────────────────── */
  async function restore(): Promise<boolean> {
    setPurchasing(true);
    try {
      const info   = await Purchases.restorePurchases();
      const active = !!info.entitlements.active['pro'];
      setIsPro(active);
      return active;
    } catch (e) {
      console.warn('[Purchases] Restore error:', e);
      return false;
    } finally {
      setPurchasing(false);
    }
  }

  return (
    <PurchasesContext.Provider value={{ isPro, offering, loading, purchasing, purchase, restore }}>
      {children}
    </PurchasesContext.Provider>
  );
}

/* ─── Hook ────────────────────────────────────────────────────── */
export function usePurchases() {
  return useContext(PurchasesContext);
}

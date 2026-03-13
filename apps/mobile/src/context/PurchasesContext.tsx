import React, { createContext, useContext /*, useEffect*/, useState } from 'react';
// import { Platform } from 'react-native';
// import Purchases, {
//   type PurchasesOffering,
//   type PurchasesPackage,
//   LOG_LEVEL,
// } from 'react-native-purchases';

// ⚠️  Replace with your RevenueCat API keys from:
//     https://app.revenuecat.com → Project Settings → API Keys
// const RC_KEY_IOS     = process.env.EXPO_PUBLIC_RC_KEY_IOS     ?? 'appl_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
// const RC_KEY_ANDROID = process.env.EXPO_PUBLIC_RC_KEY_ANDROID ?? 'goog_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';

/* ─── Types ───────────────────────────────────────────────────── */

interface PurchasesContextValue {
  isPro:        boolean;
  offering:     any | null; // PurchasesOffering
  loading:      boolean;
  purchasing:   boolean;
  purchase:     (pkg: any) => Promise<boolean>; // PurchasesPackage
  restore:      () => Promise<boolean>;
}

const PurchasesContext = createContext<PurchasesContextValue>({
  isPro:      false,
  offering:   null,
  loading:    false,
  purchasing: false,
  purchase:   async () => false,
  restore:    async () => false,
});

/* ─── Provider (stubbed — payment disabled) ───────────────────── */

export function PurchasesProvider({ children }: { children: React.ReactNode }) {
  const [isPro]      = useState(false);
  const [offering]   = useState<any | null>(null);
  const [loading]    = useState(false);
  const [purchasing] = useState(false);

  // TODO: re-enable RevenueCat when payment is configured
  // useEffect(() => {
  //   async function init() {
  //     try {
  //       if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  //       const apiKey = Platform.OS === 'ios' ? RC_KEY_IOS : RC_KEY_ANDROID;
  //       await Purchases.configure({ apiKey });
  //       const info = await Purchases.getCustomerInfo();
  //       setIsPro(!!info.entitlements.active['pro']);
  //       const { current } = await Purchases.getOfferings();
  //       setOffering(current);
  //     } catch (e) {
  //       console.warn('[Purchases] Init error:', e);
  //     } finally {
  //       setLoading(false);
  //     }
  //   }
  //   init();
  //   const listener = Purchases.addCustomerInfoUpdateListener((info) => {
  //     setIsPro(!!info.entitlements.active['pro']);
  //   });
  //   return () => listener.remove();
  // }, []);

  async function purchase(_pkg: any): Promise<boolean> {
    // TODO: re-enable when payment is configured
    return false;
  }

  async function restore(): Promise<boolean> {
    // TODO: re-enable when payment is configured
    return false;
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

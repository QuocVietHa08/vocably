import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, ActivityIndicator,
  ScrollView, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
// import type { PurchasesPackage } from 'react-native-purchases';
// import { PACKAGE_TYPE } from 'react-native-purchases';
import { useTheme } from '@/src/theme';
import { F } from '@/src/theme/fonts';
import { usePurchases } from '@/src/context/PurchasesContext';

/* ─── Benefits list ───────────────────────────────────────────── */

const BENEFITS = [
  { icon: '🎙', text: 'Unlimited AI speaking sessions' },
  { icon: '✦',  text: 'Instant grammar & band score feedback' },
  { icon: '📌', text: 'Save vocab from every session' },
  { icon: '📚', text: 'Full flashcard library — 500+ IELTS words' },
  { icon: '🎯', text: 'Personalised topic suggestions' },
];

/* ─── Screen ──────────────────────────────────────────────────── */

export default function PaywallScreen() {
  const t                                     = useTheme();
  const router                                = useRouter();
  const { offering, purchasing, purchase, restore } = usePurchases();
  const [selected, setSelected]               = useState<'monthly' | 'yearly'>('yearly');

  // TODO: re-enable when payment is configured
  // Pick packages from the current offering
  // const monthlyPkg = offering?.availablePackages.find(
  //   (p) => p.packageType === PACKAGE_TYPE.MONTHLY,
  // );
  // const yearlyPkg = offering?.availablePackages.find(
  //   (p) => p.packageType === PACKAGE_TYPE.ANNUAL,
  // );
  // const selectedPkg: PurchasesPackage | undefined =
  //   selected === 'monthly' ? monthlyPkg : yearlyPkg;
  const monthlyPkg: any = null;
  const yearlyPkg: any = null;
  const selectedPkg: any = null;

  const monthlyPrice = monthlyPkg?.product?.priceString ?? '$5.99';
  const yearlyPrice  = yearlyPkg?.product?.priceString  ?? '$49.99';

  // Compute monthly equivalent for yearly (for badge)
  const yearlyMonthly = yearlyPkg
    ? `$${(yearlyPkg.product.price / 12).toFixed(2)}/mo`
    : '$4.17/mo';

  async function handlePurchase() {
    // TODO: re-enable when payment is configured
    // if (!selectedPkg) return;
    // const ok = await purchase(selectedPkg);
    // if (ok) router.back();
    Alert.alert('Coming soon', 'Payment is not yet configured.');
  }

  async function handleRestore() {
    // TODO: re-enable when payment is configured
    // const ok = await restore();
    // if (ok) {
    //   router.back();
    // } else {
    //   Alert.alert('No purchases found', 'We couldn\'t find any previous purchases for this account.');
    // }
    Alert.alert('Coming soon', 'Payment is not yet configured.');
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.bg }]}>

      {/* Close */}
      <Pressable onPress={() => router.back()} style={styles.closeBtn}>
        <Text style={[styles.closeText, { color: t.muted }]}>✕</Text>
      </Pressable>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <View style={[styles.badgeRow]}>
            <View style={[styles.proBadge, { backgroundColor: t.accent }]}>
              <Text style={styles.proBadgeText}>PRO</Text>
            </View>
          </View>
          <Text style={[styles.title, { color: t.fg }]}>Unlock Your{'\n'}Band 7+ Potential</Text>
          <Text style={[styles.subtitle, { color: t.muted }]}>
            Everything you need to ace the IELTS speaking test.
          </Text>
        </View>

        {/* Benefits */}
        <View style={[styles.benefitsCard, { backgroundColor: t.surface, borderColor: t.border }]}>
          {BENEFITS.map((b, i) => (
            <View
              key={i}
              style={[
                styles.benefitRow,
                i < BENEFITS.length - 1 && { borderBottomWidth: 1, borderBottomColor: t.border },
              ]}
            >
              <Text style={styles.benefitIcon}>{b.icon}</Text>
              <Text style={[styles.benefitText, { color: t.fg }]}>{b.text}</Text>
            </View>
          ))}
        </View>

        {/* Plan toggle */}
        <View style={styles.plans}>

          {/* Yearly */}
          <Pressable
            onPress={() => setSelected('yearly')}
            style={[
              styles.planCard,
              { backgroundColor: t.surface, borderColor: selected === 'yearly' ? t.accent : t.border },
              selected === 'yearly' && styles.planCardActive,
            ]}
          >
            <View style={styles.planCardInner}>
              <View style={styles.planLeft}>
                <View style={styles.planRadioRow}>
                  <View style={[styles.radio, { borderColor: selected === 'yearly' ? t.accent : t.muted }]}>
                    {selected === 'yearly' && <View style={[styles.radioDot, { backgroundColor: t.accent }]} />}
                  </View>
                  <Text style={[styles.planLabel, { color: t.fg }]}>Yearly</Text>
                  <View style={[styles.saveBadge, { backgroundColor: `${t.accent}22` }]}>
                    <Text style={[styles.saveBadgeText, { color: t.accent }]}>Best Value</Text>
                  </View>
                </View>
                <Text style={[styles.planSubLabel, { color: t.muted }]}>
                  {yearlyMonthly} · billed annually
                </Text>
              </View>
              <Text style={[styles.planPrice, { color: t.fg }]}>{yearlyPrice}</Text>
            </View>
          </Pressable>

          {/* Monthly */}
          <Pressable
            onPress={() => setSelected('monthly')}
            style={[
              styles.planCard,
              { backgroundColor: t.surface, borderColor: selected === 'monthly' ? t.accent : t.border },
            ]}
          >
            <View style={styles.planCardInner}>
              <View style={styles.planLeft}>
                <View style={styles.planRadioRow}>
                  <View style={[styles.radio, { borderColor: selected === 'monthly' ? t.accent : t.muted }]}>
                    {selected === 'monthly' && <View style={[styles.radioDot, { backgroundColor: t.accent }]} />}
                  </View>
                  <Text style={[styles.planLabel, { color: t.fg }]}>Monthly</Text>
                </View>
                <Text style={[styles.planSubLabel, { color: t.muted }]}>billed every month</Text>
              </View>
              <Text style={[styles.planPrice, { color: t.fg }]}>{monthlyPrice}</Text>
            </View>
          </Pressable>

        </View>

        {/* CTA */}
        <Pressable
          onPress={handlePurchase}
          disabled={purchasing || !selectedPkg}
          style={({ pressed }) => [
            styles.ctaBtn,
            { backgroundColor: t.accent, opacity: pressed || purchasing ? 0.85 : 1 },
          ]}
        >
          {purchasing
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.ctaBtnText}>
                {selected === 'yearly'
                  ? `Start for ${yearlyPrice}/year`
                  : `Start for ${monthlyPrice}/month`}
              </Text>
          }
        </Pressable>

        <Text style={[styles.trial, { color: t.muted }]}>
          Cancel anytime · No commitment
        </Text>

        {/* Footer links */}
        <View style={styles.footerLinks}>
          <Pressable onPress={handleRestore}>
            <Text style={[styles.footerLink, { color: t.muted }]}>Restore Purchases</Text>
          </Pressable>
          <Text style={[styles.footerDot, { color: t.muted }]}>·</Text>
          <Text style={[styles.footerLink, { color: t.muted }]}>Terms</Text>
          <Text style={[styles.footerDot, { color: t.muted }]}>·</Text>
          <Text style={[styles.footerLink, { color: t.muted }]}>Privacy</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

/* ─── Styles ──────────────────────────────────────────────────── */

const styles = StyleSheet.create({
  safe:    { flex: 1 },
  closeBtn: { position: 'absolute', top: 56, right: 22, zIndex: 10, padding: 8 },
  closeText: { fontSize: 18 },

  scroll: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40 },

  hero:     { alignItems: 'center', marginBottom: 28, marginTop: 16 },
  badgeRow: { marginBottom: 16 },
  proBadge: {
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4,
  },
  proBadgeText: { color: '#fff', fontSize: 12, fontFamily: F.extrabold, letterSpacing: 1.5 },

  title: {
    fontSize: 30, fontFamily: F.extrabold, textAlign: 'center',
    lineHeight: 38, marginBottom: 10,
  },
  subtitle: { fontSize: 15, fontFamily: F.regular, textAlign: 'center', lineHeight: 22 },

  benefitsCard: {
    borderRadius: 16, borderWidth: 1,
    overflow: 'hidden', marginBottom: 20,
  },
  benefitRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, gap: 12,
  },
  benefitIcon: { fontSize: 20, width: 28, textAlign: 'center' },
  benefitText: { fontSize: 14, fontFamily: F.medium, flex: 1 },

  plans:        { gap: 10, marginBottom: 20 },
  planCard: {
    borderRadius: 14, borderWidth: 1.5,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  planCardActive: {
    shadowColor: '#f4511e', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 8, elevation: 3,
  },
  planCardInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  planLeft:     { gap: 4 },
  planRadioRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  radio: {
    width: 18, height: 18, borderRadius: 9, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  radioDot:     { width: 8, height: 8, borderRadius: 4 },
  planLabel:    { fontSize: 15, fontFamily: F.semibold },
  planSubLabel: { fontSize: 12, fontFamily: F.regular, marginLeft: 26 },
  saveBadge:    { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  saveBadgeText: { fontSize: 11, fontFamily: F.bold },
  planPrice:    { fontSize: 17, fontFamily: F.bold },

  ctaBtn: {
    borderRadius: 16, paddingVertical: 17,
    alignItems: 'center', marginBottom: 12,
  },
  ctaBtnText: { color: '#fff', fontSize: 17, fontFamily: F.bold },

  trial: { textAlign: 'center', fontSize: 12, fontFamily: F.regular, marginBottom: 20 },

  footerLinks: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  footerLink:  { fontSize: 12, fontFamily: F.regular },
  footerDot:   { fontSize: 12 },
});

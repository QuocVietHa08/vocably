import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, ActivityIndicator,
  ScrollView, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
// import type { PurchasesPackage } from 'react-native-purchases';
// import { PACKAGE_TYPE } from 'react-native-purchases';
import { useTheme } from '@/src/theme';
import { F } from '@/src/theme/fonts';
import { usePurchases } from '@/src/context/PurchasesContext';
import { useT } from '@/src/i18n/useT';

/* ─── Screen ──────────────────────────────────────────────────── */

export default function PaywallScreen() {
  const t                                     = useTheme();
  const T                                     = useT();
  const router                                = useRouter();
  const { reason }                            = useLocalSearchParams<{ reason?: string }>();
  const { offering, purchasing, purchase, restore } = usePurchases();
  const [selected, setSelected]               = useState<'monthly' | 'yearly'>('yearly');

  const reasonMessages: Record<string, string> = {
    words:   T.paywallReasonWords,
    voice:   T.paywallReasonVoice,
    grammar: T.paywallReasonGrammar,
    quiz:    T.paywallReasonQuiz,
  };
  const reasonText = reason ? reasonMessages[reason] : undefined;

  // TODO: re-enable when payment is configured
  const monthlyPkg: any = null;
  const yearlyPkg: any  = null;
  const selectedPkg: any = null;

  const monthlyPrice  = monthlyPkg?.product?.priceString ?? '$5.99';
  const yearlyPrice   = yearlyPkg?.product?.priceString  ?? '$49.99';
  const yearlyMonthly = yearlyPkg
    ? `$${(yearlyPkg.product.price / 12).toFixed(2)}/mo`
    : '$4.17/mo';

  async function handlePurchase() {
    Alert.alert('Coming soon', 'Payment is not yet configured.');
  }

  async function handleRestore() {
    Alert.alert('Coming soon', 'Payment is not yet configured.');
  }

  const BENEFITS = [
    { icon: '🎙', text: T.paywallBenefit1 },
    { icon: '✦',  text: T.paywallBenefit2 },
    { icon: '📌', text: T.paywallBenefit3 },
    { icon: '📚', text: T.paywallBenefit4 },
    { icon: '🎯', text: T.paywallBenefit5 },
  ];

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
        {/* Contextual reason banner */}
        {reasonText && (
          <View style={[styles.reasonBanner, { backgroundColor: `${t.accent}14`, borderColor: `${t.accent}40` }]}>
            <Text style={[styles.reasonText, { color: t.accent }]}>{reasonText}</Text>
          </View>
        )}

        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.badgeRow}>
            <View style={[styles.proBadge, { backgroundColor: t.accent }]}>
              <Text style={styles.proBadgeText}>PRO</Text>
            </View>
          </View>
          <Text style={[styles.title, { color: t.fg }]}>{T.paywallTitle}</Text>
          <Text style={[styles.subtitle, { color: t.muted }]}>{T.paywallSubtitle}</Text>
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
                  <Text style={[styles.planLabel, { color: t.fg }]}>{T.planYearly}</Text>
                  <View style={[styles.saveBadge, { backgroundColor: `${t.accent}22` }]}>
                    <Text style={[styles.saveBadgeText, { color: t.accent }]}>{T.planBestValue}</Text>
                  </View>
                </View>
                <Text style={[styles.planSubLabel, { color: t.muted }]}>
                  {yearlyMonthly} · {T.planBilledAnnual}
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
                  <Text style={[styles.planLabel, { color: t.fg }]}>{T.planMonthly}</Text>
                </View>
                <Text style={[styles.planSubLabel, { color: t.muted }]}>{T.planBilledMonthly}</Text>
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
                  ? `${T.ctaStartFor}${yearlyPrice}${T.ctaPerYear}`
                  : `${T.ctaStartFor}${monthlyPrice}${T.ctaPerMonth}`}
              </Text>
          }
        </Pressable>

        <Text style={[styles.trial, { color: t.muted }]}>{T.cancelAnytime}</Text>

        {/* Footer links */}
        <View style={styles.footerLinks}>
          <Pressable onPress={handleRestore}>
            <Text style={[styles.footerLink, { color: t.muted }]}>{T.restorePurchases}</Text>
          </Pressable>
          <Text style={[styles.footerDot, { color: t.muted }]}>·</Text>
          <Text style={[styles.footerLink, { color: t.muted }]}>{T.termsLabel}</Text>
          <Text style={[styles.footerDot, { color: t.muted }]}>·</Text>
          <Text style={[styles.footerLink, { color: t.muted }]}>{T.privacyLabel}</Text>
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

  reasonBanner: {
    borderRadius: 12, borderWidth: 1,
    paddingHorizontal: 16, paddingVertical: 12,
    marginBottom: 8, alignItems: 'center',
  },
  reasonText: { fontSize: 14, fontFamily: F.semibold, textAlign: 'center' },

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

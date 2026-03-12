import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, ActivityIndicator, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/src/theme';
import { F } from '@/src/theme/fonts';
import { useAuth } from '@/src/context/AuthContext';

/* ─── Screen ──────────────────────────────────────────────────── */

export default function AuthScreen() {
  const t                                       = useTheme();
  const { signInWithGoogle, signInWithApple }   = useAuth();
  const [loadingGoogle, setLoadingGoogle]       = useState(false);
  const [loadingApple,  setLoadingApple]        = useState(false);

  async function handleGoogle() {
    setLoadingGoogle(true);
    try { await signInWithGoogle(); } finally { setLoadingGoogle(false); }
  }

  async function handleApple() {
    setLoadingApple(true);
    try { await signInWithApple(); } finally { setLoadingApple(false); }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.bg }]}>
      <View style={styles.container}>

        {/* Logo / brand */}
        <View style={styles.hero}>
          <View style={[styles.logoCircle, { backgroundColor: t.accent }]}>
            <Text style={styles.logoEmoji}>🎙</Text>
          </View>
          <Text style={[styles.appName, { color: t.fg }]}>Vocally</Text>
          <Text style={[styles.tagline, { color: t.muted }]}>Your IELTS speaking coach</Text>
        </View>

        {/* Buttons */}
        <View style={styles.buttons}>

          {/* Google */}
          <Pressable
            onPress={handleGoogle}
            disabled={loadingGoogle || loadingApple}
            style={({ pressed }) => [
              styles.socialBtn,
              { backgroundColor: t.surface, borderColor: t.border, opacity: pressed ? 0.8 : 1 },
            ]}
          >
            {loadingGoogle
              ? <ActivityIndicator size="small" color={t.fg} />
              : <Text style={styles.googleG}>G</Text>
            }
            <Text style={[styles.socialBtnText, { color: t.fg }]}>Continue with Google</Text>
          </Pressable>

          {/* Apple — iOS only */}
          {Platform.OS === 'ios' && (
            <Pressable
              onPress={handleApple}
              disabled={loadingGoogle || loadingApple}
              style={({ pressed }) => [
                styles.socialBtn,
                styles.appleBtn,
                { backgroundColor: t.dark ? '#ffffff' : '#000000', opacity: pressed ? 0.8 : 1 },
              ]}
            >
              {loadingApple
                ? <ActivityIndicator size="small" color={t.dark ? '#000' : '#fff'} />
                : <Text style={[styles.appleLogo, { color: t.dark ? '#000' : '#fff' }]}></Text>
              }
              <Text style={[styles.socialBtnText, { color: t.dark ? '#000000' : '#ffffff' }]}>
                Continue with Apple
              </Text>
            </Pressable>
          )}
        </View>

        {/* Terms */}
        <Text style={[styles.terms, { color: t.muted }]}>
          By continuing, you agree to our{' '}
          <Text style={{ color: t.accent }}>Terms of Service</Text>
          {' '}and{' '}
          <Text style={{ color: t.accent }}>Privacy Policy</Text>.
        </Text>

      </View>
    </SafeAreaView>
  );
}

/* ─── Styles ──────────────────────────────────────────────────── */

const styles = StyleSheet.create({
  safe:      { flex: 1 },
  container: { flex: 1, paddingHorizontal: 28, justifyContent: 'space-between', paddingBottom: 24 },

  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  logoCircle: {
    width: 88, height: 88, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
    shadowColor: '#f4511e', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25, shadowRadius: 18, elevation: 8,
  },
  logoEmoji:  { fontSize: 44 },
  appName:    { fontSize: 36, fontFamily: F.extrabold, letterSpacing: -0.5 },
  tagline:    { fontSize: 16, fontFamily: F.regular },

  buttons: { gap: 12, marginBottom: 24 },
  socialBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, borderRadius: 14, borderWidth: 1,
    paddingVertical: 15, paddingHorizontal: 20,
  },
  appleBtn: { borderWidth: 0 },

  googleG: {
    fontSize: 18, fontFamily: F.bold,
    color: '#4285F4', width: 22, textAlign: 'center',
  },
  appleLogo: { fontSize: 20, lineHeight: 22, width: 22, textAlign: 'center' },

  socialBtnText: { fontSize: 16, fontFamily: F.semibold },

  terms: { fontSize: 12, fontFamily: F.regular, textAlign: 'center', lineHeight: 18 },
});

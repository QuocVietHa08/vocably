import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import Animated, {
  FadeIn, useSharedValue, useAnimatedStyle,
  withTiming, withSpring, Easing, runOnJS,
} from 'react-native-reanimated';
import { useTheme } from '@/src/theme';
import { F } from '@/src/theme/fonts';
import { TypingIndicator } from './TypingIndicator';
import type { GrammarFeedback } from './types';

export interface GrammarDrawerProps {
  visible:       boolean;
  feedback:      GrammarFeedback | null;
  messageText:   string | null;
  onClose:       () => void;
  onUseRewrite?: (text: string) => void;
  t:             ReturnType<typeof useTheme>;
}

function bandLabel(score: number) {
  if (score >= 8) return 'Expert';
  if (score >= 7) return 'Good';
  if (score >= 6) return 'Competent';
  if (score >= 5) return 'Modest';
  return 'Needs Work';
}

/** Splits `text` into plain/marked segments by matching `phrases`. */
function splitByPhrases(text: string, phrases: string[]): { content: string; marked: boolean }[] {
  if (!phrases.length) return [{ content: text, marked: false }];

  // Build a regex that matches any of the phrases (case-insensitive)
  const escaped = phrases.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const re       = new RegExp(`(${escaped.join('|')})`, 'gi');
  const parts    = text.split(re);

  return parts
    .filter((p) => p.length > 0)
    .map((p) => ({ content: p, marked: re.test(p) }));
}

export function GrammarDrawer({ visible, feedback, messageText, onClose, onUseRewrite, t }: GrammarDrawerProps) {
  const translateY  = useSharedValue(700);
  const backdropOp  = useSharedValue(0);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (visible) {
      setActive(true);
      backdropOp.value = withTiming(1, { duration: 240 });
      translateY.value = withSpring(0, { damping: 22, stiffness: 260, mass: 0.9 });
    } else {
      backdropOp.value = withTiming(0, { duration: 200 });
      translateY.value = withTiming(700, { duration: 300, easing: Easing.in(Easing.cubic) }, (done) => {
        if (done) runOnJS(setActive)(false);
      });
    }
  }, [visible]);

  const sheetStyle    = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdropOp.value }));

  if (!active && !visible) return null;

  const isReady = !!feedback && !feedback.loading;

  // Collect the original problem phrases and their suggestions
  const originalPhrases   = (feedback?.issues ?? []).map((i) => i.text);
  const suggestionPhrases = (feedback?.issues ?? []).map((i) => i.suggestion);

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 100 }]} pointerEvents="box-none">
      {/* Backdrop */}
      <Animated.View
        style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}
        pointerEvents={active ? 'auto' : 'none'}
      >
        <Pressable style={{ flex: 1 }} onPress={onClose} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View style={[styles.sheet, { backgroundColor: t.surface }, sheetStyle]}>

        {/* Handle */}
        <View style={styles.handleWrap}>
          <View style={[styles.handle, { backgroundColor: t.border }]} />
        </View>

        {/* Header */}
        <View style={[styles.headerRow, { borderBottomColor: t.border }]}>
          <Text style={[styles.title, { color: t.fg }]}>Grammar Check</Text>
          {isReady && (
            <Animated.View entering={FadeIn.duration(200)} style={styles.scoreInline}>
              <Text style={[styles.scoreNum, { color: t.fg }]}>{feedback!.score}</Text>
              <Text style={[styles.scoreSep, { color: t.muted }]}>/9 · </Text>
              <Text style={[styles.scoreLevel, { color: t.muted }]}>{bandLabel(feedback!.score)}</Text>
            </Animated.View>
          )}
        </View>

        {/* Body */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Loading ── */}
          {!isReady ? (
            <View style={styles.loadingState}>
              <Text style={[styles.loadingText, { color: t.muted }]}>Analysing your response</Text>
              <TypingIndicator />
            </View>

          /* ── All good ── */
          ) : feedback!.issues.length === 0 ? (
            <Animated.View entering={FadeIn.duration(240)} style={styles.successState}>
              <Text style={[styles.successMark, { color: t.fg }]}>✓</Text>
              <View>
                <Text style={[styles.successTitle, { color: t.fg }]}>Looks great</Text>
                <Text style={[styles.successSub, { color: t.muted }]}>No issues found in this response.</Text>
              </View>
            </Animated.View>

          /* ── Diff view ── */
          ) : (
            <Animated.View entering={FadeIn.duration(220)} style={styles.diffWrap}>

              {/* BEFORE */}
              <Text style={[styles.diffLabel, { color: t.muted }]}>BEFORE</Text>
              <View style={[styles.diffBlock, { backgroundColor: t.subtle, borderColor: t.border }]}>
                <Text style={[styles.diffText, { color: t.muted }]}>
                  {messageText
                    ? splitByPhrases(messageText.trim(), originalPhrases).map((seg, i) =>
                        seg.marked
                          ? <Text key={i} style={styles.diffStrike}>{seg.content}</Text>
                          : <Text key={i}>{seg.content}</Text>
                      )
                    : messageText?.trim()
                  }
                </Text>
              </View>

              {/* Arrow */}
              <View style={styles.arrowRow}>
                <View style={[styles.arrowLine, { backgroundColor: t.border }]} />
                <Text style={[styles.arrowIcon, { color: t.muted }]}>↓</Text>
                <View style={[styles.arrowLine, { backgroundColor: t.border }]} />
              </View>

              {/* AFTER */}
              <Text style={[styles.diffLabel, { color: t.muted }]}>AFTER</Text>
              <View style={[styles.diffBlock, styles.diffBlockAfter, { backgroundColor: t.subtle, borderColor: t.border }]}>
                <Text style={[styles.diffText, { color: t.fg }]}>
                  {feedback!.recommended
                    ? splitByPhrases(feedback!.recommended, suggestionPhrases).map((seg, i) =>
                        seg.marked
                          ? <Text key={i} style={[styles.diffHighlight, { color: t.fg }]}>{seg.content}</Text>
                          : <Text key={i}>{seg.content}</Text>
                      )
                    : feedback!.recommended
                  }
                </Text>
              </View>

              {/* Issue type tags */}
              <View style={styles.tagsRow}>
                {feedback!.issues.map((issue, i) => (
                  <View key={i} style={[styles.tag, { backgroundColor: t.subtle, borderColor: t.border }]}>
                    <Text style={[styles.tagText, { color: t.muted }]}>{issue.type}</Text>
                  </View>
                ))}
              </View>

            </Animated.View>
          )}
        </ScrollView>

        {/* Actions */}
        <View style={styles.btnRow}>
          {isReady && feedback!.recommended && onUseRewrite && (
            <Pressable
              onPress={() => { onUseRewrite(feedback!.recommended!); onClose(); }}
              style={[styles.btnPrimary, { backgroundColor: t.fg }]}
            >
              <Text style={[styles.btnPrimaryText, { color: t.bg }]}>Use this</Text>
            </Pressable>
          )}
          <Pressable onPress={onClose} style={[styles.btnGhost, { borderColor: t.border }]}>
            <Text style={[styles.btnGhostText, { color: t.fg }]}>Done</Text>
          </Pressable>
        </View>

      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: 'rgba(0,0,0,0.36)' },

  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingBottom: 10,
    maxHeight: '88%',           // taller drawer
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1, shadowRadius: 20, elevation: 24,
  },

  handleWrap: { alignItems: 'center', paddingTop: 14, paddingBottom: 6 },
  handle:     { width: 32, height: 3.5, borderRadius: 2 },

  /* Header */
  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 24, paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { fontSize: 18, fontFamily: F.bold, letterSpacing: -0.3 },
  scoreInline: { flexDirection: 'row', alignItems: 'baseline' },
  scoreNum:    { fontSize: 20, fontFamily: F.bold },
  scoreSep:    { fontSize: 13, marginLeft: 1 },
  scoreLevel:  { fontSize: 12, fontFamily: F.medium },

  /* Scroll */
  scroll:        { flexGrow: 0 },
  scrollContent: { padding: 24, paddingBottom: 8 },

  /* Loading */
  loadingState: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 32 },
  loadingText:  { fontSize: 14 },

  /* Success */
  successState: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 28 },
  successMark:  { fontSize: 28, fontFamily: F.regular },
  successTitle: { fontSize: 16, fontFamily: F.semibold },
  successSub:   { fontSize: 13, marginTop: 2 },

  /* Diff */
  diffWrap:  { gap: 8 },
  diffLabel: { fontSize: 9, fontFamily: F.bold, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 2 },

  diffBlock: {
    borderWidth: 1, borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  diffBlockAfter: {
    // slightly thicker border to distinguish from before
    borderWidth: 1.5,
  },
  diffText:      { fontSize: 15, lineHeight: 24 },
  diffStrike:    { textDecorationLine: 'line-through', opacity: 0.45 },
  diffHighlight: { fontFamily: F.bold },

  /* Divider arrow */
  arrowRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 2 },
  arrowLine: { flex: 1, height: StyleSheet.hairlineWidth },
  arrowIcon: { fontSize: 14 },

  /* Issue type tags */
  tagsRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 6 },
  tag:     { borderRadius: 20, borderWidth: 1, paddingHorizontal: 9, paddingVertical: 3 },
  tagText: { fontSize: 10, fontFamily: F.semibold, textTransform: 'uppercase', letterSpacing: 0.5 },

  /* Buttons */
  btnRow: {
    flexDirection: 'row', gap: 10,
    marginHorizontal: 24, marginTop: 12,
  },
  btnPrimary:     { flex: 1, borderRadius: 14, paddingVertical: 13, alignItems: 'center' },
  btnPrimaryText: { fontSize: 15, fontFamily: F.bold },
  btnGhost:       { flex: 1, borderRadius: 14, borderWidth: 1, paddingVertical: 13, alignItems: 'center' },
  btnGhostText:   { fontSize: 15, fontFamily: F.semibold },
});

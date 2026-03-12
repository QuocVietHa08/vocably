import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Sparkles, Wand2, Bookmark, BookmarkCheck, Loader } from 'lucide-react-native';
import { useTheme } from '@/src/theme';
import { F } from '@/src/theme/fonts';
import { BlinkingCursor } from './BlinkingCursor';
import { TypingIndicator } from './TypingIndicator';
import type { BubbleProps, Segment } from './types';
import { parseSegments } from './types';

export function Bubble({ message, showLabel, t, onCheckGrammar, grammarFeedback, onSaveVocab, hasVocab, vocabSaved, onSuggestReply, suggestingReply }: BubbleProps) {
  const isUser        = message.role === 'user';
  const isPlaceholder = isUser && message.streaming;
  const segs          = isUser ? [] : parseSegments(message.text);
  const showActions   = !isPlaceholder && !message.streaming && message.text.trim().length > 1;

  const entering = FadeIn.duration(200);

  const checkColor  = grammarFeedback ? t.accent : t.muted;
  const vocabColor  = vocabSaved ? '#22c55e' : t.muted;

  return (
    <Animated.View entering={entering} style={[styles.bubbleRow, isUser && styles.bubbleRowUser, !showLabel && styles.bubbleRowContinued]}>
      {showLabel && (
        <Text style={[styles.roleLabel, { color: t.muted }, isUser && styles.roleLabelUser]}>
          {isUser ? 'You' : 'Coach'}
        </Text>
      )}
      <View style={[
        styles.bubble,
        isUser
          ? [styles.bubbleUser, { backgroundColor: isPlaceholder ? t.muted : t.fg }, !showLabel && { borderTopRightRadius: 6 }]
          : [styles.bubbleAssistant, { backgroundColor: t.surface, borderColor: t.border }, !showLabel && { borderTopLeftRadius: 6 }],
      ]}>
        {isUser ? (
          isPlaceholder
            ? <TypingIndicator />
            : <Text style={[styles.bubbleText, { color: t.bg }]}>{message.text}</Text>
        ) : (
          <Text style={[styles.bubbleText, { color: t.fg }]}>
            {segs.map((seg, i) => {
              if (seg.kind === 'vocab') return <Text key={i} style={styles.vocabText}> {seg.content} </Text>;
              if (seg.kind === 'correction') return <Text key={i} style={styles.correctionText}>{seg.content}</Text>;
              return <Text key={i}>{seg.content}</Text>;
            })}
            {message.streaming && <BlinkingCursor />}
          </Text>
        )}
      </View>

      {showActions && (isUser ? (
        /* ── User: grammar check ── */
        <View style={styles.bubbleActionsUser}>
          <Pressable
            onPress={onCheckGrammar}
            style={[styles.actionPill, { backgroundColor: t.subtle, borderColor: grammarFeedback ? t.accent : t.border }]}
          >
            {grammarFeedback?.loading
              ? <Loader size={11} color={t.muted} strokeWidth={2.5} />
              : <Sparkles size={11} color={checkColor} strokeWidth={2.5} />
            }
            <Text style={[styles.actionPillText, { color: checkColor }]}>
              {grammarFeedback?.loading ? 'Checking…' : grammarFeedback ? 'Checked' : 'Check'}
            </Text>
          </Pressable>
        </View>
      ) : (
        /* ── Coach: suggest reply + save vocab ── */
        <View style={styles.bubbleActionsAI}>
          <Pressable
            onPress={suggestingReply ? undefined : onSuggestReply}
            style={[styles.actionPill, { backgroundColor: t.subtle, borderColor: t.border }]}
          >
            <Wand2 size={11} color={t.muted} strokeWidth={2.5} />
            <Text style={[styles.actionPillText, { color: t.muted }]}>
              {suggestingReply ? 'Thinking…' : 'Suggest reply'}
            </Text>
          </Pressable>
          {hasVocab && (
            <Pressable
              onPress={onSaveVocab}
              style={[styles.actionPill, { backgroundColor: vocabSaved ? '#22c55e18' : t.subtle, borderColor: vocabSaved ? '#22c55e' : t.border }]}
            >
              {vocabSaved
                ? <BookmarkCheck size={11} color={vocabColor} strokeWidth={2.5} />
                : <Bookmark size={11} color={vocabColor} strokeWidth={2.5} />
              }
              <Text style={[styles.actionPillText, { color: vocabColor }]}>
                {vocabSaved ? 'Saved' : 'Save vocab'}
              </Text>
            </Pressable>
          )}
        </View>
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bubbleRow:          { alignItems: 'flex-start', marginBottom: 20 },
  bubbleRowUser:      { alignItems: 'flex-end' },
  bubbleRowContinued: { marginTop: -12 },
  roleLabel:       { fontSize: 10, fontFamily: F.bold, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 5, marginLeft: 4 },
  roleLabelUser:   { marginLeft: 0, marginRight: 4 },
  bubble:          { maxWidth: '78%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleUser:      { borderRadius: 18, borderBottomRightRadius: 4 },
  bubbleAssistant: {
    borderWidth: 1, borderRadius: 18, borderBottomLeftRadius: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  bubbleText:      { fontSize: 15, lineHeight: 23 },
  vocabText:       { fontFamily: F.bold, color: '#f4511e' },
  correctionText:  { color: '#f4511e', fontStyle: 'italic', textDecorationLine: 'underline' },
  bubbleActionsUser: { flexDirection: 'row', marginTop: 5, gap: 6 },
  bubbleActionsAI:   { flexDirection: 'row', marginTop: 5, gap: 6, flexWrap: 'wrap' },
  actionPill:        { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5 },
  actionPillText:    { fontSize: 11, fontFamily: F.medium },
});

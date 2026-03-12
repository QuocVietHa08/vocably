import React from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { Check, ArrowUp } from 'lucide-react-native';
import { VoiceSphere, type SphereState } from '@/src/components/voice/VoiceSphere';
import { useTheme } from '@/src/theme';
import { F } from '@/src/theme/fonts';
import { STATUS_LABEL } from './constants';

export interface PracticeBottomBarProps {
  stopped:        boolean;
  sphereState:    SphereState;
  audioLevel:     number;
  typeText:       string;
  sendingText:    boolean;
  onChangeText:   (t: string) => void;
  onSendText:     (t: string) => void;
  onStop:         () => void;
  onDone:         () => void;
}

export function PracticeBottomBar({
  stopped,
  sphereState,
  audioLevel,
  typeText,
  sendingText,
  onChangeText,
  onSendText,
  onStop,
  onDone,
}: PracticeBottomBarProps) {
  const t = useTheme();
  const isActive = sphereState === 'listening' || sphereState === 'speaking';

  return (
    <View style={[styles.bottomSection, { backgroundColor: t.bg }]}>
      {/* Sphere + status — floats above the bar using negative top */}
      {!stopped && (
        <View style={styles.sphereFloat} pointerEvents="none">
          <VoiceSphere state={sphereState} audioLevel={audioLevel} size={60} />
          <Text style={[styles.statusText, { color: isActive ? t.fg : t.muted }]}>
            {STATUS_LABEL[sphereState]}
          </Text>
        </View>
      )}

      {/* Input + action button */}
      <View style={styles.inputRow}>
        <TextInput
          style={[styles.textInput, { backgroundColor: t.subtle, borderColor: t.border, color: t.fg }]}
          placeholder={stopped ? 'Session ended' : 'Type a message…'}
          placeholderTextColor={t.muted}
          value={typeText}
          onChangeText={onChangeText}
          returnKeyType="send"
          onSubmitEditing={() => onSendText(typeText)}
          editable={!sendingText && !stopped}
          multiline={false}
        />
        {stopped ? (
          <Pressable onPress={onDone} style={[styles.roundBtn, { backgroundColor: t.accent }]}>
            <Check size={20} color="#fff" strokeWidth={3} />
          </Pressable>
        ) : typeText.trim() ? (
          <Pressable onPress={() => onSendText(typeText)} style={[styles.roundBtn, { backgroundColor: t.accent }]}>
            <ArrowUp size={20} color="#fff" strokeWidth={2.5} />
          </Pressable>
        ) : (
          <Pressable onPress={onStop} style={[styles.roundBtn, styles.roundBtnStop, { backgroundColor: t.dark ? '#3d1515' : '#fee2e2' }]}>
            <View style={styles.stopSquare} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bottomSection: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 10,
  },
  sphereFloat: {
    position: 'absolute',
    top: -78,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 4,
  },
  statusText: { fontSize: 11, fontFamily: F.medium },

  /* Input row */
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, width: '100%',
  },
  textInput: {
    flex: 1, borderRadius: 22, borderWidth: 1,
    paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 14, lineHeight: 20,
  },
  /* Action button (right of input) */
  roundBtn: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  roundBtnStop: {},
  stopSquare:   { width: 14, height: 14, borderRadius: 3, backgroundColor: '#ef4444' },
});

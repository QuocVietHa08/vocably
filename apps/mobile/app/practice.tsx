import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView, Alert,
} from 'react-native';
import { KeyboardStickyView } from 'react-native-keyboard-controller';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { ChevronLeft, Bookmark } from 'lucide-react-native';
import { useTheme } from '@/src/theme';
import { usePurchases } from '@/src/context/PurchasesContext';
import { F } from '@/src/theme/fonts';
import { VoiceSphere, type SphereState } from '@/src/components/voice/VoiceSphere';

/* Components */
import { ConnectingLoader } from '@/src/components/practice/ConnectingLoader';
import { Bubble } from '@/src/components/practice/Bubble';
import { GrammarDrawer } from '@/src/components/practice/GrammarDrawer';
import { PracticeBottomBar } from '@/src/components/practice/PracticeBottomBar';

/* Constants & types */
import {
  BACKEND_URL, WS_URL, SR, WAV_HDR, CHUNK_MS, INSTRUCTIONS, RECORDING_OPTIONS, STATUS_LABEL, pcmToWavBase64, buildConnectChimeBase64,
} from '@/src/components/practice/constants';
import type { Message, GrammarFeedback } from '@/src/components/practice/types';
import { parseSegments } from '@/src/components/practice/types';

/* ─── Main screen ────────────────────────────────────────────────────── */

export default function PracticeScreen() {
  const t         = useTheme();
  const router    = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const { isPro } = usePurchases();

  const [sphereState, setSphereState] = useState<SphereState>('connecting');
  const [audioLevel,  setAudioLevel]  = useState(0);
  const [messages,    setMessages]    = useState<Message[]>([]);
  const [stopped,     setStopped]     = useState(false);
  const [elapsed,     setElapsed]     = useState(0);
  const [topic,       setTopic]       = useState<string | null>(null);
  const [error,       setError]       = useState<string | null>(null);

  const [grammarFeedback, setGrammarFeedback] = useState<Record<string, GrammarFeedback>>({});
  const [vocabSavedIds,   setVocabSavedIds]   = useState<Set<string>>(new Set());
  const [savedVocab,      setSavedVocab]       = useState<string[]>([]);
  const [typeText,        setTypeText]         = useState('');
  const [sendingText,     setSendingText]      = useState(false);
  const [drawerVisible,   setDrawerVisible]    = useState(false);
  const [drawerMsgId,     setDrawerMsgId]      = useState<string | null>(null);
  const [suggestingIds,   setSuggestingIds]    = useState<Set<string>>(new Set());

  const wsRef          = useRef<WebSocket | null>(null);
  const recordingRef   = useRef<Audio.Recording | null>(null);
  const chunkTimerRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedTimerRef= useRef<ReturnType<typeof setInterval> | null>(null);
  const lastByteRef    = useRef(WAV_HDR);
  const audioChunksRef = useRef<string[]>([]);
  const soundRef       = useRef<Audio.Sound | null>(null);
  const seenItemIds    = useRef<Set<string>>(new Set());
  const checkedIds     = useRef<Set<string>>(new Set());
  const stoppedRef     = useRef(false);
  const hasGreeted     = useRef(false);

  /* ── Scroll to bottom — wait a tick for layout to settle ── */
  useEffect(() => {
    const id = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    return () => clearTimeout(id);
  }, [messages]);

  /* ── Clean up on unmount ── */
  useEffect(() => {
    return () => { void cleanUp(); };
  }, []);

  /* ── Connect on mount (with session gate) ── */
  useEffect(() => {
    if (!BACKEND_URL) {
      setError('Service not configured.');
      setSphereState('idle');
      return;
    }

    // Voice practice is completely locked for free users
    if (!isPro) {
      router.replace('/paywall?reason=voice');
      return;
    }

    void connect();

    const t = setInterval(() => setElapsed((n) => n + 1), 1000);
    elapsedTimerRef.current = t;
    return () => clearInterval(t);
  }, []);

  /* ── Audio helpers ── */

  const stopChunkTimer = () => {
    if (chunkTimerRef.current) { clearInterval(chunkTimerRef.current); chunkTimerRef.current = null; }
  };

  const stopRecording = async () => {
    stopChunkTimer();
    if (recordingRef.current) {
      try {
        await recordingRef.current.stopAndUnloadAsync();
      } catch (_) {}
      recordingRef.current = null;
    }
    lastByteRef.current = WAV_HDR;
  };

  const startRecording = async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });

      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync({
        ...RECORDING_OPTIONS,
        isMeteringEnabled: true,
      });

      rec.setOnRecordingStatusUpdate((status) => {
        if (status.metering !== undefined) {
          const lvl = Math.max(0, Math.min(1, (status.metering + 60) / 60));
          setAudioLevel(lvl);
        }
      });

      await rec.startAsync();
      recordingRef.current  = rec;
      lastByteRef.current   = WAV_HDR;

      // Stream audio chunks to OpenAI
      chunkTimerRef.current = setInterval(async () => {
        const uri = rec.getURI();
        if (!uri || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
        try {
          const info = await FileSystem.getInfoAsync(uri);
          if (!info.exists || !('size' in info)) return;
          const currentSize = (info as any).size as number;
          if (currentSize <= lastByteRef.current) return;

          const chunk = await FileSystem.readAsStringAsync(uri, {
            encoding: FileSystem.EncodingType.Base64,
            position: lastByteRef.current,
            length:   currentSize - lastByteRef.current,
          });
          lastByteRef.current = currentSize;

          wsRef.current.send(JSON.stringify({ type: 'input_audio_buffer.append', audio: chunk }));
        } catch (_) {}
      }, CHUNK_MS);

    } catch (e) {
      console.warn('Recording start failed:', e);
    }
  };

  const playConnectChime = async () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true });
      const wavBase64 = buildConnectChimeBase64();
      const fileUri   = FileSystem.cacheDirectory + 'connect_chime.wav';
      await FileSystem.writeAsStringAsync(fileUri, wavBase64, { encoding: FileSystem.EncodingType.Base64 });
      const { sound } = await Audio.Sound.createAsync({ uri: fileUri });
      await sound.playAsync();
      sound.setOnPlaybackStatusUpdate((s) => {
        if (s.isLoaded && s.didJustFinish) void sound.unloadAsync().catch(() => {});
      });
    } catch (_) {}
  };

  const playAudioResponse = async (base64Pcm: string) => {
    try {
      // Switch audio mode for playback
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });

      const wavBase64 = pcmToWavBase64(base64Pcm);
      const fileUri   = FileSystem.cacheDirectory + 'ai_response.wav';
      await FileSystem.writeAsStringAsync(fileUri, wavBase64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }

      const { sound } = await Audio.Sound.createAsync({ uri: fileUri });
      soundRef.current = sound;

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setSphereState('listening');
          void sound.unloadAsync().catch(() => {});
          soundRef.current = null;
          // Resume recording after AI finishes speaking
          if (!stoppedRef.current) void startRecording();
        }
      });

      await sound.setRateAsync(1.5, true); // 1.5× speed, preserve pitch
      await sound.playAsync();
    } catch (e) {
      console.warn('Playback failed:', e);
      setSphereState('listening');
      if (!stoppedRef.current) void startRecording();
    }
  };

  /* ── WebSocket connection ── */

  const connect = async () => {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        Alert.alert('Microphone permission denied', 'Please enable microphone access in Settings.');
        setSphereState('idle');
        return;
      }

      // Fetch a short-lived ephemeral token from our backend — keeps API key off the device
      const tokenRes = await fetch(`${BACKEND_URL}/api/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voice: 'alloy' }),
      });
      if (!tokenRes.ok) {
        setError('Could not start session. Please try again.');
        setSphereState('idle');
        return;
      }
      const tokenData = await tokenRes.json();
      const ephemeralKey: string = tokenData?.client_secret?.value ?? '';
      if (!ephemeralKey) {
        setError('Could not start session. Please try again.');
        setSphereState('idle');
        return;
      }

      const ws = new (WebSocket as any)(
        WS_URL,
        [],
        { headers: { Authorization: `Bearer ${ephemeralKey}`, 'OpenAI-Beta': 'realtime=v1' } },
      ) as WebSocket;

      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({
          type: 'session.update',
          session: {
            modalities: ['text', 'audio'],
            instructions: INSTRUCTIONS,
            voice: 'alloy',
            input_audio_format:  'pcm16',
            output_audio_format: 'pcm16',
            input_audio_transcription: { model: 'whisper-1' },
            turn_detection: {
              type:                  'server_vad',
              threshold:             0.5,
              prefix_padding_ms:     300,
              silence_duration_ms:   700,
            },
          },
        }));
      };

      ws.onmessage = (event: MessageEvent) => {
        if (stoppedRef.current) return;
        const msg = JSON.parse(event.data as string);
        handleServerEvent(msg);
      };

      ws.onerror = (e: Event) => {
        console.warn('WebSocket error', e);
        setError('Connection error — please check your network and try again.');
        setSphereState('idle');
      };

      ws.onclose = () => {
        if (!stoppedRef.current) setSphereState('idle');
      };

    } catch (e) {
      console.warn('Connect failed:', e);
      setError('Could not connect. Please try again.');
      setSphereState('idle');
    }
  };

  /* ── Server event handler ── */

  const handleServerEvent = useCallback((msg: any) => {
    switch (msg.type) {

      case 'session.created':
        // wait for session.updated which confirms our instructions are applied
        break;

      case 'session.updated':
        if (elapsedTimerRef.current) {
          clearInterval(elapsedTimerRef.current);
          elapsedTimerRef.current = null;
        }
        if (!hasGreeted.current && wsRef.current?.readyState === WebSocket.OPEN) {
          hasGreeted.current = true;
          void playConnectChime();
          // Ask the AI to open the conversation with a question
          wsRef.current.send(JSON.stringify({ type: 'response.create' }));
          // Recording starts automatically once the AI finishes speaking
        } else {
          setSphereState('listening');
          void startRecording();
        }
        break;

      /* User speech detection */
      case 'input_audio_buffer.speech_started':
        setSphereState('listening');
        setAudioLevel(0.8);
        // Add placeholder immediately so user message always appears ABOVE the AI reply
        setMessages((prev) => [...prev, {
          id:        `user-placeholder-${Date.now()}`,
          role:      'user',
          text:      '…',
          streaming: true,
        }]);
        break;

      case 'input_audio_buffer.speech_stopped':
        setAudioLevel(0);
        break;

      /* AI transcript streaming */
      case 'response.audio_transcript.delta':
        setMessages((prev) => {
          // Find the current streaming AI bubble (scan backwards)
          for (let i = prev.length - 1; i >= 0; i--) {
            if (prev[i].role === 'assistant' && prev[i].streaming) {
              const updated = [...prev];
              updated[i] = { ...updated[i], text: updated[i].text + (msg.delta ?? '') };
              return updated;
            }
          }
          // No streaming bubble — create new one
          return [...prev, {
            id:        `ai-${Date.now()}`,
            role:      'assistant',
            text:      msg.delta ?? '',
            streaming: true,
          }];
        });
        break;

      case 'response.audio_transcript.done':
        setMessages((prev) => {
          for (let i = prev.length - 1; i >= 0; i--) {
            if (prev[i].role === 'assistant' && prev[i].streaming) {
              const updated = [...prev];
              updated[i] = { ...updated[i], text: msg.transcript ?? updated[i].text, streaming: false };
              return updated;
            }
          }
          return prev;
        });
        // Detect topic from first AI message
        if (messages.length === 0 && msg.transcript) {
          const m = msg.transcript.match(/\b(environment|technology|health|education|society|culture|travel|work|family|sport)\b/i);
          if (m) setTopic(m[1].toLowerCase());
        }
        break;

      /* AI audio streaming */
      case 'response.audio.delta':
        setSphereState('speaking');
        void stopRecording(); // pause mic while AI speaks
        if (msg.delta) audioChunksRef.current.push(msg.delta);
        break;

      case 'response.audio.done':
        if (audioChunksRef.current.length > 0) {
          const combined = audioChunksRef.current.join('');
          audioChunksRef.current = [];
          void playAudioResponse(combined);
        }
        break;

      /* User transcript — fill in the placeholder that was added on speech_started */
      case 'conversation.item.input_audio_transcription.completed': {
        const itemId    = msg.item_id as string;
        if (seenItemIds.current.has(itemId)) break;
        seenItemIds.current.add(itemId);
        const transcript = (msg.transcript as string)?.trim();
        if (!transcript) break;

        setMessages((prev) => {
          // Replace the most recent user placeholder with the real transcript
          for (let i = prev.length - 1; i >= 0; i--) {
            if (prev[i].role === 'user' && prev[i].streaming) {
              const updated = [...prev];
              updated[i] = { id: itemId, role: 'user', text: transcript, streaming: false };
              return updated;
            }
          }
          // No placeholder found (edge case) — append normally
          return [...prev, { id: itemId, role: 'user', text: transcript, streaming: false }];
        });
        break;
      }

      case 'error':
        console.warn('Realtime API error:', msg.error);
        break;
    }
  }, [messages]);

  /* ── Message actions ── */

  const checkGrammar = useCallback(async (messageId: string, text: string) => {
    if (checkedIds.current.has(messageId)) return;
    checkedIds.current.add(messageId);
    setGrammarFeedback((prev) => ({ ...prev, [messageId]: { loading: true, issues: [], score: 0 } }));
    try {
      const res  = await fetch(`${BACKEND_URL}/api/chat`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model:           'gpt-4o-mini',
          response_format: { type: 'json_object' },
          messages: [
            {
              role:    'user',
              content: `Analyze this IELTS speaking response. Return ONLY valid JSON:
{"score":<number 1-9>,"recommended":"<full corrected sentence>","issues":[{"text":"<original phrase>","suggestion":"<improved phrase>","type":"grammar|vocab|style"}]}
Rules: score is IELTS band 1-9. recommended is the full sentence rewritten naturally. Limit issues to 3 most important. Empty issues array and omit recommended if no issues.
Text to analyze:`,
            },
            { role: 'user', content: text },
          ],
        }),
      });
      const data   = await res.json();
      const result = JSON.parse(data.choices[0].message.content);
      setGrammarFeedback((prev) => ({
        ...prev,
        [messageId]: { loading: false, issues: result.issues ?? [], score: result.score ?? 5, recommended: result.recommended },
      }));
    } catch {
      setGrammarFeedback((prev) => ({
        ...prev,
        [messageId]: { loading: false, issues: [], score: 0 },
      }));
    }
  }, []);

  const saveVocabFromMessage = useCallback((message: Message) => {
    const words = parseSegments(message.text)
      .filter((s) => s.kind === 'vocab')
      .map((s) => s.content.trim());
    if (words.length === 0) return;
    setSavedVocab((prev) => [...prev, ...words.filter((w) => !prev.includes(w))]);
    setVocabSavedIds((prev) => new Set([...prev, message.id]));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  const openGrammarDrawer = useCallback((messageId: string, text: string) => {
    setDrawerMsgId(messageId);
    setDrawerVisible(true);
    if (!checkedIds.current.has(messageId)) void checkGrammar(messageId, text);
  }, [checkGrammar]);

  const closeDrawer = useCallback(() => setDrawerVisible(false), []);

  const suggestReply = useCallback(async (messageId: string, coachText: string) => {
    setSuggestingIds((prev) => new Set([...prev, messageId]));
    try {
      const res = await fetch(`${BACKEND_URL}/api/chat`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role:    'user',
              content: 'You are helping an IELTS student practise speaking. The coach just said the following. Write a natural, fluent sample response the student could say. 2–4 sentences. Conversational IELTS speaking style. Return ONLY the response text, no explanation or quotes. Coach message:',
            },
            { role: 'user', content: coachText },
          ],
        }),
      });
      const data       = await res.json();
      const suggestion = data.choices?.[0]?.message?.content?.trim() ?? '';
      if (suggestion) {
        setTypeText(suggestion);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (_) {}
    setSuggestingIds((prev) => { const n = new Set(prev); n.delete(messageId); return n; });
  }, []);


  const sendTextMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    setSendingText(true);
    const itemId = `typed-${Date.now()}`;
    // Add to local messages immediately
    setMessages((prev) => [...prev, { id: itemId, role: 'user', text: trimmed, streaming: false }]);
    setTypeText('');
    // Send via Realtime API
    wsRef.current.send(JSON.stringify({
      type: 'conversation.item.create',
      item: { type: 'message', role: 'user', content: [{ type: 'input_text', text: trimmed }] },
    }));
    wsRef.current.send(JSON.stringify({ type: 'response.create' }));
    setSendingText(false);
  }, []);

  /* ── Stop session ── */

  const cleanUp = async () => {
    stoppedRef.current = true;
    stopChunkTimer();
    await stopRecording();
    if (soundRef.current) {
      try { await soundRef.current.stopAsync(); await soundRef.current.unloadAsync(); } catch (_) {}
      soundRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (elapsedTimerRef.current) { clearInterval(elapsedTimerRef.current); elapsedTimerRef.current = null; }
  };

  const handleStop = useCallback(async () => {
    setSphereState('idle');
    setStopped(true);
    await cleanUp();
  }, []);

  const handleBack = useCallback(async () => {
    void handleStop();
    router.back();
  }, [handleStop, router]);

  /* ── Render ── */

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.bg }]}>
      <View style={[styles.container, { backgroundColor: t.bg }]}>

          {/* Header */}
          <View style={[styles.header, { borderBottomColor: t.border }]}>
            <Pressable onPress={handleBack} style={styles.backBtn}>
              <ChevronLeft size={20} color={t.muted} strokeWidth={2.5} />
            </Pressable>
            <View style={styles.headerRight}>
              {savedVocab.length > 0 && (
                <Animated.View entering={FadeIn} style={[styles.vocabBadge, { backgroundColor: t.subtle, borderColor: t.border }]}>
                  <Bookmark size={12} color={t.muted} strokeWidth={2.5} />
                  <Text style={[styles.vocabBadgeText, { color: t.muted }]}>{savedVocab.length}</Text>
                </Animated.View>
              )}
              {topic && (
                <Animated.Text entering={FadeIn} style={[styles.topicChip, { color: t.muted }]}>
                  {topic.toUpperCase()}
                </Animated.Text>
              )}
            </View>
          </View>

          {/* Error banner */}
          {error && (
            <View style={[styles.errorBanner, { backgroundColor: '#fff3f0', borderColor: '#f4511e' }]}>
              <Text style={{ color: '#f4511e', fontSize: 13, lineHeight: 18 }}>⚠️ {error}</Text>
            </View>
          )}

          {/* Conversation */}
          <ScrollView
            ref={scrollRef}
            style={styles.scroll}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: 80 }]}
            showsVerticalScrollIndicator={false}
          >
            {messages.length === 0 && sphereState === 'connecting' && !error ? (
              <ConnectingLoader elapsed={elapsed} t={t} />
            ) : messages.length === 0 && !error ? (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyIcon, { opacity: 0.3 }]}>💬</Text>
                <Text style={[styles.emptyText, { color: t.muted }]}>
                  Your conversation will appear here.
                </Text>
                <Text style={[styles.emptyHint, { color: t.muted }]}>
                  🟠 orange = vocabulary · italic = correction
                </Text>
              </View>
            ) : (
              messages.map((msg, i) => {
                const hasVocab = msg.role === 'assistant' && parseSegments(msg.text).some((s) => s.kind === 'vocab');
                return (
                  <Bubble
                    key={msg.id}
                    message={msg}
                    showLabel={i === 0 || messages[i - 1].role !== msg.role}
                    t={t}
                    onCheckGrammar={msg.role === 'user' ? () => openGrammarDrawer(msg.id, msg.text) : undefined}
                    grammarFeedback={grammarFeedback[msg.id]}
                    onSaveVocab={msg.role === 'assistant' ? () => saveVocabFromMessage(msg) : undefined}
                    hasVocab={hasVocab}
                    vocabSaved={vocabSavedIds.has(msg.id)}
                    onSuggestReply={msg.role === 'assistant' ? () => suggestReply(msg.id, msg.text) : undefined}
                    suggestingReply={suggestingIds.has(msg.id)}
                  />
                );
              })
            )}
          </ScrollView>

          {/* Bottom section — sticks above keyboard automatically */}
          <KeyboardStickyView offset={{ closed: 0, opened: 0 }}>
            <PracticeBottomBar
              stopped={stopped}
              sphereState={sphereState}
              audioLevel={audioLevel}
              typeText={typeText}
              sendingText={sendingText}
              onChangeText={setTypeText}
              onSendText={sendTextMessage}
              onStop={handleStop}
              onDone={handleBack}
            />
          </KeyboardStickyView>

          {/* Grammar drawer — absolute overlay */}
          <GrammarDrawer
            visible={drawerVisible}
            feedback={drawerMsgId ? (grammarFeedback[drawerMsgId] ?? null) : null}
            messageText={drawerMsgId ? (messages.find((m) => m.id === drawerMsgId)?.text ?? null) : null}
            onClose={closeDrawer}
            onUseRewrite={setTypeText}
            t={t}
          />
      </View>
    </SafeAreaView>
  );
}

/* ─── Styles ─────────────────────────────────────────────────────────── */

const styles = StyleSheet.create({
  safe:      { flex: 1 },
  container: { flex: 1 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12, borderBottomWidth: 1,
  },
  backBtn:     { padding: 4 },
  backText:    { fontSize: 14, fontFamily: F.regular },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  topicChip:   { fontSize: 10, letterSpacing: 0.6, fontFamily: F.semibold },

  errorBanner: {
    marginHorizontal: 16, marginTop: 12, padding: 12,
    borderRadius: 10, borderWidth: 1,
  },

  scroll:        { flex: 1, paddingBottom: 20 },
  scrollContent: { padding: 20, flexGrow: 1 },

  emptyState:  { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingTop: 80 },
  emptyIcon:   { fontSize: 36 },
  emptyText:   { fontSize: 13, textAlign: 'center' },
  emptyHint:   { fontSize: 11, textAlign: 'center', opacity: 0.6 },

  /* Vocab badge in header */
  vocabBadge:     { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 12, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3 },
  vocabBadgeText: { fontSize: 10, fontFamily: F.semibold },
});

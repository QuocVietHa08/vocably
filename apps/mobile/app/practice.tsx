import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import Animated, {
  FadeIn, FadeInUp, useSharedValue, useAnimatedStyle,
  withTiming, withRepeat, withSequence, withSpring, Easing,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useTheme } from '@/src/theme';
import { VoiceSphere, type SphereState } from '@/src/components/voice/VoiceSphere';

/* ─── Config ─────────────────────────────────────────────────────────── */

const API_KEY  = process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? '';
const WS_URL   = 'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17';
const SR       = 24000;   // sample rate
const WAV_HDR  = 44;      // WAV header bytes to skip when reading PCM
const CHUNK_MS = 100;     // send audio every N ms

const INSTRUCTIONS = `You are a friendly and encouraging IELTS speaking coach.
Have natural, flowing conversations to help the user practise English speaking.
When you notice a vocabulary opportunity, wrap the word in **double asterisks** like **vocabulary**.
When correcting a phrase, wrap the correction in *single asterisks* like *corrected phrase*.
Keep responses warm, concise, and conversational. Start by introducing yourself briefly and asking what topic the user would like to practise today.`;

const RECORDING_OPTIONS: Audio.RecordingOptions = {
  android: {
    extension: '.wav',
    outputFormat: Audio.AndroidOutputFormat.DEFAULT,
    audioEncoder: Audio.AndroidAudioEncoder.DEFAULT,
    sampleRate: SR,
    numberOfChannels: 1,
    bitRate: SR * 16,
  },
  ios: {
    extension: '.wav',
    outputFormat: Audio.IOSOutputFormat.LINEARPCM,
    audioQuality: Audio.IOSAudioQuality.HIGH,
    sampleRate: SR,
    numberOfChannels: 1,
    bitRate: SR * 16,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: { mimeType: 'audio/wav', bitsPerSecond: SR * 16 },
};

/* ─── WAV header builder ─────────────────────────────────────────────── */

function pcmToWavBase64(base64Pcm: string, sampleRate = SR, channels = 1): string {
  const bin    = atob(base64Pcm);
  const pcmLen = bin.length;
  const buf    = new ArrayBuffer(44 + pcmLen);
  const dv     = new DataView(buf);
  const bytes  = new Uint8Array(buf);

  const ws = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) dv.setUint8(off + i, s.charCodeAt(i));
  };

  ws(0, 'RIFF');
  dv.setUint32(4,  36 + pcmLen, true);
  ws(8, 'WAVE');
  ws(12, 'fmt ');
  dv.setUint32(16, 16, true);
  dv.setUint16(20, 1, true);
  dv.setUint16(22, channels, true);
  dv.setUint32(24, sampleRate, true);
  dv.setUint32(28, sampleRate * channels * 2, true);
  dv.setUint16(32, channels * 2, true);
  dv.setUint16(34, 16, true);
  ws(36, 'data');
  dv.setUint32(40, pcmLen, true);

  for (let i = 0; i < pcmLen; i++) bytes[44 + i] = bin.charCodeAt(i);

  let out = '';
  for (let i = 0; i < bytes.length; i++) out += String.fromCharCode(bytes[i]);
  return btoa(out);
}

/* ─── Types ──────────────────────────────────────────────────────────── */

interface Message {
  id:        string;
  role:      'user' | 'assistant';
  text:      string;
  streaming: boolean;
}

type Segment =
  | { kind: 'text';       content: string }
  | { kind: 'vocab';      content: string }
  | { kind: 'correction'; content: string };

function parseSegments(text: string): Segment[] {
  const segs: Segment[] = [];
  const re = /\*\*(.+?)\*\*|\*(.+?)\*/g;
  let last = 0, m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) segs.push({ kind: 'text', content: text.slice(last, m.index) });
    if (m[1] !== undefined) segs.push({ kind: 'vocab',      content: m[1] });
    if (m[2] !== undefined) segs.push({ kind: 'correction', content: m[2] });
    last = m.index + m[0].length;
  }
  if (last < text.length) segs.push({ kind: 'text', content: text.slice(last) });
  return segs;
}

const STATUS_LABEL: Record<SphereState, string> = {
  idle:       'Ready',
  connecting: 'Connecting…',
  listening:  'Listening',
  speaking:   'Speaking',
};

/* ─── Sub-components ─────────────────────────────────────────────────── */

function BlinkingCursor() {
  const op = useSharedValue(1);
  useEffect(() => {
    op.value = withRepeat(
      withSequence(
        withTiming(1,   { duration: 0 }),
        withTiming(1,   { duration: 420 }),
        withTiming(0,   { duration: 180, easing: Easing.out(Easing.quad) }),
        withTiming(0,   { duration: 300 }),
        withTiming(1,   { duration: 180, easing: Easing.in(Easing.quad) }),
      ),
      -1, false,
    );
  }, []);
  const style = useAnimatedStyle(() => ({ opacity: op.value }));
  return <Animated.Text style={[{ fontSize: 14, color: '#f4511e' }, style]}>▌</Animated.Text>;
}

function Bubble({ message, t }: { message: Message; t: ReturnType<typeof useTheme> }) {
  const isUser = message.role === 'user';
  const segs   = isUser ? [] : parseSegments(message.text);

  // Spring entrance: slide up + scale in from slightly below
  const entering = isUser
    ? FadeInUp.springify().damping(18).stiffness(200).withInitialValues({ transform: [{ translateY: 16 }, { scale: 0.92 }], opacity: 0 })
    : FadeInUp.springify().damping(16).stiffness(180).withInitialValues({ transform: [{ translateY: 20 }, { scale: 0.9 }], opacity: 0 });

  return (
    <Animated.View entering={entering} style={[styles.bubbleRow, isUser && styles.bubbleRowUser]}>
      <Text style={[styles.roleLabel, { color: t.muted }, isUser && styles.roleLabelUser]}>
        {isUser ? 'You' : 'Coach'}
      </Text>
      <View style={[
        styles.bubble,
        isUser
          ? [styles.bubbleUser,      { backgroundColor: t.fg }]
          : [styles.bubbleAssistant, { backgroundColor: t.surface, borderColor: t.border }],
      ]}>
        {isUser ? (
          <Text style={[styles.bubbleText, { color: t.bg }]}>{message.text}</Text>
        ) : (
          <Text style={[styles.bubbleText, { color: t.fg }]}>
            {segs.map((seg, i) => {
              if (seg.kind === 'vocab')      return (
                <Text key={i} style={{ fontWeight: '700', color: '#f4511e' }}> {seg.content} </Text>
              );
              if (seg.kind === 'correction') return (
                <Text key={i} style={{ color: '#f4511e', fontStyle: 'italic', textDecorationLine: 'underline' }}>
                  {seg.content}
                </Text>
              );
              return <Text key={i}>{seg.content}</Text>;
            })}
            {message.streaming && <BlinkingCursor />}
          </Text>
        )}
      </View>
    </Animated.View>
  );
}

function PulsingDot({ delay, color }: { delay: number; color: string }) {
  const ty = useSharedValue(0);
  useEffect(() => {
    const timer = setTimeout(() => {
      ty.value = withRepeat(
        withSequence(withTiming(-9, { duration: 400 }), withTiming(0, { duration: 400 })),
        -1, false,
      );
    }, delay);
    return () => clearTimeout(timer);
  }, [delay]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: ty.value }] }));
  return <Animated.View style={[styles.dot, { backgroundColor: color }, style]} />;
}

function ConnectingLoader({ elapsed, t }: { elapsed: number; t: ReturnType<typeof useTheme> }) {
  const msgs = ['Getting your coach ready…', 'Warming up the microphone…', 'Almost there…', 'Your coach is ready!'];
  return (
    <Animated.View entering={FadeIn.duration(300)} style={styles.loadingContainer}>
      <View style={styles.dotsRow}>
        {[0, 1, 2].map((i) => <PulsingDot key={i} delay={i * 200} color={t.accent} />)}
      </View>
      <Animated.Text key={Math.min(elapsed, 3)} entering={FadeInUp.duration(280)}
        style={[styles.loadingTitle, { color: t.fg }]}>
        {msgs[Math.min(elapsed, 3)]}
      </Animated.Text>
      <Text style={[styles.loadingSubtitle, { color: t.muted }]}>This usually takes a few seconds</Text>
      <View style={[styles.progressBg, { backgroundColor: t.subtle }]}>
        <Animated.View style={[styles.progressFill, {
          backgroundColor: t.accent,
          width: `${Math.min((elapsed / 5) * 100, 92)}%`,
        }]} />
      </View>
      {elapsed >= 2 && (
        <Animated.Text entering={FadeIn.duration(400)} style={[styles.tip, { color: t.muted }]}>
          💡 Speak naturally — your coach will follow your pace and correct mistakes gently.
        </Animated.Text>
      )}
    </Animated.View>
  );
}

/* ─── Main screen ────────────────────────────────────────────────────── */

export default function PracticeScreen() {
  const t         = useTheme();
  const router    = useRouter();
  const scrollRef = useRef<ScrollView>(null);

  const [sphereState, setSphereState] = useState<SphereState>('connecting');
  const [audioLevel,  setAudioLevel]  = useState(0);
  const [messages,    setMessages]    = useState<Message[]>([]);
  const [stopped,     setStopped]     = useState(false);
  const [elapsed,     setElapsed]     = useState(0);
  const [topic,       setTopic]       = useState<string | null>(null);
  const [error,       setError]       = useState<string | null>(null);

  const wsRef          = useRef<WebSocket | null>(null);
  const recordingRef   = useRef<Audio.Recording | null>(null);
  const chunkTimerRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedTimerRef= useRef<ReturnType<typeof setInterval> | null>(null);
  const lastByteRef    = useRef(WAV_HDR);
  const audioChunksRef = useRef<string[]>([]);
  const soundRef       = useRef<Audio.Sound | null>(null);
  const seenItemIds    = useRef<Set<string>>(new Set());
  const stoppedRef     = useRef(false);

  /* ── Scroll to bottom ── */
  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  /* ── Clean up on unmount ── */
  useEffect(() => {
    return () => { void cleanUp(); };
  }, []);

  /* ── Connect on mount ── */
  useEffect(() => {
    if (!API_KEY) {
      setError('Missing EXPO_PUBLIC_OPENAI_API_KEY in apps/mobile/.env');
      setSphereState('idle');
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

      const ws = new (WebSocket as any)(
        WS_URL,
        [],
        { headers: { Authorization: `Bearer ${API_KEY}`, 'OpenAI-Beta': 'realtime=v1' } },
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
        setError('Connection error — check your API key and network.');
        setSphereState('idle');
      };

      ws.onclose = () => {
        if (!stoppedRef.current) setSphereState('idle');
      };

    } catch (e) {
      console.warn('Connect failed:', e);
      setError('Could not connect to OpenAI. Check your API key.');
      setSphereState('idle');
    }
  };

  /* ── Server event handler ── */

  const handleServerEvent = useCallback((msg: any) => {
    switch (msg.type) {

      case 'session.created':
      case 'session.updated':
        if (elapsedTimerRef.current) {
          clearInterval(elapsedTimerRef.current);
          elapsedTimerRef.current = null;
        }
        setSphereState('listening');
        void startRecording();
        break;

      /* User speech detection */
      case 'input_audio_buffer.speech_started':
        setSphereState('listening');
        setAudioLevel(0.8);
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

      /* User transcript */
      case 'conversation.item.input_audio_transcription.completed': {
        const itemId = msg.item_id as string;
        if (seenItemIds.current.has(itemId)) break;
        seenItemIds.current.add(itemId);
        const transcript = (msg.transcript as string)?.trim();
        if (transcript) {
          setMessages((prev) => [...prev, {
            id:        itemId,
            role:      'user',
            text:      transcript,
            streaming: false,
          }]);
        }
        break;
      }

      case 'error':
        console.warn('Realtime API error:', msg.error);
        break;
    }
  }, [messages]);

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

  const isActive = sphereState === 'listening' || sphereState === 'speaking';

  /* ── Render ── */

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.bg }]}>
      <View style={[styles.container, { backgroundColor: t.bg }]}>

        {/* Header */}
        <View style={[styles.header, { borderBottomColor: t.border }]}>
          <Pressable onPress={() => { void handleStop(); router.back(); }} style={styles.backBtn}>
            <Text style={[styles.backText, { color: t.muted }]}>← Back</Text>
          </Pressable>
          <View style={styles.headerRight}>
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
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 20 }]}
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
            messages.map((msg) => <Bubble key={msg.id} message={msg} t={t} />)
          )}
        </ScrollView>

        {/* Bottom bar */}
        <View style={[styles.bottomBar, { borderTopColor: t.border }]}>
          <Text style={[styles.statusText, { color: isActive && !stopped ? t.fg : t.muted }]}>
            {stopped ? 'Ended' : STATUS_LABEL[sphereState]}
          </Text>

          <VoiceSphere state={stopped ? 'idle' : sphereState} audioLevel={audioLevel} size={80} />

          {!stopped ? (
            <Pressable onPress={handleStop} style={[styles.stopBtn, { borderColor: t.border }]}>
              <View style={[styles.stopIcon, { backgroundColor: t.muted }]} />
              <Text style={[styles.stopText, { color: t.muted }]}>Stop</Text>
            </Pressable>
          ) : (
            <Pressable onPress={() => router.back()} style={[styles.doneBtn, { backgroundColor: t.accent }]}>
              <Text style={styles.doneBtnText}>Done</Text>
            </Pressable>
          )}
        </View>
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
  backText:    { fontSize: 14 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  topicChip:   { fontSize: 10, letterSpacing: 0.6, fontWeight: '600' },

  errorBanner: {
    marginHorizontal: 16, marginTop: 12, padding: 12,
    borderRadius: 10, borderWidth: 1,
  },

  scroll:        { flex: 1 },
  scrollContent: { padding: 20, flexGrow: 1 },

  bubbleRow:     { alignItems: 'flex-start', marginBottom: 16 },
  bubbleRowUser: { alignItems: 'flex-end' },
  roleLabel:     { fontSize: 10, fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 4, marginLeft: 2 },
  roleLabelUser: { marginLeft: 0, marginRight: 2 },
  bubble:        { maxWidth: '80%', borderRadius: 16, padding: 12 },
  bubbleUser:    { borderRadius: 16, borderBottomRightRadius: 3 },
  bubbleAssistant: { borderWidth: 1, borderRadius: 16, borderBottomLeftRadius: 3 },
  bubbleText:    { fontSize: 14, lineHeight: 22 },

  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20, paddingTop: 60 },
  dotsRow:    { flexDirection: 'row', gap: 10 },
  dot:        { width: 8, height: 8, borderRadius: 4 },
  loadingTitle:    { fontSize: 16, fontWeight: '600', textAlign: 'center' },
  loadingSubtitle: { fontSize: 13, textAlign: 'center' },
  progressBg:  { width: 180, height: 3, borderRadius: 99, overflow: 'hidden' },
  progressFill:{ height: '100%', borderRadius: 99 },
  tip:         { fontSize: 12, textAlign: 'center', maxWidth: 260, lineHeight: 20, paddingHorizontal: 16 },

  emptyState:  { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingTop: 80 },
  emptyIcon:   { fontSize: 36 },
  emptyText:   { fontSize: 13, textAlign: 'center' },
  emptyHint:   { fontSize: 11, textAlign: 'center', opacity: 0.6 },

  bottomBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 24, paddingVertical: 16, paddingBottom: 24, borderTopWidth: 1,
  },
  statusText: { fontSize: 12, fontWeight: '500', width: 70 },
  stopBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
    width: 70, justifyContent: 'center',
  },
  stopIcon:    { width: 7, height: 7, borderRadius: 1.5 },
  stopText:    { fontSize: 12, fontWeight: '500' },
  doneBtn:     { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, width: 70, alignItems: 'center' },
  doneBtnText: { color: '#fff', fontWeight: '600', fontSize: 12 },
});

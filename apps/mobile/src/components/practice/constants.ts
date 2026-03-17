import { Audio } from 'expo-av';
import type { SphereState } from '@/src/components/voice/VoiceSphere';

/* ─── Config ─────────────────────────────────────────────────────────── */

export const BACKEND_URL = (process.env.EXPO_PUBLIC_BACKEND_URL ?? '').replace(/\/$/, '');
export const WS_URL = 'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17';
export const SR = 24000;   // sample rate
export const WAV_HDR = 44;      // WAV header bytes to skip when reading PCM
export const CHUNK_MS = 100;     // send audio every N ms

export const INSTRUCTIONS = `You are a friendly and encouraging IELTS speaking coach.
Have natural, flowing conversations to help the user practise English speaking.
When you notice a vocabulary opportunity, wrap the word in **double asterisks** like **vocabulary**.
When correcting a phrase, wrap the correction in *single asterisks* like *corrected phrase*.
Keep responses warm, concise, and conversational.

You always speak first. Open every session by suggesting 3 specific IELTS topics and asking which one the user wants to practise — always include a follow-up question about the chosen topic to get them talking immediately.

Example opening: "Hi! Let's practise your IELTS speaking today. I have three topics for you — technology and social media, environmental challenges, or the role of education in modern society. Which one interests you? And once you pick, I'll ask you a Part 2-style question to get started!"

Always vary the 3 suggested topics each session. After the user picks a topic, immediately ask them a specific IELTS Part 2 question about it (e.g. "Describe a time when technology helped you solve a problem. You have one minute to prepare, then speak for up to two minutes."). Never wait for the user to go first.`;

export const RECORDING_OPTIONS: Audio.RecordingOptions = {
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

export const STATUS_LABEL: Record<SphereState, string> = {
  idle:       'Ready',
  connecting: 'Connecting…',
  listening:  'Listening',
  speaking:   'Speaking',
};

/* ─── Connect chime — C5 → E5 → G5 arpeggio with bell-like decay ────── */
//
// Each note: 10 ms soft attack, then exponential decay (sounds like a mallet chime).
// A weak second harmonic is mixed in to add warmth.
// Notes start 120 ms apart so they overlap slightly like a real arpeggio.

export function buildConnectChimeBase64(sampleRate = SR): string {
  const notes = [
    { freq: 523.25, startMs:   0, durationMs: 320 }, // C5
    { freq: 659.25, startMs: 110, durationMs: 320 }, // E5
    { freq: 783.99, startMs: 220, durationMs: 380 }, // G5  (longer tail)
  ];

  const totalMs      = 220 + 380;                    // last note start + its duration
  const totalSamples = Math.floor(sampleRate * totalMs / 1000);
  const pcm          = new Float32Array(totalSamples); // accumulate all notes here

  const attackMs  = 10;
  const decayRate = 9;  // higher = faster bell decay

  for (const note of notes) {
    const startSample    = Math.floor(sampleRate * note.startMs    / 1000);
    const durationSamples= Math.floor(sampleRate * note.durationMs / 1000);
    const attackSamples  = Math.floor(sampleRate * attackMs        / 1000);

    for (let i = 0; i < durationSamples; i++) {
      const t   = i / sampleRate;
      // Bell envelope: short linear attack + exponential decay
      const env = i < attackSamples
        ? i / attackSamples
        : Math.exp(-decayRate * (i - attackSamples) / sampleRate);

      // Fundamental + subtle second harmonic for warmth
      const wave = Math.sin(2 * Math.PI * note.freq * t)
                 + 0.18 * Math.sin(2 * Math.PI * note.freq * 2 * t);

      const idx = startSample + i;
      if (idx < totalSamples) pcm[idx] += 0.26 * env * wave;
    }
  }

  // Convert float PCM → 16-bit WAV
  const buf   = new ArrayBuffer(44 + totalSamples * 2);
  const dv    = new DataView(buf);
  const bytes = new Uint8Array(buf);

  const ws = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) dv.setUint8(off + i, s.charCodeAt(i));
  };
  ws(0, 'RIFF');  dv.setUint32(4, 36 + totalSamples * 2, true);
  ws(8, 'WAVE');  ws(12, 'fmt ');
  dv.setUint32(16, 16, true);  dv.setUint16(20, 1, true);
  dv.setUint16(22, 1, true);   dv.setUint32(24, sampleRate, true);
  dv.setUint32(28, sampleRate * 2, true);
  dv.setUint16(32, 2, true);   dv.setUint16(34, 16, true);
  ws(36, 'data'); dv.setUint32(40, totalSamples * 2, true);

  for (let i = 0; i < totalSamples; i++) {
    const s = Math.max(-1, Math.min(1, pcm[i]));
    dv.setInt16(44 + i * 2, Math.round(s * 32767), true);
  }

  let out = '';
  for (let i = 0; i < bytes.length; i++) out += String.fromCharCode(bytes[i]);
  return btoa(out);
}

/* ─── WAV header builder ─────────────────────────────────────────────── */

export function pcmToWavBase64(base64Pcm: string, sampleRate = SR, channels = 1): string {
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

import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';

const API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? '';
const TTS_URL = 'https://api.openai.com/v1/audio/speech';

export type OpenAIVoice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';

export const VOICE_OPTIONS: { value: OpenAIVoice; label: string; description: string }[] = [
  { value: 'alloy',   label: 'Alloy',   description: 'Neutral & balanced' },
  { value: 'echo',    label: 'Echo',    description: 'Warm & confident' },
  { value: 'fable',   label: 'Fable',   description: 'Expressive & British' },
  { value: 'onyx',    label: 'Onyx',    description: 'Deep & authoritative' },
  { value: 'nova',    label: 'Nova',    description: 'Friendly & upbeat' },
  { value: 'shimmer', label: 'Shimmer', description: 'Clear & gentle' },
];

// Simple in-memory cache to avoid re-fetching the same text
const cache = new Map<string, string>(); // key → file URI

let currentSound: Audio.Sound | null = null;

/** Stop any currently playing TTS audio */
export async function ttsStop() {
  if (currentSound) {
    try {
      await currentSound.stopAsync();
      await currentSound.unloadAsync();
    } catch (_) {}
    currentSound = null;
  }
}

/**
 * Speak text using OpenAI's TTS API.
 * Falls back silently if the API call fails.
 */
export async function ttsSpeak(
  text: string,
  voice: OpenAIVoice = 'nova',
  speed: number = 1.0,
) {
  if (!text.trim() || !API_KEY) return;

  await ttsStop();

  const cacheKey = `${voice}:${speed}:${text}`;

  try {
    let fileUri = cache.get(cacheKey);

    if (!fileUri) {
      // Call OpenAI TTS API
      const res = await fetch(TTS_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'tts-1',
          input: text,
          voice,
          speed,
          response_format: 'mp3',
        }),
      });

      if (!res.ok) {
        console.warn('[TTS] API error:', res.status);
        return;
      }

      // Read response as base64 and save to cache file
      const blob = await res.blob();
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = reader.result as string;
          resolve(dataUrl.split(',')[1]);
        };
        reader.readAsDataURL(blob);
      });

      fileUri = `${FileSystem.cacheDirectory}tts_${Date.now()}.mp3`;
      await FileSystem.writeAsStringAsync(fileUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Keep cache bounded (max 50 entries)
      if (cache.size > 50) {
        const firstKey = cache.keys().next().value;
        if (firstKey) cache.delete(firstKey);
      }
      cache.set(cacheKey, fileUri);
    }

    // Play the audio
    const { sound } = await Audio.Sound.createAsync(
      { uri: fileUri },
      { shouldPlay: true },
    );
    currentSound = sound;

    // Clean up when done
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        sound.unloadAsync();
        if (currentSound === sound) currentSound = null;
      }
    });
  } catch (e) {
    console.warn('[TTS] Error:', e);
  }
}

import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';

const BACKEND_URL = (process.env.EXPO_PUBLIC_BACKEND_URL ?? '').replace(/\/$/, '');
const TTS_URL = `${BACKEND_URL}/api/tts`;

export type OpenAIVoice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';

export const VOICE_OPTIONS: { value: OpenAIVoice; label: string; description: string }[] = [
  { value: 'alloy',   label: 'Alloy',   description: 'Neutral & balanced' },
  { value: 'echo',    label: 'Echo',    description: 'Warm & confident' },
  { value: 'fable',   label: 'Fable',   description: 'Expressive & British' },
  { value: 'onyx',    label: 'Onyx',    description: 'Deep & authoritative' },
  { value: 'nova',    label: 'Nova',    description: 'Friendly & upbeat' },
  { value: 'shimmer', label: 'Shimmer', description: 'Clear & gentle' },
];

/* ─── Cache ────────────────────────────────────────────────────────
 * Files are stored under expo's cacheDirectory with a deterministic
 * name derived from the cache key.  Using a fixed name means the file
 * survives JS reloads / fast-refresh — the in-memory Map is rebuilt
 * lazily by checking whether the file already exists on disk.
 * ─────────────────────────────────────────────────────────────── */

/** Simple djb2 hash → hex string (no crypto needed for cache keys) */
function hashKey(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
  return (h >>> 0).toString(16);
}

function cacheKeyFor(text: string, voice: OpenAIVoice, speed: number) {
  return `${voice}:${speed}:${text}`;
}

function fileUriFor(cacheKey: string): string {
  return `${FileSystem.cacheDirectory}tts_${hashKey(cacheKey)}.mp3`;
}

// In-memory set of keys that are confirmed to exist on disk
const diskCache = new Set<string>();

// Keys that are currently being fetched — avoid duplicate requests
const inflight = new Map<string, Promise<string | null>>();

let currentSound: Audio.Sound | null = null;

/* ─── Stop ──────────────────────────────────────────────────────── */

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

/* ─── Core fetch + cache ────────────────────────────────────────── */

/**
 * Ensure the audio for `text` is on disk and return its file URI.
 * Returns null if the API key is missing or the request fails.
 * Multiple concurrent calls for the same key share one in-flight request.
 */
async function ensureCached(
  text: string,
  voice: OpenAIVoice,
  speed: number,
): Promise<string | null> {
  if (!text.trim() || !BACKEND_URL) return null;

  const key     = cacheKeyFor(text, voice, speed);
  const fileUri = fileUriFor(key);

  // 1. In-memory hit
  if (diskCache.has(key)) return fileUri;

  // 2. File already on disk from a previous session
  const info = await FileSystem.getInfoAsync(fileUri);
  if (info.exists) {
    diskCache.add(key);
    return fileUri;
  }

  // 3. Already fetching — share the promise
  if (inflight.has(key)) return inflight.get(key)!;

  // 4. Fetch from backend proxy and write directly to disk via downloadAsync
  const promise = (async (): Promise<string | null> => {
    try {
      const resp = await fetch(TTS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: text, voice, speed }),
      });

      if (!resp.ok) {
        console.warn('[TTS] API error:', resp.status);
        return null;
      }

      // arrayBuffer → base64 without FileReader (fast, no bridge round-trip)
      const buffer = await resp.arrayBuffer();
      const bytes  = new Uint8Array(buffer);
      let binary   = '';
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      const b64 = btoa(binary);

      await FileSystem.writeAsStringAsync(fileUri, b64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      diskCache.add(key);
      return fileUri;
    } catch (e) {
      console.warn('[TTS] Fetch error:', e);
      await FileSystem.deleteAsync(fileUri, { idempotent: true }).catch(() => {});
      return null;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, promise);
  return promise;
}

/* ─── Public API ────────────────────────────────────────────────── */

/**
 * Pre-fetch audio for a list of words in the background.
 * Call this as soon as a card deck is known so audio is ready before
 * the user taps the speaker button.
 *
 * @example
 *   useEffect(() => { ttsPrefetch(cards.map(c => c.word), ttsVoice); }, []);
 */
export function ttsPrefetch(
  words: string[],
  voice: OpenAIVoice = 'nova',
  speed: number = 0.85,
): void {
  for (const word of words) {
    // Fire and forget — errors are swallowed inside ensureCached
    void ensureCached(word, voice, speed);
  }
}

/**
 * Speak text using OpenAI's TTS API.
 * If the audio is already cached the playback starts immediately.
 * Falls back silently if the API call fails.
 */
export async function ttsSpeak(
  text: string,
  voice: OpenAIVoice = 'nova',
  speed: number = 1.0,
) {
  if (!text.trim() || !BACKEND_URL) return;

  await ttsStop();

  try {
    const fileUri = await ensureCached(text, voice, speed);
    if (!fileUri) return;

    const { sound } = await Audio.Sound.createAsync(
      { uri: fileUri },
      { shouldPlay: true },
    );
    currentSound = sound;

    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        sound.unloadAsync();
        if (currentSound === sound) currentSound = null;
      }
    });
  } catch (e) {
    console.warn('[TTS] Playback error:', e);
  }
}

// Mood face data. Pure shape primitives — actual SVG drawn in MoodFace.tsx.
// Coordinate space: 0..100 viewBox, eyes at y≈42, mouth at y≈62, cheeks at y≈60.

export type MoodName =
  | 'happy'
  | 'excited'
  | 'joy'
  | 'anxious'
  | 'confused'
  | 'angry'
  | 'sad'
  | 'calm'
  | 'sleepy'
  | 'love';

export type EyeShape =
  | { kind: 'dot'; r?: number }
  | { kind: 'arcUp'; w?: number; depth?: number } // ‿  (curve opens up — kissy/excited)
  | { kind: 'arcDown'; w?: number; depth?: number } // ⌒  (curve opens down — happy squint)
  | { kind: 'wink' } // a smaller arcDown
  | { kind: 'cross'; size?: number } // X
  | { kind: 'vbrow'; angle?: number } // angry slash brow
  | { kind: 'heart'; size?: number };

export type MouthShape =
  | { kind: 'smile'; w?: number; depth?: number }
  | { kind: 'wavy'; w?: number }
  | { kind: 'open'; w?: number; h?: number }
  | { kind: 'frown'; w?: number; depth?: number }
  | { kind: 'kiss'; size?: number }; // cute "з" / pursed

export interface Mood {
  label: string;
  bg: string;
  fg: string;
  cheek?: string; // pink dot color, undefined = no cheeks
  leftEye: EyeShape;
  rightEye: EyeShape;
  mouth: MouthShape;
  bob: { amp: number; duration: number };
  blinks?: boolean;
}

const CHEEK = '#f7a8a8';

export const MOODS: Record<MoodName, Mood> = {
  happy: {
    label: 'Happy',
    bg: '#f4978e',
    fg: '#3d2722',
    cheek: CHEEK,
    leftEye: { kind: 'dot', r: 4 },
    rightEye: { kind: 'dot', r: 4 },
    mouth: { kind: 'smile', w: 18, depth: 5 },
    bob: { amp: 2.5, duration: 2200 },
    blinks: true,
  },
  excited: {
    label: 'Excited',
    bg: '#fcd9b6',
    fg: '#5c3a26',
    cheek: CHEEK,
    leftEye: { kind: 'arcUp', w: 12, depth: 4 },
    rightEye: { kind: 'arcUp', w: 12, depth: 4 },
    mouth: { kind: 'kiss', size: 6 },
    bob: { amp: 3.5, duration: 1300 },
    blinks: false,
  },
  joy: {
    label: 'Joy',
    bg: '#b8b5d8',
    fg: '#1f1d3a',
    cheek: CHEEK,
    leftEye: { kind: 'wink' },
    rightEye: { kind: 'dot', r: 4 },
    mouth: { kind: 'smile', w: 16, depth: 4 },
    bob: { amp: 2.5, duration: 2000 },
    blinks: true,
  },
  anxious: {
    label: 'Anxious',
    bg: '#f6c2c2',
    fg: '#3d2127',
    cheek: CHEEK,
    leftEye: { kind: 'arcDown', w: 13, depth: 5 },
    rightEye: { kind: 'arcDown', w: 13, depth: 5 },
    mouth: { kind: 'smile', w: 14, depth: 3 },
    bob: { amp: 1.8, duration: 1800 },
    blinks: false,
  },
  confused: {
    label: 'Confused',
    bg: '#a8c8d8',
    fg: '#1f3138',
    cheek: CHEEK,
    leftEye: { kind: 'cross', size: 6 },
    rightEye: { kind: 'cross', size: 6 },
    mouth: { kind: 'wavy', w: 18 },
    bob: { amp: 1.5, duration: 2600 },
    blinks: false,
  },
  angry: {
    label: 'Angry',
    bg: '#c8e6c9',
    fg: '#1b3320',
    cheek: CHEEK,
    leftEye: { kind: 'vbrow', angle: 18 },
    rightEye: { kind: 'vbrow', angle: -18 },
    mouth: { kind: 'kiss', size: 5 },
    bob: { amp: 2, duration: 800 },
    blinks: false,
  },
  sad: {
    label: 'Sad',
    bg: '#bcd0e0',
    fg: '#1f2d3d',
    leftEye: { kind: 'arcDown', w: 12, depth: 4 },
    rightEye: { kind: 'arcDown', w: 12, depth: 4 },
    mouth: { kind: 'frown', w: 16, depth: 4 },
    bob: { amp: 1.4, duration: 3200 },
    blinks: false,
  },
  calm: {
    label: 'Calm',
    bg: '#dfe7d7',
    fg: '#2a3326',
    leftEye: { kind: 'arcDown', w: 12, depth: 3 },
    rightEye: { kind: 'arcDown', w: 12, depth: 3 },
    mouth: { kind: 'smile', w: 14, depth: 3 },
    bob: { amp: 2, duration: 3400 },
    blinks: true,
  },
  sleepy: {
    label: 'Sleepy',
    bg: '#cfd1e6',
    fg: '#2a2b3f',
    leftEye: { kind: 'arcDown', w: 14, depth: 6 },
    rightEye: { kind: 'arcDown', w: 14, depth: 6 },
    mouth: { kind: 'open', w: 6, h: 5 },
    bob: { amp: 2.2, duration: 4200 },
    blinks: false,
  },
  love: {
    label: 'Love',
    bg: '#fcd0d0',
    fg: '#3d1f1f',
    cheek: CHEEK,
    leftEye: { kind: 'heart', size: 7 },
    rightEye: { kind: 'heart', size: 7 },
    mouth: { kind: 'smile', w: 14, depth: 3 },
    bob: { amp: 3, duration: 1800 },
    blinks: false,
  },
};

export const ALL_MOODS: MoodName[] = [
  'happy',
  'excited',
  'joy',
  'anxious',
  'confused',
  'angry',
  'sad',
  'calm',
  'sleepy',
  'love',
];

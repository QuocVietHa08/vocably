# Animation Face Module

This document describes the compact animated robot face module in this project. The module is designed for mobile-first product UI where the face acts as an expressive status/reaction surface rather than a full character with accessories.

## Overview

The current face system is implemented by:

- `src/components/robot/RobotFace.tsx`
- `src/components/robot/ControlPanel.tsx`
- `src/components/robot/expressions.ts`
- `src/routes/index.tsx`
- `src/styles.css`

The visual direction is based on simple kaomoji-style white stroke expressions on a dark glossy screen. Each emotion is a custom SVG face, not an emoji font. The wrapper adds atmospheric depth, screen grain, glow, subtle particles, and small continuous motion.

## Component API

```tsx
import { RobotFace } from "@/components/robot/RobotFace";

<RobotFace state="happy" size={380} />;
```

### Props

```ts
interface RobotFaceProps {
  state: ExpressionName;
  gender?: GenderName;
  accessory?: AccessoryName;
  size?: number;
}
```

Only `state` and `size` are active in the current emotion-first design.

`gender` and `accessory` are intentionally kept in the prop signature for future compatibility, but the current renderer does not use them. Persona and accessory UI sections are commented out in `ControlPanel.tsx`.

## Emotion States

The active state type comes from `ExpressionName` in `src/components/robot/expressions.ts`.

Current supported states:

- `idle`: calm horizontal eyes with a small cat-like mouth.
- `happy`: lifted closed-eye arcs and a soft smile.
- `blink`: clean closed-eye arcs. This replaces the old dark lid overlay.
- `listening`: round attentive eyes with a small focused mouth.
- `thinking`: side-eye lines with a kiss-like thinking mouth.
- `sleepy`: low sleepy arcs with a peaceful mouth.
- `laugh`: squint lines and a larger open smile.
- `angry`: sharp diagonal eye slashes and a tense mouth.
- `surprised`: round eyes and a small open mouth.
- `love`: heart-like eye shapes with a tiny kiss mouth.
- `wink`: one ring eye and one closed arc.
- `sad`: downturned eyes, frown, and small tears.
- `excited`: dot eyes with an open happy mouth.
- `confused`: uneven eyes and a wavy mouth.
- `cool`: low relaxed eyes and a smirk.

## How Expressions Are Drawn

`RobotFace.tsx` contains a `FACE` map:

```ts
const FACE: Record<ExpressionName, StrokeFace> = {
  happy: {
    title: "Happy",
    caption: "Bright lifted cheeks and a soft smiling mouth.",
    glow: 1.16,
    tilt: -1,
    accent: "#a8fff3",
    particles: ["✦", "✨", "°"],
    draw: (tone) => (
      <>
        <Line d="..." tone={tone} />
        <Line d="..." tone={tone} />
      </>
    ),
  },
};
```

Each face config controls:

- `title`: Displayed in the active emotion panel.
- `caption`: Short UX description for the current emotion.
- `glow`: Intensity of the ambient inner glow.
- `tilt`: Subtle rotation during idle motion.
- `accent`: Stroke color for the expression.
- `particles`: Small ambient text particles around the module.
- `draw`: SVG strokes that render the face.

Helper primitives:

- `Line`: rounded SVG path stroke.
- `Ring`: circular eye stroke.
- `Dot`: filled dot eye.
- `Tear`: outlined tear drop.

## Animation Behavior

The module intentionally avoids random blinking. Blink is now an explicit state only. This prevents unwanted closed-eye frames in screenshots and mobile UI.

Animations used:

- The module floats slightly with `framer-motion`.
- The expression group gently scales to feel alive.
- The glow ellipse pulses per state.
- Particles drift upward around the face module.
- Control buttons update the state immediately.
- Autoplay cycles through all expressions every `2600ms`.

Reduced motion is respected through `useReducedMotion()`. When reduced motion is active, repeated movement is disabled or simplified.

## Control Panel

`ControlPanel.tsx` currently exposes only:

- Emotion buttons.
- Autoplay toggle.
- Current state readout.

Persona and accessory sections are still present as commented code. They can be restored later, but the current direction intentionally focuses on emotions.

```tsx
<ControlPanel
  current={state}
  onChange={setState}
  autoplay={autoplay}
  onToggleAutoplay={() => setAutoplay((value) => !value)}
  gender={gender}
  onGenderChange={setGender}
  accessory={accessory}
  onAccessoryChange={setAccessory}
/>
```

## Demo Route

The main route keeps a compact module preview:

```tsx
<RobotFace state={state} gender={gender} accessory={accessory} size={380} />
```

The route supports URL query parameters for QA/testing:

- `/?state=happy`
- `/?state=surprised`
- `/?state=blink`

The route also accepts `gender` and `accessory` query params for compatibility, but those values are not used visually by the emotion-first face.

## Styling Hooks

Important CSS classes in `src/styles.css`:

- `.robot-stage`: Full-page demo background.
- `.robot-stage__backdrop`: Large blurred background glows.
- `.robot-stage__grid`: Subtle technical grid overlay.
- `.robot-face-module`: Compact reusable module wrapper.
- `.robot-face-module--emotion`: Emotion-specific module surface.
- `.robot-face-module__glow`: Large internal glow.
- `.robot-expression-shell`: Outer glossy robot screen shell.
- `.robot-expression-screen`: Inner black display surface.
- `.robot-expression-screen__grain`: Tiny grain/dot texture.
- `.robot-expression-screen__shine`: Display reflection.
- `.robot-info-panel`: Active emotion label/caption panel.

## Mobile Embedding Guidance

Recommended mobile usage:

```tsx
<div className="w-full max-w-sm">
  <RobotFace state={state} size={340} />
</div>
```

Notes:

- Prefer `size` between `300` and `380` for mobile.
- The module already clamps width using `calc(100vw - 3.5rem)`.
- The wrapper is self-contained and has its own background, border, and glow.
- Avoid nesting it inside containers with `overflow: hidden` unless intentional, because particles and glow are part of the composition.
- Use explicit state changes instead of random blink timers when deterministic UI screenshots matter.

## Adding A New Emotion

1. Add the state to `ExpressionName` in `expressions.ts`.
2. Add it to `ALL_STATES`.
3. Add a matching entry to the `FACE` map in `RobotFace.tsx`.
4. Use `Line`, `Ring`, `Dot`, and `Tear` helpers where possible.
5. Keep the face within the `320x280` SVG viewbox.
6. Test on mobile with a URL like `/?state=newState`.

Example:

```tsx
curious: {
  title: "Curious",
  caption: "A tilted question expression.",
  glow: 1.05,
  tilt: -3,
  accent: "#f4ffff",
  particles: ["?", "·"],
  draw: (tone) => (
    <>
      <Ring cx={98} cy={144} tone={tone} />
      <Line d="M 204 144 H 244" tone={tone} />
      <Line d="M 140 196 Q 160 188 180 196" tone={tone} />
    </>
  ),
}
```

## Design Rules

- Keep expressions simple and readable at small sizes.
- Prefer white or near-white strokes with cyan glow.
- Avoid heavy filled shapes unless the emotion requires dots or hearts.
- Avoid random animation for critical states.
- Make blink an explicit state, not a timer-driven surprise.
- Keep accessories out of the active emotion-first renderer until there is a clear product need.

## Verification Checklist

Before shipping changes:

- Run `npm run build`.
- Run `npm run lint`.
- Check `/?state=blink` because blink is visually sensitive.
- Check at least one round-eye expression, e.g. `/?state=surprised`.
- Check at least one dense expression, e.g. `/?state=love`.
- Check mobile viewport around `390x900`.

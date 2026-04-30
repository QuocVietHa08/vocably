import type { AccessoryName, GenderPreset } from "./expressions";

const STROKE = "white";
const SW = 5;

interface AccessoriesProps {
  accessory: AccessoryName;
  gender: GenderPreset;
}

// All shapes draw inside the 200x200 viewBox of the face SVG.
export function Accessories({ accessory, gender }: AccessoriesProps) {
  return (
    <g fill="none" stroke={STROKE} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round">
      {/* ---- Top of head pieces (gender) ---- */}
      {gender.topPiece === "antenna" && (
        <g>
          <line x1="100" y1="22" x2="100" y2="6" />
          <circle cx="100" cy="4" r="4" fill={STROKE} />
        </g>
      )}
      {gender.topPiece === "tuft" && <path d="M 88 18 Q 96 0 104 14 Q 110 4 114 20" />}
      {gender.topPiece === "spike" && (
        <g>
          <path d="M 80 22 L 86 4 L 92 22" />
          <path d="M 96 22 L 102 0 L 108 22" />
          <path d="M 112 22 L 118 6 L 124 22" />
        </g>
      )}
      {gender.topPiece === "bob" && <path d="M 40 60 Q 30 10 100 6 Q 170 10 160 60" />}

      {/* ---- Brows ---- */}
      {gender.brow === "thin" && (
        <g strokeWidth={3}>
          <path d="M 58 76 Q 70 70 82 76" />
          <path d="M 118 76 Q 130 70 142 76" />
        </g>
      )}
      {gender.brow === "thick" && (
        <g strokeWidth={7}>
          <path d="M 56 78 L 84 74" />
          <path d="M 116 74 L 144 78" />
        </g>
      )}
      {gender.brow === "soft" && (
        <g strokeWidth={4}>
          <path d="M 60 78 Q 70 74 82 78" />
          <path d="M 118 78 Q 130 74 140 78" />
        </g>
      )}

      {/* ---- Lashes ---- */}
      {gender.lashes && (
        <g strokeWidth={3}>
          <path d="M 60 88 L 56 84" />
          <path d="M 70 86 L 70 80" />
          <path d="M 80 88 L 84 84" />
          <path d="M 120 88 L 116 84" />
          <path d="M 130 86 L 130 80" />
          <path d="M 140 88 L 144 84" />
        </g>
      )}

      {/* ---- Blush ---- */}
      {gender.blush && (
        <g stroke={STROKE} strokeWidth={2.5} opacity={0.55}>
          <path d="M 50 118 q 4 -3 8 0" />
          <path d="M 54 122 q 4 -3 8 0" />
          <path d="M 142 118 q 4 -3 8 0" />
          <path d="M 146 122 q 4 -3 8 0" />
        </g>
      )}

      {/* ---- Accessories ---- */}
      {accessory === "bowtie" && (
        <g>
          <path d="M 80 178 L 96 168 L 96 188 Z" fill={STROKE} />
          <path d="M 120 178 L 104 168 L 104 188 Z" fill={STROKE} />
          <circle cx="100" cy="178" r="3" fill={STROKE} />
        </g>
      )}
      {accessory === "scarf" && (
        <g>
          <path d="M 50 168 Q 100 188 150 168 L 150 184 Q 100 198 50 184 Z" />
          <path d="M 130 184 L 138 198 L 144 188" />
        </g>
      )}
      {accessory === "tophat" && (
        <g>
          <line x1="40" y1="22" x2="160" y2="22" strokeWidth={6} />
          <rect x="62" y="-22" width="76" height="44" rx="2" />
          <line x1="62" y1="8" x2="138" y2="8" />
        </g>
      )}
      {accessory === "beanie" && (
        <g>
          <path d="M 36 36 Q 100 -22 164 36 L 164 44 L 36 44 Z" />
          <line x1="36" y1="44" x2="164" y2="44" strokeWidth={6} />
          <circle cx="100" cy="-2" r="6" />
        </g>
      )}
      {accessory === "headphones" && (
        <g>
          <path d="M 28 100 Q 28 24 100 24 Q 172 24 172 100" />
          <rect x="18" y="92" width="22" height="34" rx="6" />
          <rect x="160" y="92" width="22" height="34" rx="6" />
        </g>
      )}
      {accessory === "necklace" && (
        <g>
          <path d="M 56 178 Q 100 200 144 178" />
          <circle cx="100" cy="194" r="5" fill={STROKE} />
        </g>
      )}
      {accessory === "sunglasses" && (
        <g>
          <rect x="42" y="80" width="48" height="32" rx="10" fill={STROKE} />
          <rect x="110" y="80" width="48" height="32" rx="10" fill={STROKE} />
          <line x1="90" y1="92" x2="110" y2="92" strokeWidth={6} />
          <line x1="22" y1="86" x2="42" y2="92" />
          <line x1="158" y1="92" x2="178" y2="86" />
        </g>
      )}
      {accessory === "earrings" && (
        <g>
          <circle cx="36" cy="118" r="4" fill={STROKE} />
          <circle cx="164" cy="118" r="4" fill={STROKE} />
          <line x1="36" y1="110" x2="36" y2="114" />
          <line x1="164" y1="110" x2="164" y2="114" />
        </g>
      )}
    </g>
  );
}

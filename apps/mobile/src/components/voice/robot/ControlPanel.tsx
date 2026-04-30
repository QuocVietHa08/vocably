import {
  ALL_STATES,
  type ExpressionName,
  type GenderName,
  type AccessoryName,
} from "./expressions";

interface ControlPanelProps {
  current: ExpressionName;
  onChange: (s: ExpressionName) => void;
  autoplay: boolean;
  onToggleAutoplay: () => void;
  gender: GenderName;
  onGenderChange: (g: GenderName) => void;
  accessory: AccessoryName;
  onAccessoryChange: (a: AccessoryName) => void;
}

export function ControlPanel({
  current,
  onChange,
  autoplay,
  onToggleAutoplay,
  gender,
  onGenderChange,
  accessory,
  onAccessoryChange,
}: ControlPanelProps) {
  void gender;
  void onGenderChange;
  void accessory;
  void onAccessoryChange;

  return (
    <div className="w-full space-y-4">
      <div className="space-y-2">
        <p className="text-[0.68rem] font-medium uppercase tracking-[0.36em] text-[#8ab8b4]">
          Controller
        </p>
        <h2 className="text-xl font-semibold tracking-[-0.03em] text-[#effffd]">Choose emotion</h2>
        <p className="text-xs leading-5 text-[#a8c8c5]/80">
          Choose a reaction. Auto cycles through the full emotion set.
        </p>
      </div>

      <Section label="Emotion">
        <div className="grid grid-cols-2 gap-2">
          {ALL_STATES.map((s) => {
            const active = s === current && !autoplay;
            return (
              <Chip
                key={s}
                active={active}
                onClick={() => {
                  if (autoplay) onToggleAutoplay();
                  onChange(s);
                }}
              >
                {s}
              </Chip>
            );
          })}
          <Chip active={autoplay} onClick={onToggleAutoplay}>
            {autoplay ? "Stop auto" : "Auto play"}
          </Chip>
        </div>
      </Section>

      {/*
      <Section label="Persona">
        <div className="grid grid-cols-2 gap-2">
          {ALL_GENDERS.map((g) => (
            <Chip key={g} active={g === gender} onClick={() => onGenderChange(g)}>
              {g}
            </Chip>
          ))}
        </div>
      </Section>
      */}

      {/*
      <Section label="Accessory">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2">
          {ALL_ACCESSORIES.map((a) => (
            <Chip key={a} active={a === accessory} onClick={() => onAccessoryChange(a)}>
              {a}
            </Chip>
          ))}
        </div>
      </Section>
      */}

      <p className="rounded-2xl border border-[#8dfff0]/12 bg-[#6dffe7]/7 px-4 py-3 text-center text-[11px] uppercase tracking-[0.26em] text-[#dffff9]/75">
        {autoplay ? "auto · " : ""}
        {current}
      </p>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <p className="text-[10px] font-medium uppercase tracking-[0.4em] text-[#8ab8b4]/75">
        {label}
      </p>
      {children}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-2xl border px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.18em] transition-all ${
        active
          ? "border-[#8dfff0]/80 bg-[#6dffe7] text-[#031315] shadow-[0_0_24px_rgba(109,255,231,0.28)]"
          : "border-white/10 bg-white/[0.035] text-[#dffff9]/70 hover:border-[#8dfff0]/45 hover:bg-[#6dffe7]/10 hover:text-[#effffd]"
      }`}
    >
      {children}
    </button>
  );
}

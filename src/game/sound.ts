type SoundName =
  | "select"
  | "play"
  | "pass"
  | "bomb"
  | "win"
  | "lose"
  | "deal"
  | "button";

let audioCtx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctor) return null;
  if (!audioCtx) audioCtx = new Ctor();
  if (audioCtx.state === "suspended") void audioCtx.resume();
  return audioCtx;
}

function tone(
  ctx: AudioContext,
  freq: number,
  start: number,
  duration: number,
  type: OscillatorType,
  volume: number,
): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, ctx.currentTime + start);
  gain.gain.exponentialRampToValueAtTime(
    volume,
    ctx.currentTime + start + 0.012,
  );
  gain.gain.exponentialRampToValueAtTime(
    0.0001,
    ctx.currentTime + start + duration,
  );
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime + start);
  osc.stop(ctx.currentTime + start + duration + 0.02);
}

export function playSound(name: SoundName, enabled: boolean): void {
  if (!enabled) return;
  const ctx = getContext();
  if (!ctx) return;

  switch (name) {
    case "select":
      tone(ctx, 620, 0, 0.06, "sine", 0.05);
      break;
    case "button":
      tone(ctx, 440, 0, 0.08, "triangle", 0.05);
      break;
    case "deal":
      tone(ctx, 320, 0, 0.05, "square", 0.03);
      tone(ctx, 420, 0.05, 0.05, "square", 0.03);
      break;
    case "play":
      tone(ctx, 520, 0, 0.09, "triangle", 0.08);
      tone(ctx, 700, 0.05, 0.1, "triangle", 0.06);
      break;
    case "pass":
      tone(ctx, 300, 0, 0.1, "sine", 0.05);
      break;
    case "bomb":
      tone(ctx, 150, 0, 0.28, "sawtooth", 0.16);
      tone(ctx, 90, 0.08, 0.35, "sawtooth", 0.16);
      break;
    case "win":
      tone(ctx, 523, 0, 0.16, "triangle", 0.09);
      tone(ctx, 659, 0.14, 0.16, "triangle", 0.09);
      tone(ctx, 784, 0.28, 0.24, "triangle", 0.09);
      break;
    case "lose":
      tone(ctx, 400, 0, 0.2, "sine", 0.08);
      tone(ctx, 300, 0.18, 0.3, "sine", 0.08);
      break;
  }
}

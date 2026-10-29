// Short synthesized mechanical tones. No downloads, autoplay, or background loop.
let context: AudioContext | undefined;
export function unlockAudio(): void {
  try {
    context ??= new AudioContext();
    if (context.state === "suspended") void context.resume().catch(() => {});
  } catch {
    /* Audio support is optional. */
  }
}
export function sound(
  kind: "move" | "rewind" | "capture" | "win" | "loss",
  enabled: boolean,
): void {
  if (!enabled || !context || context.state !== "running") return;
  const ctx = context;
  const tones =
    kind === "win"
      ? [220, 330, 440]
      : kind === "loss"
        ? [180, 135, 90]
        : kind === "capture"
          ? [110, 220]
          : kind === "rewind"
            ? [330, 220, 165]
            : [150];
  tones.forEach((frequency, i) => {
    const osc = ctx.createOscillator(),
      gain = ctx.createGain(),
      t = ctx.currentTime + i * 0.075;
    osc.type = "triangle";
    osc.frequency.setValueAtTime(frequency, t);
    osc.frequency.exponentialRampToValueAtTime(frequency * 0.7, t + 0.12);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.13, t + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.2);
  });
}

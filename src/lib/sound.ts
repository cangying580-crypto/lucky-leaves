let ctx: AudioContext | null = null;
let muted = localStorage.getItem('ll_muted') === '1';

function ensureCtx(): AudioContext | null {
  if (muted) return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function tone(freq: number, start: number, dur: number, type: OscillatorType, gain: number) {
  const c = ensureCtx();
  if (!c) return;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, c.currentTime + start);
  g.gain.setValueAtTime(0, c.currentTime + start);
  g.gain.linearRampToValueAtTime(gain, c.currentTime + start + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + start + dur);
  osc.connect(g).connect(c.destination);
  osc.start(c.currentTime + start);
  osc.stop(c.currentTime + start + dur + 0.05);
}

export const sound = {
  isMuted: () => muted,
  setMuted(v: boolean) {
    muted = v;
    localStorage.setItem('ll_muted', v ? '1' : '0');
  },
  tick() {
    tone(660, 0, 0.09, 'triangle', 0.06);
  },
  open() {
    tone(440, 0, 0.12, 'sine', 0.07);
    tone(660, 0.06, 0.14, 'sine', 0.05);
  },
  plant() {
    tone(220, 0, 0.16, 'triangle', 0.1);
    tone(330, 0.08, 0.18, 'triangle', 0.08);
    tone(523, 0.16, 0.24, 'sine', 0.07);
  },
  complete() {
    tone(523, 0, 0.16, 'sine', 0.09);
    tone(784, 0.09, 0.2, 'sine', 0.09);
    tone(1047, 0.18, 0.3, 'sine', 0.06);
  },
  undo() {
    tone(587, 0, 0.1, 'sine', 0.06);
    tone(392, 0.07, 0.14, 'sine', 0.06);
  },
};
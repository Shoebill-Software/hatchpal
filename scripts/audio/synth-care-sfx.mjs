#!/usr/bin/env node
/**
 * Renders the nest-care and guide sound effects into assets/audio as 16-bit mono WAV.
 * Everything is synthesized from seeded noise and oscillators, so the output is
 * reproducible and carries no third-party licensing.
 *
 *   node scripts/audio/synth-care-sfx.mjs
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RATE = 44100;
const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'assets', 'audio');

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const buffer = (seconds) => new Float32Array(Math.ceil(seconds * RATE));
const at = (seconds) => Math.floor(seconds * RATE);

function whiteNoise(length, random) {
  const out = new Float32Array(length);
  for (let i = 0; i < length; i += 1) out[i] = random() * 2 - 1;
  return out;
}

function pinkNoise(length, random) {
  const out = new Float32Array(length);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < length; i += 1) {
    const white = random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.969 * b2 + white * 0.153852;
    b3 = 0.8665 * b3 + white * 0.3104856;
    b4 = 0.55 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.016898;
    out[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
    b6 = white * 0.115926;
  }
  return out;
}

function brownNoise(length, random) {
  const out = new Float32Array(length);
  let last = 0;
  for (let i = 0; i < length; i += 1) {
    last = (last + 0.02 * (random() * 2 - 1)) / 1.02;
    out[i] = last * 3.5;
  }
  return out;
}

/** RBJ biquad. `freq` may be a number or a function of the sample index. */
function biquad(input, type, freq, q = 0.707) {
  const out = new Float32Array(input.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  let b0 = 0, b1 = 0, b2 = 0, a1 = 0, a2 = 0;
  const update = (f) => {
    const w0 = (2 * Math.PI * Math.min(f, RATE * 0.45)) / RATE;
    const cos = Math.cos(w0);
    const alpha = Math.sin(w0) / (2 * q);
    let nb0, nb1, nb2;
    if (type === 'lowpass') {
      nb0 = (1 - cos) / 2; nb1 = 1 - cos; nb2 = (1 - cos) / 2;
    } else if (type === 'highpass') {
      nb0 = (1 + cos) / 2; nb1 = -(1 + cos); nb2 = (1 + cos) / 2;
    } else {
      nb0 = alpha; nb1 = 0; nb2 = -alpha;
    }
    const a0 = 1 + alpha;
    b0 = nb0 / a0; b1 = nb1 / a0; b2 = nb2 / a0;
    a1 = (-2 * cos) / a0; a2 = (1 - alpha) / a0;
  };
  const dynamic = typeof freq === 'function';
  if (!dynamic) update(freq);
  for (let i = 0; i < input.length; i += 1) {
    if (dynamic && i % 16 === 0) update(freq(i));
    const x = input[i];
    const y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1; x1 = x; y2 = y1; y1 = y;
    out[i] = y;
  }
  return out;
}

/** Small mono Freeverb: parallel damped combs into series allpasses. */
function reverb(input, { room = 0.7, damp = 0.4, wet = 0.25, tail = 0.6 } = {}) {
  const length = input.length + at(tail);
  const dry = new Float32Array(length);
  dry.set(input);
  const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617];
  const allpasses = [556, 441, 341, 225];
  const mixed = new Float32Array(length);
  for (const size of combs) {
    const line = new Float32Array(size);
    let index = 0;
    let store = 0;
    for (let i = 0; i < length; i += 1) {
      const output = line[index];
      store = output * (1 - damp) + store * damp;
      line[index] = dry[i] * 0.015 + store * room;
      mixed[i] += output;
      index = (index + 1) % size;
    }
  }
  for (const size of allpasses) {
    const line = new Float32Array(size);
    let index = 0;
    for (let i = 0; i < length; i += 1) {
      const buffered = line[index];
      const value = mixed[i];
      mixed[i] = buffered - value;
      line[index] = value + buffered * 0.5;
      index = (index + 1) % size;
    }
  }
  const out = new Float32Array(length);
  for (let i = 0; i < length; i += 1) out[i] = dry[i] * (1 - wet * 0.5) + mixed[i] * wet;
  return out;
}

function addInto(target, source, offset = 0, gain = 1) {
  for (let i = 0; i < source.length && i + offset < target.length; i += 1) {
    if (i + offset >= 0) target[i + offset] += source[i] * gain;
  }
}

function envelope(length, attack, decayTau, hold = 0) {
  const out = new Float32Array(length);
  const a = Math.max(1, at(attack));
  const h = at(hold);
  for (let i = 0; i < length; i += 1) {
    if (i < a) out[i] = Math.sin(((i / a) * Math.PI) / 2);
    else if (i < a + h) out[i] = 1;
    else out[i] = Math.exp(-(i - a - h) / (decayTau * RATE));
  }
  return out;
}

function multiply(a, b) {
  const out = new Float32Array(a.length);
  for (let i = 0; i < a.length; i += 1) out[i] = a[i] * (b[i] ?? 0);
  return out;
}

/** Additive tone with per-partial decay. `freq` may glide via a function of seconds. */
function tone(seconds, freq, partials, { attack = 0.004, detune = 0 } = {}) {
  const out = buffer(seconds);
  const phases = partials.map(() => 0);
  const phasesB = partials.map(() => 0);
  const a = Math.max(1, at(attack));
  for (let i = 0; i < out.length; i += 1) {
    const time = i / RATE;
    const base = typeof freq === 'function' ? freq(time) : freq;
    let sample = 0;
    partials.forEach((partial, p) => {
      const f = base * partial.ratio;
      phases[p] += (2 * Math.PI * f) / RATE;
      let value = Math.sin(phases[p]);
      if (detune > 0) {
        phasesB[p] += (2 * Math.PI * (f + detune)) / RATE;
        value = (value + Math.sin(phasesB[p])) * 0.5;
      }
      sample += value * partial.amp * Math.exp(-time / partial.decay);
    });
    const attackGain = i < a ? Math.sin(((i / a) * Math.PI) / 2) : 1;
    out[i] = sample * attackGain;
  }
  return out;
}

function crackle(random, intensity) {
  const length = at(0.004 + random() * 0.01);
  const noise = whiteNoise(length, random);
  const tau = 0.0006 + random() * 0.0018;
  const shaped = new Float32Array(length);
  for (let i = 0; i < length; i += 1) shaped[i] = noise[i] * Math.exp(-i / (tau * RATE));
  const bright = biquad(shaped, 'highpass', 1400 + random() * 1800, 0.8);
  if (random() < 0.3) {
    const pop = tone(0.03, 1200 + random() * 2400, [{ ratio: 1, amp: 0.5, decay: 0.006 }], { attack: 0.0004 });
    addInto(bright, pop, 0, 0.6);
  }
  for (let i = 0; i < bright.length; i += 1) bright[i] *= intensity;
  return bright;
}

function fadeEdges(samples, fadeIn = 0.003, fadeOut = 0.02) {
  const inLength = at(fadeIn);
  const outLength = at(fadeOut);
  for (let i = 0; i < inLength && i < samples.length; i += 1) samples[i] *= i / inLength;
  for (let i = 0; i < outLength && i < samples.length; i += 1) samples[samples.length - 1 - i] *= i / outLength;
  return samples;
}

function normalize(samples, peakDb = -3) {
  let peak = 0;
  for (const value of samples) peak = Math.max(peak, Math.abs(value));
  const target = Math.pow(10, peakDb / 20);
  const gain = peak > 0 ? target / peak : 1;
  for (let i = 0; i < samples.length; i += 1) samples[i] *= gain;
  return samples;
}

function trimTail(samples, thresholdDb = -60) {
  const threshold = Math.pow(10, thresholdDb / 20);
  let end = samples.length;
  while (end > 1 && Math.abs(samples[end - 1]) < threshold) end -= 1;
  return samples.slice(0, Math.min(samples.length, end + at(0.01)));
}

function writeWav(name, samples) {
  const data = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i += 1) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    data.writeInt16LE(Math.round(clamped * 32767), i * 2);
  }
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.writeUInt32LE(data.length, 40);
  writeFileSync(join(OUT_DIR, `${name}.wav`), Buffer.concat([header, data]));
  console.log(`${name}.wav  ${(samples.length / RATE).toFixed(2)}s`);
}

/** Brooder embers: a soft flame bed with sparse crackles, crossfaded into a seamless loop. */
function emberLoop() {
  const random = rng(1701);
  const loop = 2.4;
  const seam = 0.45;
  const total = buffer(loop + seam);
  const length = total.length;

  const bed = biquad(brownNoise(length, random), 'lowpass', 700, 0.6);
  const breath = biquad(pinkNoise(length, random), 'bandpass', 1100, 0.6);
  for (let i = 0; i < length; i += 1) {
    const time = i / RATE;
    const sway = 1 + 0.28 * Math.sin(2 * Math.PI * 0.7 * time) + 0.18 * Math.sin(2 * Math.PI * 1.9 * time + 1.3);
    total[i] = bed[i] * 0.42 * sway + breath[i] * 0.22 * (2 - sway);
  }

  let cursor = 0;
  while (cursor < loop + seam) {
    cursor += -Math.log(1 - random()) / 16;
    const loud = Math.pow(random(), 2.6);
    addInto(total, crackle(random, 0.12 + loud * 0.85), at(cursor));
    if (random() < 0.12) addInto(total, crackle(random, 0.2 + loud * 0.4), at(cursor + 0.012 + random() * 0.02));
  }

  const out = new Float32Array(at(loop));
  const seamLength = at(seam);
  for (let i = 0; i < out.length; i += 1) {
    if (i < seamLength) {
      const unit = i / seamLength;
      out[i] = total[i] * Math.sin((unit * Math.PI) / 2) + total[i + out.length] * Math.cos((unit * Math.PI) / 2);
    } else {
      out[i] = total[i];
    }
  }
  return normalize(out, -4);
}

/** A warm exhale as the lamp settles, a soft major glow, and a few cooling crackles. */
function warmSettle() {
  const random = rng(4242);
  const out = buffer(1.5);
  const whoomp = biquad(pinkNoise(at(0.7), random), 'lowpass', (i) => {
    const time = i / RATE;
    return 280 + 1600 * Math.exp(-Math.pow((time - 0.06) / 0.09, 2)) + 360 * Math.exp(-time / 0.3);
  }, 0.9);
  addInto(out, multiply(whoomp, envelope(whoomp.length, 0.035, 0.16)), 0, 1.1);

  const glow = [
    { freq: 440, delay: 0.02 },
    { freq: 554.37, delay: 0.07 },
    { freq: 659.25, delay: 0.12 },
    { freq: 880, delay: 0.19 },
  ];
  for (const note of glow) {
    const voice = tone(1.2, note.freq, [
      { ratio: 1, amp: 0.5, decay: 0.42 },
      { ratio: 2, amp: 0.14, decay: 0.22 },
      { ratio: 3, amp: 0.05, decay: 0.12 },
    ], { attack: 0.018, detune: 1.4 });
    addInto(out, voice, at(note.delay), 0.32);
  }

  for (let n = 0; n < 7; n += 1) {
    const time = 0.12 + Math.pow(random(), 1.6) * 0.9;
    addInto(out, crackle(random, 0.08 + random() * 0.18 * (1 - time)), at(time));
  }
  return normalize(trimTail(fadeEdges(reverb(out, { room: 0.72, damp: 0.5, wet: 0.28, tail: 0.5 }), 0.002, 0.08)), -3);
}

/** One pump of a spray bottle: trigger tock, turbulent hiss, and a few landing beads. */
function mistSpritz(seed, holdSeconds, brightness) {
  const random = rng(seed);
  const out = buffer(0.62);

  const click = biquad(whiteNoise(at(0.006), random), 'bandpass', 2600 * brightness, 2.2);
  addInto(out, multiply(click, envelope(click.length, 0.0003, 0.0015)), 0, 0.9);
  addInto(out, tone(0.04, 820 * brightness, [{ ratio: 1, amp: 0.5, decay: 0.007 }], { attack: 0.0003 }), 0, 0.5);

  const sprayLength = at(holdSeconds + 0.32);
  const raw = whiteNoise(sprayLength, random);
  const hiss = biquad(
    biquad(raw, 'highpass', 2300 * brightness, 0.7),
    'lowpass',
    (i) => (11500 - 3800 * (i / sprayLength)) * brightness,
    0.6
  );
  const body = biquad(pinkNoise(sprayLength, random), 'bandpass', 1300 * brightness, 0.8);
  const shape = envelope(sprayLength, 0.012, 0.075, holdSeconds);
  let flutter = 0;
  for (let i = 0; i < sprayLength; i += 1) {
    flutter = flutter * 0.995 + (random() * 2 - 1) * 0.005;
    const gain = shape[i] * (1 + flutter * 14);
    out[i + at(0.01)] += (hiss[i] * 0.85 + body[i] * 0.32) * gain;
  }

  const beads = 2 + Math.floor(random() * 2);
  for (let n = 0; n < beads; n += 1) {
    const time = holdSeconds + 0.09 + random() * 0.22;
    const tick = biquad(whiteNoise(at(0.003), random), 'highpass', 3500, 0.7);
    addInto(out, multiply(tick, envelope(tick.length, 0.0002, 0.0008)), at(time), 0.12 + random() * 0.08);
  }
  return normalize(trimTail(fadeEdges(reverb(out, { room: 0.5, damp: 0.6, wet: 0.12, tail: 0.25 }), 0.001, 0.05)), -3);
}

function droplet(random, base) {
  const glide = 0.025 + random() * 0.02;
  return tone(0.16, (time) => base * (1 + 0.9 * (1 - Math.exp(-time / glide))), [
    { ratio: 1, amp: 0.6, decay: 0.035 + random() * 0.02 },
  ], { attack: 0.0008 });
}

/** Beads of water settling into the substrate. */
function mistSettle() {
  const random = rng(808);
  const out = buffer(1.3);
  const soak = biquad(whiteNoise(at(0.9), random), 'lowpass', 2600, 0.7);
  addInto(out, multiply(soak, envelope(soak.length, 0.02, 0.3)), 0, 0.05);
  const times = [0.02, 0.13, 0.27, 0.38, 0.56, 0.71];
  times.forEach((time, n) => {
    addInto(out, droplet(random, 720 + random() * 760), at(time + random() * 0.03), 0.9 - n * 0.11);
  });
  return normalize(trimTail(fadeEdges(reverb(out, { room: 0.8, damp: 0.35, wet: 0.34, tail: 0.7 }), 0.001, 0.1)), -3);
}

const BELL = [
  { ratio: 1, amp: 0.6, decay: 0.55 },
  { ratio: 2.76, amp: 0.22, decay: 0.2 },
  { ratio: 5.4, amp: 0.09, decay: 0.08 },
  { ratio: 8.93, amp: 0.035, decay: 0.04 },
];

/** Glassy rising arpeggio with a sprinkle of shimmer for a perfect landing. */
function perfectChime() {
  const random = rng(77);
  const out = buffer(1.8);
  [1046.5, 1318.51, 1567.98, 2093].forEach((freq, n) => {
    addInto(out, tone(1.4, freq, BELL, { attack: 0.002, detune: 0.8 }), at(n * 0.055), 0.36 - n * 0.03);
  });
  for (let n = 0; n < 14; n += 1) {
    const sparkle = tone(0.2, 3800 + random() * 2600, [{ ratio: 1, amp: 0.4, decay: 0.03 }], { attack: 0.001 });
    addInto(out, sparkle, at(0.18 + random() * 0.55), 0.05 + random() * 0.05);
  }
  return normalize(trimTail(fadeEdges(reverb(out, { room: 0.82, damp: 0.3, wet: 0.36, tail: 0.8 }), 0.001, 0.1)), -3);
}

const MARIMBA = [
  { ratio: 1, amp: 0.7, decay: 0.32 },
  { ratio: 3.93, amp: 0.2, decay: 0.07 },
  { ratio: 9.8, amp: 0.05, decay: 0.025 },
];

/** Warm wooden arpeggio that blooms into a soft chord: a heart was earned. */
function wishGranted() {
  const out = buffer(2.1);
  [392, 523.25, 659.25, 783.99, 1046.5].forEach((freq, n) => {
    addInto(out, tone(1.0, freq, MARIMBA, { attack: 0.002 }), at(n * 0.075), 0.4);
  });
  [523.25, 659.25, 783.99].forEach((freq) => {
    const pad = tone(1.5, freq, [{ ratio: 1, amp: 0.3, decay: 0.7 }, { ratio: 2, amp: 0.06, decay: 0.4 }], {
      attack: 0.22,
      detune: 1.1,
    });
    addInto(out, pad, at(0.32), 0.3);
  });
  return normalize(trimTail(fadeEdges(reverb(out, { room: 0.78, damp: 0.4, wet: 0.3, tail: 0.8 }), 0.001, 0.12)), -3);
}

/** A tiny voiced blip for the guide's chatter. */
function pipBlip(base) {
  const out = tone(0.07, (time) => base * (1 + 0.22 * Math.min(1, time / 0.035)), [
    { ratio: 1, amp: 0.6, decay: 0.03 },
    { ratio: 2, amp: 0.12, decay: 0.018 },
  ], { attack: 0.004 });
  return normalize(fadeEdges(out, 0.002, 0.015), -6);
}

/** Two bright chick peeps for the guide's entrance. */
function pipPeep() {
  const out = buffer(0.5);
  const peep = (top) =>
    tone(0.12, (time) => {
      const unit = time / 0.09;
      return top * (0.78 + 0.32 * Math.sin(Math.min(1, unit) * Math.PI * 0.9));
    }, [
      { ratio: 1, amp: 0.6, decay: 0.06 },
      { ratio: 2, amp: 0.1, decay: 0.03 },
    ], { attack: 0.006 });
  addInto(out, fadeEdges(peep(3100), 0.004, 0.02), 0, 0.8);
  addInto(out, fadeEdges(peep(3500), 0.004, 0.02), at(0.15), 0.7);
  return normalize(trimTail(reverb(out, { room: 0.5, damp: 0.5, wet: 0.14, tail: 0.2 })), -4);
}

writeWav('ember_loop', emberLoop());
writeWav('warm_settle', warmSettle());
writeWav('mist_spritz_a', mistSpritz(11, 0.12, 1));
writeWav('mist_spritz_b', mistSpritz(23, 0.1, 1.08));
writeWav('mist_spritz_c', mistSpritz(37, 0.14, 0.93));
writeWav('mist_settle', mistSettle());
writeWav('perfect_chime', perfectChime());
writeWav('wish_granted', wishGranted());
writeWav('pip_blip_a', pipBlip(1050));
writeWav('pip_blip_b', pipBlip(1240));
writeWav('pip_blip_c', pipBlip(930));
writeWav('pip_peep', pipPeep());

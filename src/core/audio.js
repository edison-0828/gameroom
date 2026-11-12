const key = 'indie-studio-audio-v1';
const defaults = { volume: 50, music: true, effects: true };

export function readAudioSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(key));
    return {
      volume: Number.isInteger(saved?.volume) && saved.volume >= 0 && saved.volume <= 100
        ? saved.volume : defaults.volume,
      music: typeof saved?.music === 'boolean' ? saved.music : defaults.music,
      effects: typeof saved?.effects === 'boolean' ? saved.effects : defaults.effects,
    };
  } catch {
    return { ...defaults };
  }
}

let audioContext;
let master;
let musicBus;
let effectsBus;
let settings = defaults;
let musicTimer;
let nextBeat;
let step = 0;

const beat = 60 / 94;
const chords = {
  C: [48, 60, 64, 67], Am: [45, 57, 60, 64], F: [41, 57, 60, 65],
  G: [43, 55, 59, 62], Em: [40, 55, 59, 64], Dm: [50, 57, 62, 65],
};
// Eight eighth-note positions per bar. A dash leaves room for the previous note to ring.
const song = [
  ['C',  [72, '-', 76, 79, '-', 76, 74, '-']],
  ['Am', [72, '-', 69, '-', 72, 76, 74, '-']],
  ['F',  [72, '-', 77, '-', 76, '-', 72, '-']],
  ['G',  [74, '-', 71, 74, '-', 67, '-', '-']],
  ['C',  [72, '-', 76, 79, '-', 81, 79, '-']],
  ['Em', [76, '-', 74, '-', 71, 74, 76, '-']],
  ['F',  [77, '-', 76, 72, '-', 69, 72, '-']],
  ['G',  [74, '-', 79, '-', 74, '-', 71, '-']],
  ['Am', [69, '-', 72, 76, '-', 74, 72, '-']],
  ['Em', [71, '-', 74, 76, '-', 79, 76, '-']],
  ['F',  [77, '-', 81, '-', 79, 77, 76, '-']],
  ['C',  [76, '-', 72, '-', 67, 72, 74, '-']],
  ['Dm', [77, '-', 76, 74, '-', 72, 69, '-']],
  ['G',  [71, '-', 74, '-', 79, '-', 77, '-']],
  ['C',  [76, '-', 74, 72, '-', 67, 72, '-']],
  ['G',  [74, '-', 71, '-', 67, '-', '-', '-']],
];

const effects = {
  click: { notes: [76], spacing: .06, length: .105, level: .14 },
  preview: { notes: [72, 76, 79], spacing: .085, length: .24, level: .14 },
  ready: { notes: [72, 76, 79], spacing: .095, length: .29, level: .086 },
  release: { notes: [67, 72, 76, 81], spacing: .105, length: .36, level: .09 },
  award: { notes: [72, 76, 79, 84, 83, 84], spacing: .11, length: .42, level: .09 },
};

function tone(bus, note, start, duration, level, shape = 'sine') {
  const oscillator = audioContext.createOscillator();
  const envelope = audioContext.createGain();
  oscillator.type = shape;
  oscillator.frequency.value = 440 * 2 ** ((note - 69) / 12);
  envelope.gain.setValueAtTime(.0001, start);
  envelope.gain.linearRampToValueAtTime(level, start + .012);
  envelope.gain.exponentialRampToValueAtTime(.0001, start + duration);
  oscillator.connect(envelope).connect(bus);
  oscillator.start(start);
  oscillator.stop(start + duration);
  oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); };
}

function scheduleMusic() {
  const now = audioContext.currentTime;
  if (nextBeat < now) nextBeat = now + .025;
  while (nextBeat < now + .18) {
    const [chord, melody] = song[Math.floor(step / 8)];
    const position = step % 8;
    const [bass, ...notes] = chords[chord];
    if (melody[position] !== '-') tone(musicBus, melody[position], nextBeat, beat * .83, .18, 'triangle');
    if (position === 0 || position === 4) tone(musicBus, bass + (position === 4 ? 7 : 0), nextBeat, beat * 1.65, .23);
    if (position === 2 || position === 6) {
      notes.forEach((note, index) => tone(musicBus, note, nextBeat + index * .036, beat * 1.05, .092));
    }
    step = (step + 1) % (song.length * 8);
    nextBeat += beat / 2;
  }
}

function updateMix() {
  if (!audioContext) return;
  const audible = !document.hidden && settings.volume > 0;
  const playing = audible && settings.music && audioContext.state === 'running';
  const now = audioContext.currentTime;
  master.gain.setTargetAtTime(audible ? settings.volume / 100 : 0, now, .018);
  musicBus.gain.setTargetAtTime(playing ? .32 : 0, now, .024);
  effectsBus.gain.setTargetAtTime(audible && settings.effects ? .85 : 0, now, .018);
  if (playing && musicTimer === undefined) {
    nextBeat = now + .2;
    musicTimer = setInterval(scheduleMusic, 45);
  } else if (!playing && musicTimer !== undefined) {
    clearInterval(musicTimer);
    musicTimer = undefined;
  }
}

export function applyAudioSettings(preferences) {
  settings = preferences;
  updateMix();
}

export function writeAudioSettings(settings) {
  try {
    localStorage.setItem(key, JSON.stringify(settings));
    return true;
  } catch {
    return false;
  }
}

function createAudioGraph(AudioContext) {
  const context = new AudioContext();
  try {
    const output = context.createGain();
    const music = context.createGain();
    const effects = context.createGain();
    output.gain.value = music.gain.value = effects.gain.value = 0;
    music.connect(output);
    effects.connect(output);
    output.connect(context.destination);
    context.addEventListener('statechange', updateMix);
    return { context, output, music, effects };
  } catch (error) {
    context.close().catch(() => {});
    throw error;
  }
}

export async function unlockAudio() {
  if ((!settings.music && !settings.effects) || !settings.volume || document.hidden) return false;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return false;
  try {
    if (!audioContext || audioContext.state === 'closed') {
      ({ context: audioContext, output: master, music: musicBus, effects: effectsBus } = createAudioGraph(AudioContext));
    }
    if (audioContext.state !== 'running') {
      // Call resume during the gesture, then wait before scheduling the sound.
      const resumed = audioContext.resume();
      let timeout;
      try {
        await Promise.race([resumed, new Promise(resolve => { timeout = setTimeout(resolve, 800); })]);
      } finally {
        clearTimeout(timeout);
      }
    }
    updateMix();
    return audioContext.state === 'running';
  } catch {
    return false;
  }
}

export function refreshAudioVisibility() {
  updateMix();
  if (audioContext && !document.hidden && audioContext.state !== 'running') unlockAudio();
}

export function playEffect(kind = 'click') {
  if (audioContext?.state !== 'running' || !settings.effects || !settings.volume || document.hidden) return false;
  const { notes, spacing, length, level } = effects[kind];
  try {
    const start = audioContext.currentTime + .012;
    notes.forEach((note, index) => tone(effectsBus, note, start + index * spacing, length, level, 'triangle'));
    return true;
  } catch {
    return false;
  }
}

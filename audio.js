// Web Audio API Synthesizer with Amplified Output
let audioCtx = null;
let masterGain = null;

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.gain.setValueAtTime(1.0, audioCtx.currentTime); // Full master volume
    masterGain.connect(audioCtx.destination);
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

// 1. Staggered Option Pop (Loud, punchy wooden/bubble tap)
function playOptionPopSound(index) {
  if (!audioCtx) initAudio();
  if (audioCtx.state === 'suspended') audioCtx.resume();

  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    // Triangle gives more punch on small phone speakers
    osc.type = 'triangle';

    const baseFreq = 520 + (index * 80);
    osc.frequency.setValueAtTime(baseFreq, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.4, audioCtx.currentTime + 0.12);

    // Boosted initial gain
    gain.gain.setValueAtTime(0.85, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(masterGain);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.12);
  } catch(e) {}
}

// 2. Clear Chime for Selection (Dual-tone crystal ding)
function playSelectSound() {
  if (!audioCtx) initAudio();
  if (audioCtx.state === 'suspended') audioCtx.resume();

  try {
    const now = audioCtx.currentTime;
    
    // Primary Tone (High E6)
    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(1318.51, now);

    gain1.gain.setValueAtTime(0.75, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    osc1.connect(gain1);
    gain1.connect(masterGain);
    osc1.start(now);
    osc1.stop(now + 0.28);

    // Secondary Harmonics (B5) for full bell body
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(987.77, now + 0.03);

    gain2.gain.setValueAtTime(0.65, now + 0.03);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc2.connect(gain2);
    gain2.connect(masterGain);
    osc2.start(now + 0.03);
    osc2.stop(now + 0.3);
  } catch(e) {}
}

// 3. Swoosh for Next Question (Audible dynamic frequency sweep)
function playNextQuestionSound() {
  if (!audioCtx) initAudio();
  if (audioCtx.state === 'suspended') audioCtx.resume();

  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'triangle';

    const now = audioCtx.currentTime;
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(960, now + 0.22);

    gain.gain.setValueAtTime(0.8, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    gain.connect(masterGain);

    osc.start(now);
    osc.stop(now + 0.22);
  } catch(e) {}
}

// 4. Celebration Fanfare on Quiz Submit
function playQuizCompleteSound() {
  if (!audioCtx) initAudio();
  if (audioCtx.state === 'suspended') audioCtx.resume();

  try {
    const notes = [523.25, 659.25, 783.99, 1046.50];

    notes.forEach((freq, index) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

      const startTime = audioCtx.currentTime + (index * 0.13);
      const isLast = (index === notes.length - 1);
      const duration = isLast ? 0.9 : 0.32;

      gain.gain.setValueAtTime(0.01, startTime);
      gain.gain.exponentialRampToValueAtTime(isLast ? 0.8 : 0.55, startTime + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(startTime);
      osc.stop(startTime + duration);
    });
  } catch(e) {}
}

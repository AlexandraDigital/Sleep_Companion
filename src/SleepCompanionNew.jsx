import React, { useEffect, useRef, useState } from 'react';
import './SleepCompanionNew.css';

const MODES = {
  sleep: {
    key: 'sleep',
    label: '🌙 Sleep',
    accentColor: '#7ba3d4',
    glowRgb: '107, 150, 210',
    amFreq: 27,
    breathingHz: 0.10,
    lowpassFreq: 220,
    harmonics: [
      { freq: 27, gain: 0.08, type: 'triangle' },
      { freq: 54, gain: 0.04, type: 'sine' },
      { freq: 81, gain: 0.02, type: 'sine' },
    ],
    noiseRatio: 0.12,
    lines: [
      'Let your whole body get heavy.',
      'Each breath carries you deeper.',
      'Close your eyes. I am here.',
      'You are safe. Let go.',
      'Drift gently into rest.',
      'The world can wait until morning.',
    ],
  },
  anxiety: {
    key: 'anxiety',
    label: '🍃 Anxiety',
    accentColor: '#7abf8a',
    glowRgb: '122, 191, 138',
    amFreq: 50,
    breathingHz: 0.18,
    lowpassFreq: 380,
    harmonics: [
      { freq: 50,  gain: 0.07,  type: 'triangle' },
      { freq: 100, gain: 0.04,  type: 'sine' },
      { freq: 150, gain: 0.025, type: 'sine' },
      { freq: 25,  gain: 0.03,  type: 'sine' },
    ],
    noiseRatio: 0.08,
    lines: [
      'You are here. You are safe.',
      'Right now, only this moment matters.',
      'Let each exhale soften the tension.',
      'Your nervous system is settling.',
      "One breath at a time. You've got this.",
      'I am steady. You can be steady too.',
    ],
  },
  depression: {
    key: 'depression',
    label: '💛 Uplift',
    accentColor: '#d4a84b',
    glowRgb: '212, 168, 75',
    amFreq: 120,
    breathingHz: 0.22,
    lowpassFreq: 580,
    harmonics: [
      { freq: 120, gain: 0.055, type: 'sine' },
      { freq: 60,  gain: 0.05,  type: 'triangle' },
      { freq: 180, gain: 0.03,  type: 'sine' },
      { freq: 240, gain: 0.015, type: 'sine' },
      { freq: 30,  gain: 0.035, type: 'triangle' },
    ],
    noiseRatio: 0.05,
    lines: [
      'Small moments of warmth still count.',
      'You showed up today. That matters.',
      'I am here with you, purring softly.',
      'Healing is not linear — and that\'s okay.',
      'One gentle breath. Then another.',
      'You are cared for more than you know.',
    ],
  },
};

function createPurrAudio(modeKey) {
  const mode = MODES[modeKey];
  let ctx = null;
  let master = null;
  const oscillators = [];
  let noiseSource = null;
  let noiseGain = null;

  const createPinkNoise = (audioCtx) => {
    const bufferSize = audioCtx.sampleRate * 2;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
    return buffer;
  };

  const setup = async () => {
    if (!ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return false;

      ctx = new AudioCtx();
      master = ctx.createGain();
      master.gain.value = 0;
      master.connect(ctx.destination);

      // Breathing envelope LFO — rate tuned per mode
      const breathingLfo = ctx.createOscillator();
      breathingLfo.type = 'sine';
      breathingLfo.frequency.value = mode.breathingHz;
      const breathingLfoGain = ctx.createGain();
      breathingLfoGain.gain.value = 0.007;
      breathingLfo.connect(breathingLfoGain);
      breathingLfoGain.connect(master.gain);
      breathingLfo.start();
      oscillators.push(breathingLfo);

      // AM modulator — frequency tuned per therapeutic range
      const amMod = ctx.createOscillator();
      amMod.type = 'sine';
      amMod.frequency.value = mode.amFreq;
      amMod.start();
      oscillators.push(amMod);

      // Low-pass filter for warmth — cutoff tuned per mode
      const lowpass = ctx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.value = mode.lowpassFreq;
      lowpass.Q.value = 1.2;
      lowpass.connect(master);

      // Harmonics with AM applied
      mode.harmonics.forEach(({ freq, gain, type }) => {
        const osc = ctx.createOscillator();
        const amp = ctx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        osc.detune.value = (Math.random() - 0.5) * 3;
        amp.gain.value = gain;
        const modDepth = ctx.createGain();
        modDepth.gain.value = gain * 0.55;
        amMod.connect(modDepth);
        modDepth.connect(amp.gain);
        osc.connect(amp);
        amp.connect(lowpass);
        osc.start();
        oscillators.push(osc);
      });

      // Pink noise rumble
      const noiseBuffer = createPinkNoise(ctx);
      noiseSource = ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;
      noiseSource.loop = true;
      noiseGain = ctx.createGain();
      noiseGain.gain.value = 0;
      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'lowpass';
      noiseFilter.frequency.value = mode.lowpassFreq * 0.4;
      noiseFilter.Q.value = 0.5;
      noiseSource.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(master);
      noiseSource.start();
    }

    if (ctx.state === 'suspended') await ctx.resume();
    return true;
  };

  return {
    async start(level) {
      const ok = await setup();
      if (!ok || !ctx || !master) return;
      const now = ctx.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(master.gain.value, now);
      master.gain.linearRampToValueAtTime(level, now + 1.4);
      if (noiseGain) {
        noiseGain.gain.setValueAtTime(0, now);
        noiseGain.gain.linearRampToValueAtTime(level * mode.noiseRatio, now + 2);
      }
    },
    stop() {
      if (!ctx || !master) return;
      const now = ctx.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(master.gain.value, now);
      master.gain.linearRampToValueAtTime(0, now + 1.8);
      if (noiseGain) {
        noiseGain.gain.linearRampToValueAtTime(0, now + 1.8);
      }
    },
    setLevel(level) {
      if (!ctx || !master) return;
      master.gain.setTargetAtTime(level, ctx.currentTime, 0.45);
      if (noiseGain) {
        noiseGain.gain.setTargetAtTime(level * mode.noiseRatio, ctx.currentTime, 0.45);
      }
    },
    dispose() {
      try { oscillators.forEach((osc) => osc.stop()); } catch (_) {}
      try { noiseSource?.stop(); } catch (_) {}
      if (ctx) ctx.close().catch(() => {});
    },
  };
}

function TabbyCat({ isPurring, glowRgb }) {
  return (
    <svg
      viewBox="0 0 200 260"
      width="160"
      height="208"
      xmlns="http://www.w3.org/2000/svg"
      className={`tabby-cat ${isPurring ? 'is-purring' : ''}`}
      style={isPurring ? { filter: `drop-shadow(0 0 18px rgba(${glowRgb}, 0.45))` } : {}}
      aria-hidden="true"
    >
      {/* TAIL */}
      <g className={isPurring ? 'tail-wag' : ''} style={{ transformOrigin: '145px 220px' }}>
        <path
          d="M145 220 Q175 200 185 170 Q195 140 175 120 Q165 110 158 125 Q170 140 162 165 Q155 185 135 205"
          fill="none" stroke="#c8883a" strokeWidth="12" strokeLinecap="round"
        />
        <path
          d="M145 220 Q175 200 185 170 Q195 140 175 120 Q165 110 158 125 Q170 140 162 165 Q155 185 135 205"
          fill="none" stroke="#a06828" strokeWidth="5" strokeLinecap="round" strokeDasharray="12,18"
        />
      </g>

      {/* BODY */}
      <ellipse cx="100" cy="195" rx="52" ry="55" fill="#d9924a" />
      <path d="M72 165 Q100 162 128 165" fill="none" stroke="#b56a25" strokeWidth="3" opacity="0.7" />
      <path d="M68 178 Q100 175 132 178" fill="none" stroke="#b56a25" strokeWidth="3" opacity="0.6" />
      <path d="M66 193 Q100 190 134 193" fill="none" stroke="#b56a25" strokeWidth="3" opacity="0.5" />
      <ellipse cx="100" cy="205" rx="28" ry="32" fill="#f0c07a" />

      {/* PAWS */}
      <ellipse cx="68" cy="242" rx="18" ry="10" fill="#d9924a" />
      <ellipse cx="68" cy="242" rx="12" ry="7" fill="#f0c07a" />
      <ellipse cx="132" cy="242" rx="18" ry="10" fill="#d9924a" />
      <ellipse cx="132" cy="242" rx="12" ry="7" fill="#f0c07a" />
      <circle cx="60" cy="245" r="3" fill="#e8a86a" />
      <circle cx="68" cy="247" r="3" fill="#e8a86a" />
      <circle cx="76" cy="245" r="3" fill="#e8a86a" />
      <circle cx="124" cy="245" r="3" fill="#e8a86a" />
      <circle cx="132" cy="247" r="3" fill="#e8a86a" />
      <circle cx="140" cy="245" r="3" fill="#e8a86a" />

      {/* HEAD */}
      <ellipse cx="100" cy="112" rx="52" ry="48" fill="#d9924a" />

      {/* EARS */}
      <polygon points="55,80 44,48 76,70" fill="#c8803a" />
      <polygon points="58,78 50,56 72,72" fill="#e8a88a" />
      <polygon points="145,80 156,48 124,70" fill="#c8803a" />
      <polygon points="142,78 150,56 128,72" fill="#e8a88a" />

      {/* TABBY M forehead stripes */}
      <path d="M85 80 Q90 72 95 80" fill="none" stroke="#a06020" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M95 80 Q100 72 105 80" fill="none" stroke="#a06020" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M105 80 Q110 72 115 80" fill="none" stroke="#a06020" strokeWidth="2.5" strokeLinecap="round" />
      {/* cheek stripes left */}
      <path d="M56 105 Q64 102 66 110" fill="none" stroke="#a06020" strokeWidth="2" strokeLinecap="round" />
      <path d="M54 116 Q63 115 64 123" fill="none" stroke="#a06020" strokeWidth="2" strokeLinecap="round" />
      {/* cheek stripes right */}
      <path d="M144 105 Q136 102 134 110" fill="none" stroke="#a06020" strokeWidth="2" strokeLinecap="round" />
      <path d="M146 116 Q137 115 136 123" fill="none" stroke="#a06020" strokeWidth="2" strokeLinecap="round" />

      {/* EYES */}
      <ellipse cx="80" cy="108" rx="13" ry="11" fill="#e8c87a" />
      <ellipse cx="80" cy="108" rx="7" ry="9" fill="#1a1008" />
      <circle cx="77" cy="105" r="3" fill="white" opacity="0.6" />
      <ellipse cx="120" cy="108" rx="13" ry="11" fill="#e8c87a" />
      <ellipse cx="120" cy="108" rx="7" ry="9" fill="#1a1008" />
      <circle cx="117" cy="105" r="3" fill="white" opacity="0.6" />

      {/* NOSE */}
      <path d="M95 124 L100 118 L105 124 Q100 128 95 124 Z" fill="#e8908a" />

      {/* MOUTH */}
      <path d="M100 127 Q95 132 90 130" fill="none" stroke="#c07060" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M100 127 Q105 132 110 130" fill="none" stroke="#c07060" strokeWidth="1.5" strokeLinecap="round" />

      {/* WHISKERS left */}
      <line x1="55" y1="122" x2="88" y2="126" stroke="#f5e8c8" strokeWidth="1.2" opacity="0.85" />
      <line x1="52" y1="127" x2="88" y2="129" stroke="#f5e8c8" strokeWidth="1.2" opacity="0.85" />
      <line x1="55" y1="132" x2="88" y2="132" stroke="#f5e8c8" strokeWidth="1.2" opacity="0.85" />
      {/* WHISKERS right */}
      <line x1="145" y1="122" x2="112" y2="126" stroke="#f5e8c8" strokeWidth="1.2" opacity="0.85" />
      <line x1="148" y1="127" x2="112" y2="129" stroke="#f5e8c8" strokeWidth="1.2" opacity="0.85" />
      <line x1="145" y1="132" x2="112" y2="132" stroke="#f5e8c8" strokeWidth="1.2" opacity="0.85" />
    </svg>
  );
}

export default function SleepCompanionNew() {
  const [modeKey, setModeKey] = useState('sleep');
  const [lineIndex, setLineIndex] = useState(0);
  const [isPurring, setIsPurring] = useState(false);
  const [volume, setVolume] = useState(0.1);
  const [audioHint, setAudioHint] = useState('Tap the cat to start purring.');
  const audioRef = useRef(null);

  const mode = MODES[modeKey];

  // Rotate calm lines for current mode
  useEffect(() => {
    setLineIndex(0);
    const interval = window.setInterval(() => {
      setLineIndex((c) => (c + 1) % mode.lines.length);
    }, 5000);
    return () => window.clearInterval(interval);
  }, [modeKey]);

  // Rebuild audio engine when mode changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.dispose();
      audioRef.current = null;
    }
    if (isPurring) {
      const engine = createPurrAudio(modeKey);
      audioRef.current = engine;
      engine.start(volume);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modeKey]);

  // Lazy init
  if (!audioRef.current && typeof window !== 'undefined') {
    audioRef.current = createPurrAudio(modeKey);
  }

  useEffect(() => {
    if (isPurring) audioRef.current?.setLevel(volume);
  }, [volume, isPurring]);

  useEffect(() => () => {
    audioRef.current?.dispose();
  }, []);

  const startPurr = async () => {
    try {
      await audioRef.current?.start(volume);
      setIsPurring(true);
      setAudioHint('Purring... Tap to stop.');
    } catch (_) {
      setAudioHint('Your browser blocked audio. Tap again to allow sound.');
    }
  };

  const stopPurr = () => {
    setIsPurring(false);
    audioRef.current?.stop();
    setAudioHint('Purring stopped. Tap to start again.');
  };

  const togglePurr = () => {
    if (isPurring) stopPurr();
    else startPurr();
  };

  const switchMode = (key) => {
    if (key === modeKey) return;
    if (isPurring) stopPurr();
    setModeKey(key);
    setAudioHint('Tap the cat to start purring.');
  };

  return (
    <main className="scn-shell">
      <section className="scn-card" style={{ '--accent': mode.accentColor }}>

        {/* MODE TABS */}
        <div className="scn-mode-tabs" role="tablist" aria-label="Therapeutic mode">
          {Object.values(MODES).map((m) => (
            <button
              key={m.key}
              role="tab"
              aria-selected={m.key === modeKey}
              className={`scn-mode-tab ${m.key === modeKey ? 'active' : ''}`}
              style={m.key === modeKey ? { '--tab-color': m.accentColor } : {}}
              onClick={() => switchMode(m.key)}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* MODE DESCRIPTION */}
        <p className="scn-mode-desc">
          {modeKey === 'sleep' && '27 Hz · deep delta · slow breath'}
          {modeKey === 'anxiety' && '50 Hz · steady grounding · calming rhythm'}
          {modeKey === 'depression' && '120 Hz · warm harmonics · gentle uplift'}
        </p>

        {/* CAT */}
        <button type="button" className="scn-cat-wrap" onClick={togglePurr} aria-label="Toggle soothing purr">
          <TabbyCat isPurring={isPurring} glowRgb={mode.glowRgb} />
        </button>

        <h1>Sleep Companion</h1>
        <p className="scn-line">{mode.lines[lineIndex]}</p>

        <button type="button" className="scn-btn" onClick={togglePurr}>
          {isPurring ? 'stop soothing purr' : 'start soothing purr'}
        </button>
        <p className="scn-hint">{audioHint}</p>

        <label className="scn-volume" htmlFor="purr-range">
          <span>Soothing purr volume</span>
          <input
            id="purr-range"
            type="range"
            min="0.02"
            max="0.2"
            step="0.01"
            value={volume}
            onChange={(event) => setVolume(Number(event.target.value))}
          />
        </label>
      </section>
    </main>
  );
}

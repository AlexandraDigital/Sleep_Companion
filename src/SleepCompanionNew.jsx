import React, { useEffect, useRef, useState } from 'react';
import './SleepCompanionNew.css';

const CALM_LINES = [
  'Hi friend. You are safe with me.',
  'Let your shoulders drop a little.',
  'Slow breath in, softer breath out.',
  'I am here. No rush. No pressure.',
];

function createPurrAudio() {
  let ctx;
  let master;
  let lowpass;
  let lfo;
  let lfoGain;
  const oscillators = [];

  const setup = async () => {
    if (!ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return false;

      ctx = new AudioCtx();
      master = ctx.createGain();
      master.gain.value = 0;

      lowpass = ctx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.value = 220;
      lowpass.Q.value = 0.8;

      lowpass.connect(master);
      master.connect(ctx.destination);

      lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 7.2;
      lfoGain = ctx.createGain();
      lfoGain.gain.value = 0.01;
      lfo.connect(lfoGain);
      lfoGain.connect(master.gain);
      lfo.start();

      [
        { type: 'triangle', freq: 28, gain: 0.06 },
        { type: 'sine', freq: 56, gain: 0.03 },
        { type: 'sine', freq: 84, gain: 0.01 },
      ].forEach(({ type, freq, gain }) => {
        const osc = ctx.createOscillator();
        const amp = ctx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        osc.detune.value = (Math.random() - 0.5) * 2;
        amp.gain.value = gain;
        osc.connect(amp);
        amp.connect(lowpass);
        osc.start();
        oscillators.push(osc);
      });
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
    },
    stop() {
      if (!ctx || !master) return;
      const now = ctx.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(master.gain.value, now);
      master.gain.linearRampToValueAtTime(0, now + 1.8);
    },
    setLevel(level) {
      if (!ctx || !master) return;
      master.gain.setTargetAtTime(level, ctx.currentTime, 0.45);
    },
    dispose() {
      try {
        oscillators.forEach((osc) => osc.stop());
      } catch {
        // no-op
      }
      if (ctx) ctx.close().catch(() => {});
    },
  };
}

export default function SleepCompanionNew() {
  const [lineIndex, setLineIndex] = useState(0);
  const [isPurring, setIsPurring] = useState(false);
  const [volume, setVolume] = useState(0.07);
  const audioRef = useRef(null);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setLineIndex((current) => (current + 1) % CALM_LINES.length);
    }, 5000);
    return () => window.clearInterval(interval);
  }, []);

  if (!audioRef.current && typeof window !== 'undefined') {
    audioRef.current = createPurrAudio();
  }

  useEffect(() => {
    if (isPurring) audioRef.current?.setLevel(volume);
  }, [volume, isPurring]);

  useEffect(() => () => {
    audioRef.current?.dispose();
  }, []);

  const startPurr = async () => {
    setIsPurring(true);
    await audioRef.current?.start(volume);
  };

  const stopPurr = () => {
    setIsPurring(false);
    audioRef.current?.stop();
  };

  return (
    <main className="scn-shell">
      <section className="scn-card">
        <div className="scn-cat-wrap" onMouseDown={startPurr} onMouseUp={stopPurr} onMouseLeave={stopPurr}>
          <div className={`scn-cat ${isPurring ? 'is-purring' : ''}`} aria-hidden="true">
            <div className="scn-ear scn-ear-left" />
            <div className="scn-ear scn-ear-right" />
            <div className="scn-face">
              <span className="scn-eye" />
              <span className="scn-eye" />
              <span className="scn-nose" />
            </div>
          </div>
        </div>

        <h1>Sleep Companion</h1>
        <p className="scn-line">{CALM_LINES[lineIndex]}</p>

        <button type="button" className="scn-btn" onMouseDown={startPurr} onMouseUp={stopPurr} onMouseLeave={stopPurr}>
          {isPurring ? 'purring softly… release to stop' : 'hold to start soothing purr'}
        </button>

        <label className="scn-volume" htmlFor="purr-range">
          <span>Soothing purr volume</span>
          <input
            id="purr-range"
            type="range"
            min="0.02"
            max="0.16"
            step="0.01"
            value={volume}
            onChange={(event) => setVolume(Number(event.target.value))}
          />
        </label>
      </section>
    </main>
  );
}


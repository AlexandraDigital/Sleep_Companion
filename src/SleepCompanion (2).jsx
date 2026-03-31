import { useEffect, useMemo, useRef, useState } from 'react';
import './SleepCompanion.css';

const DUST = Array.from({ length: 18 }, (_, i) => ({
  id: i,
  left: `${8 + Math.random() * 84}%`,
  bottom: `${6 + Math.random() * 58}%`,
  size: (Math.random() * 2.4 + 0.9).toFixed(2),
  dur: `${6 + Math.random() * 8}s`,
  delay: `-${Math.random() * 8}s`,
}));

const MESSAGES = {
  idle: [
    'tap me whenever you need a little comfort…',
    'i am right here beside you.',
    'slow down. you are safe tonight.',
  ],
  petted: [
    'purrr… that was a very good pet.',
    'mrrp. i feel calmer with you too.',
    'there you go — softer already.',
    'i like when you pet between my ears.',
  ],
  kneading: [
    'tiny biscuits, made just for this moment.',
    'this is my safest sleepy ritual.',
    'soft paws, slow breathing, quiet room.',
  ],
  bliss: [
    'that is the exact kind of cozy i wanted.',
    'we can stay in this peaceful little bubble.',
    'warm, sleepy, and completely unhurried.',
  ],
  sleeping: [
    'eyes closed… still here with you…',
    'zzz… keeping watch while we rest…',
    'shh. let the room get gentler now…',
  ],
};

const BREATHING = [
  { word: 'inhale', secs: 4, note: 'Breathe in slowly through your nose.' },
  { word: 'hold', secs: 4, note: 'Hold gently. No strain, just stillness.' },
  { word: 'exhale', secs: 6, note: 'Let the exhale be longer than the inhale.' },
  { word: 'pause', secs: 2, note: 'Rest in the quiet before the next breath.' },
];

const ANXIETY_TOOLS = [
  {
    icon: '🖐',
    title: '5-4-3-2-1 grounding',
    body: 'Name 5 things you see, 4 you feel, 3 you hear, 2 you smell, and 1 you taste to pull your mind back into the room.',
  },
  {
    icon: '🫁',
    title: 'Box breathing',
    body: 'Inhale 4 seconds, hold 4, exhale 4, hold 4. A few slow rounds can reduce the sense of urgency in your body.',
  },
  {
    icon: '🧊',
    title: 'Cool water reset',
    body: 'Splash cool water on your face or hold something cold. The temperature shift can interrupt the panic spiral.',
  },
  {
    icon: '🎵',
    title: 'Hum softly',
    body: 'A long low hum can help settle your breathing and gently activate your vagus nerve.',
  },
  {
    icon: '✍️',
    title: 'Brain dump',
    body: 'Write every thought down. Once it is on paper, your brain does not need to hold it as tightly.',
  },
];

const SLEEP_TOOLS = [
  {
    icon: '🌡️',
    title: 'Cool room',
    body: 'A slightly cool room helps your body shift toward sleep. Aim for comfort, not cold.',
  },
  {
    icon: '📵',
    title: 'Dim the inputs',
    body: 'Lower brightness, put your phone down, and let your brain stop expecting new information.',
  },
  {
    icon: '🧸',
    title: 'Progressive release',
    body: 'Tense one muscle group for a few seconds, then release. Start at your toes and move upward.',
  },
  {
    icon: '☁️',
    title: 'Cloud thoughts',
    body: 'Notice thoughts without grabbing them. Let them pass by like weather moving across the sky.',
  },
  {
    icon: '🌙',
    title: 'No forcing',
    body: 'Sleep comes more easily when you create the conditions for rest rather than chasing it.',
  },
];

const GROUNDING = [
  'Name 5 things you can see right now.',
  'Name 4 things you can physically feel.',
  'Name 3 sounds you can hear.',
  'Name 2 things you can smell.',
  'Name 1 thing you can taste.',
];

function createPurrEngine() {
  let ctx = null;
  let master = null;
  let filter = null;
  let lfo = null;
  let lfoGain = null;
  let oscillators = [];
  let oscillatorGains = [];

  const ensure = async () => {
    if (!ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return false;
      ctx = new AudioCtx();
      master = ctx.createGain();
      master.gain.value = 0;
      filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 340;
      filter.Q.value = 0.7;
      filter.connect(master);
      master.connect(ctx.destination);

      lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 24;
      lfoGain = ctx.createGain();
      lfoGain.gain.value = 0.018;
      lfo.connect(lfoGain);
      lfoGain.connect(master.gain);
      lfo.start();

      [
        { type: 'triangle', freq: 52, gain: 0.085 },
        { type: 'sine', freq: 104, gain: 0.045 },
        { type: 'sine', freq: 156, gain: 0.02 },
      ].forEach(({ type, freq, gain }) => {
        const osc = ctx.createOscillator();
        const amp = ctx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        osc.detune.value = (Math.random() - 0.5) * 4;
        amp.gain.value = gain;
        osc.connect(amp);
        amp.connect(filter);
        osc.start();
        oscillators.push(osc);
        oscillatorGains.push(amp);
      });
    }

    if (ctx.state === 'suspended') await ctx.resume();
    return true;
  };

  return {
    async start(volume = 0.11) {
      const ok = await ensure();
      if (!ok || !ctx || !master) return;
      const now = ctx.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(master.gain.value, now);
      master.gain.linearRampToValueAtTime(volume, now + 0.9);
    },
    stop() {
      if (!ctx || !master) return;
      const now = ctx.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(master.gain.value, now);
      master.gain.linearRampToValueAtTime(0, now + 1.6);
    },
    setVolume(volume) {
      if (!ctx || !master) return;
      master.gain.setTargetAtTime(volume, ctx.currentTime, 0.25);
    },
    dispose() {
      try {
        oscillators.forEach((osc) => osc.stop());
      } catch {
        // no-op
      }
      oscillatorGains = [];
      oscillators = [];
      if (ctx) {
        ctx.close().catch(() => {});
      }
      ctx = null;
      master = null;
      filter = null;
      lfo = null;
      lfoGain = null;
    },
  };
}

function Cat({ mood, petting, kneading }) {
  const sleeping = mood === 'sleeping';
  const content = useMemo(() => ({
    happy: mood === 'petted' || mood === 'kneading' || mood === 'bliss',
    sleeping,
  }), [mood, sleeping]);

  return (
    <svg
      viewBox="0 0 240 220"
      aria-hidden="true"
      style={{ width: '100%', height: '100%', overflow: 'visible', filter: 'drop-shadow(0 12px 24px rgba(114, 59, 12, 0.24))' }}
    >
      <defs>
        <radialGradient id="catFur" cx="42%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#f2bb69" />
          <stop offset="42%" stopColor="#d28a35" />
          <stop offset="100%" stopColor="#8e4f17" />
        </radialGradient>
        <radialGradient id="catFurDark" cx="50%" cy="50%" r="65%">
          <stop offset="0%" stopColor="#9f591b" />
          <stop offset="100%" stopColor="#6d370c" />
        </radialGradient>
        <radialGradient id="catCream" cx="50%" cy="44%" r="60%">
          <stop offset="0%" stopColor="#f6eddc" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#e0bb79" stopOpacity="0.08" />
        </radialGradient>
        <radialGradient id="catEar" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#f0b0a2" />
          <stop offset="100%" stopColor="#d97f73" />
        </radialGradient>
        <radialGradient id="catNose" cx="38%" cy="34%" r="60%">
          <stop offset="0%" stopColor="#eab1b0" />
          <stop offset="100%" stopColor="#c16d67" />
        </radialGradient>
        <radialGradient id="catEye" cx="34%" cy="26%" r="66%">
          <stop offset="0%" stopColor="#e7c962" />
          <stop offset="48%" stopColor="#ca8c25" />
          <stop offset="100%" stopColor="#6f3908" />
        </radialGradient>
        <radialGradient id="catPaw" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor="#f4cdc4" />
          <stop offset="100%" stopColor="#d28d84" />
        </radialGradient>
        <radialGradient id="catShadow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(0,0,0,0.34)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0)" />
        </radialGradient>
      </defs>

      <style>{`
        .cat-body { transform-origin: 120px 156px; animation: body-breathe 4.8s ease-in-out infinite; }
        .cat-head { transform-origin: 120px 92px; animation: ${petting ? 'head-nuzzle 0.55s ease-in-out infinite alternate' : 'head-idle 6.2s ease-in-out infinite'}; }
        .cat-tail { transform-origin: 48px 166px; animation: ${content.happy ? 'tail-happy 0.9s ease-in-out infinite alternate' : 'tail-idle 5.2s ease-in-out infinite alternate'}; }
        .cat-paws { transform-origin: 120px 188px; animation: ${kneading ? 'paws-knead 0.85s ease-in-out infinite alternate' : 'none'}; }
        .cat-ear-left { transform-origin: 74px 52px; animation: ${content.happy ? 'ear-left-happy 0.35s ease forwards' : 'none'}; }
        .cat-ear-right { transform-origin: 166px 52px; animation: ${content.happy ? 'ear-right-happy 0.35s ease forwards' : 'none'}; }
        .cat-blink-left, .cat-blink-right { transform-box: fill-box; animation: blink 7.5s ease-in-out infinite; }
        .cat-blink-right { animation-delay: 0.12s; }
        @keyframes body-breathe { 0%,100% { transform: scaleY(1) scaleX(1); } 50% { transform: scaleY(1.03) scaleX(0.992); } }
        @keyframes head-idle { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-1.5px); } }
        @keyframes head-nuzzle { from { transform: rotate(-2.4deg) translateX(-2px); } to { transform: rotate(2.4deg) translateX(2px); } }
        @keyframes tail-idle { from { transform: rotate(-4deg); } to { transform: rotate(5deg); } }
        @keyframes tail-happy { from { transform: rotate(-9deg); } to { transform: rotate(14deg); } }
        @keyframes paws-knead { from { transform: translateY(-2.5px) rotate(-1.6deg); } to { transform: translateY(3.5px) rotate(1.8deg); } }
        @keyframes ear-left-happy { to { transform: translateY(-3px) rotate(-2deg); } }
        @keyframes ear-right-happy { to { transform: translateY(-3px) rotate(2deg); } }
        @keyframes blink { 0%,90%,100% { transform: scaleY(1); } 94% { transform: scaleY(0.08); } }
      `}</style>

      <ellipse cx="121" cy="206" rx="74" ry="10" fill="url(#catShadow)" />

      <g className="cat-tail">
        <path d="M 60 170 C 17 154 8 124 20 102 C 28 86 47 88 52 108" stroke="#9f591b" strokeWidth="20" fill="none" strokeLinecap="round" />
        <path d="M 60 170 C 17 154 8 124 20 102 C 28 86 47 88 52 108" stroke="#efbc6b" strokeWidth="8" fill="none" strokeLinecap="round" opacity="0.23" />
        <path d="M 28 132 C 21 126 21 118 27 114" stroke="#6d370c" strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.4" />
      </g>

      <g className="cat-body">
        <ellipse cx="122" cy="157" rx="68" ry="45" fill="url(#catFur)" />
        <ellipse cx="122" cy="166" rx="46" ry="31" fill="url(#catCream)" opacity="0.8" />
        <path d="M 87 131 Q 101 121 118 126 Q 136 131 153 124" stroke="#7f430e" strokeWidth="5" fill="none" strokeLinecap="round" opacity="0.46" />
        <path d="M 80 145 Q 97 138 109 141" stroke="#7f430e" strokeWidth="3.3" fill="none" strokeLinecap="round" opacity="0.26" />
        <path d="M 134 141 Q 145 138 161 145" stroke="#7f430e" strokeWidth="3.3" fill="none" strokeLinecap="round" opacity="0.26" />
      </g>

      <g className="cat-paws">
        <g>
          <ellipse cx="90" cy="188" rx="21" ry="12" fill="url(#catFur)" />
          <ellipse cx="90" cy="192" rx="6" ry="4.5" fill="url(#catPaw)" opacity="0.9" />
          <ellipse cx="80" cy="190" rx="4.8" ry="3.6" fill="url(#catPaw)" opacity="0.8" />
          <ellipse cx="100" cy="190" rx="4.8" ry="3.6" fill="url(#catPaw)" opacity="0.8" />
        </g>
        <g>
          <ellipse cx="150" cy="188" rx="21" ry="12" fill="url(#catFur)" />
          <ellipse cx="150" cy="192" rx="6" ry="4.5" fill="url(#catPaw)" opacity="0.9" />
          <ellipse cx="140" cy="190" rx="4.8" ry="3.6" fill="url(#catPaw)" opacity="0.8" />
          <ellipse cx="160" cy="190" rx="4.8" ry="3.6" fill="url(#catPaw)" opacity="0.8" />
        </g>
      </g>

      <g className="cat-head">
        <ellipse cx="120" cy="88" rx="50" ry="46" fill="url(#catFur)" />
        <ellipse cx="120" cy="96" rx="22" ry="18" fill="url(#catCream)" opacity="0.55" />

        <g className="cat-ear-left">
          <path d="M 74 76 L 57 38 L 93 59 Z" fill="url(#catFur)" />
          <path d="M 76 72 L 62 44 L 87 60 Z" fill="url(#catEar)" opacity="0.75" />
        </g>
        <g className="cat-ear-right">
          <path d="M 166 76 L 183 38 L 147 59 Z" fill="url(#catFur)" />
          <path d="M 164 72 L 178 44 L 153 60 Z" fill="url(#catEar)" opacity="0.75" />
        </g>

        <path d="M 100 62 Q 108 56 114 63" stroke="#7f430e" strokeWidth="2.6" fill="none" strokeLinecap="round" opacity="0.5" />
        <path d="M 126 63 Q 132 56 140 62" stroke="#7f430e" strokeWidth="2.6" fill="none" strokeLinecap="round" opacity="0.5" />
        <path d="M 91 74 Q 101 71 106 79" stroke="#7f430e" strokeWidth="2.8" fill="none" strokeLinecap="round" opacity="0.4" />
        <path d="M 149 79 Q 154 71 164 74" stroke="#7f430e" strokeWidth="2.8" fill="none" strokeLinecap="round" opacity="0.4" />

        {content.sleeping ? (
          <>
            <path d="M 92 92 Q 103 86 113 92" stroke="#6b360b" strokeWidth="3.5" fill="none" strokeLinecap="round" />
            <path d="M 127 92 Q 137 86 148 92" stroke="#6b360b" strokeWidth="3.5" fill="none" strokeLinecap="round" />
          </>
        ) : content.happy ? (
          <>
            <path d="M 90 94 Q 102 83 114 94" stroke="#6b360b" strokeWidth="3.8" fill="none" strokeLinecap="round" />
            <path d="M 126 94 Q 138 83 150 94" stroke="#6b360b" strokeWidth="3.8" fill="none" strokeLinecap="round" />
          </>
        ) : (
          <>
            <g className="cat-blink-left" style={{ transformOrigin: '102px 92px' }}>
              <ellipse cx="102" cy="92" rx="13" ry="10" fill="#241107" />
              <ellipse cx="102" cy="92" rx="10.5" ry="8.7" fill="url(#catEye)" />
              <ellipse cx="102" cy="92" rx="2.7" ry="6.3" fill="#120702" />
              <circle cx="105" cy="88" r="2.1" fill="#fff" opacity="0.95" />
              <circle cx="98" cy="95" r="1.2" fill="#fff" opacity="0.35" />
            </g>
            <g className="cat-blink-right" style={{ transformOrigin: '138px 92px' }}>
              <ellipse cx="138" cy="92" rx="13" ry="10" fill="#241107" />
              <ellipse cx="138" cy="92" rx="10.5" ry="8.7" fill="url(#catEye)" />
              <ellipse cx="138" cy="92" rx="2.7" ry="6.3" fill="#120702" />
              <circle cx="141" cy="88" r="2.1" fill="#fff" opacity="0.95" />
              <circle cx="134" cy="95" r="1.2" fill="#fff" opacity="0.35" />
            </g>
          </>
        )}

        <ellipse cx="120" cy="108" rx="20" ry="14" fill="url(#catCream)" opacity="0.72" />
        <path d="M 116 108 L 120 105 L 124 108 L 120 112 Z" fill="url(#catNose)" />
        <line x1="120" y1="112" x2="120" y2="116" stroke="#b66b66" strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />
        <path d="M 120 116 Q 113 121 110 119" stroke="#915050" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        <path d="M 120 116 Q 127 121 130 119" stroke="#915050" strokeWidth="1.8" fill="none" strokeLinecap="round" />

        {[
          [89, 108, 56, 104],
          [89, 114, 54, 114],
          [90, 119, 58, 123],
          [151, 108, 184, 104],
          [151, 114, 186, 114],
          [150, 119, 182, 123],
        ].map(([x1, y1, x2, y2], i) => (
          <line
            key={`${x1}-${i}`}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="#f4ead2"
            strokeWidth="1.15"
            strokeLinecap="round"
            opacity={0.62}
          />
        ))}
      </g>
    </svg>
  );
}

export default function SleepCompanion() {
  const [tab, setTab] = useState('companion');
  const [mood, setMood] = useState('idle');
  const [purring, setPurring] = useState(false);
  const [petting, setPetting] = useState(false);
  const [kneading, setKneading] = useState(false);
  const [bond, setBond] = useState(20);
  const [petCount, setPetCount] = useState(0);
  const [speech, setSpeech] = useState(MESSAGES.idle[0]);
  const [sparkles, setSparkles] = useState([]);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [timerSecs, setTimerSecs] = useState(null);
  const [timerOn, setTimerOn] = useState(false);
  const [ambient, setAmbient] = useState(null);
  const [groundDone, setGroundDone] = useState([]);
  const [purrVolume, setPurrVolume] = useState(0.11);

  const purrRef = useRef(null);
  const speechTimeout = useRef(null);
  const moodTimeout = useRef(null);
  const purrTimeout = useRef(null);
  const petTimeout = useRef(null);
  const kneadTimeout = useRef(null);
  const breatheTimeout = useRef(null);
  const timerInterval = useRef(null);

  if (!purrRef.current && typeof window !== 'undefined') {
    purrRef.current = createPurrEngine();
  }

  useEffect(() => {
    if (tab !== 'breathe') return undefined;
    let index = 0;

    const loop = () => {
      setPhaseIndex(index);
      breatheTimeout.current = window.setTimeout(() => {
        index = (index + 1) % BREATHING.length;
        loop();
      }, BREATHING[index].secs * 1000);
    };

    loop();
    return () => window.clearTimeout(breatheTimeout.current);
  }, [tab]);

  useEffect(() => {
    if (!timerOn || !(timerSecs > 0)) return undefined;
    timerInterval.current = window.setInterval(() => {
      setTimerSecs((seconds) => {
        if (seconds === null) return null;
        if (seconds <= 1) {
          window.clearInterval(timerInterval.current);
          setTimerOn(false);
          return 0;
        }
        return seconds - 1;
      });
    }, 1000);

    return () => window.clearInterval(timerInterval.current);
  }, [timerOn, timerSecs]);

  useEffect(() => {
    if (mood === 'idle') return undefined;
    moodTimeout.current = window.setTimeout(() => setMood('idle'), 9000);
    return () => window.clearTimeout(moodTimeout.current);
  }, [mood]);

  useEffect(() => {
    if (purring) {
      purrRef.current?.setVolume(purrVolume);
    }
  }, [purrVolume, purring]);

  useEffect(() => () => {
    window.clearTimeout(speechTimeout.current);
    window.clearTimeout(moodTimeout.current);
    window.clearTimeout(purrTimeout.current);
    window.clearTimeout(petTimeout.current);
    window.clearTimeout(kneadTimeout.current);
    window.clearTimeout(breatheTimeout.current);
    window.clearInterval(timerInterval.current);
    purrRef.current?.dispose();
  }, []);

  const activeBreath = BREATHING[phaseIndex];

  const say = (message) => {
    setSpeech(message);
    window.clearTimeout(speechTimeout.current);
    speechTimeout.current = window.setTimeout(() => setSpeech(''), 5500);
  };

  const startPurr = async () => {
    await purrRef.current?.start(purrVolume);
    setPurring(true);
  };

  const stopPurr = () => {
    purrRef.current?.stop();
    setPurring(false);
  };

  const spawnSparkles = (x, y) => {
    const glyphs = ['🐾', '✨', '💛', '🌙', '⭐'];
    const next = Array.from({ length: 4 }, (_, i) => ({
      id: `${Date.now()}-${i}`,
      x: x + (Math.random() - 0.5) * 58,
      y: y + (Math.random() - 0.5) * 30,
      glyph: glyphs[Math.floor(Math.random() * glyphs.length)],
    }));
    setSparkles((prev) => [...prev, ...next]);
    window.setTimeout(() => {
      setSparkles((prev) => prev.filter((item) => !next.some((added) => added.id === item.id)));
    }, 1200);
  };

  const handlePet = async (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const touch = event.changedTouches?.[0] || event.touches?.[0];
    const x = touch?.clientX ?? event.clientX ?? rect.left + rect.width / 2;
    const y = touch?.clientY ?? event.clientY ?? rect.top + rect.height / 2;

    spawnSparkles(x, y);
    const nextCount = petCount + 1;
    setPetCount(nextCount);
    setBond((value) => Math.min(100, value + 4));
    setPetting(true);
    window.clearTimeout(petTimeout.current);
    petTimeout.current = window.setTimeout(() => setPetting(false), 500);

    const nextMood = nextCount % 8 === 0 ? 'bliss' : nextCount % 4 === 0 ? 'kneading' : 'petted';
    setMood(nextMood);
    if (nextMood === 'kneading') {
      setKneading(true);
      window.clearTimeout(kneadTimeout.current);
      kneadTimeout.current = window.setTimeout(() => setKneading(false), 3000);
    }

    const pool = MESSAGES[nextMood];
    say(pool[Math.floor(Math.random() * pool.length)]);
    await startPurr();
    window.clearTimeout(purrTimeout.current);
    purrTimeout.current = window.setTimeout(stopPurr, 6500);
  };

  const formatTimer = (value) => {
    if (value === null) return '— : —';
    const mins = Math.floor(value / 60);
    const secs = value % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const toggleGroundStep = (index) => {
    setGroundDone((done) => (done.includes(index) ? done.filter((item) => item !== index) : [...done, index]));
  };

  return (
    <div className="sleep-app">
      <div className="sleep-dust">
        {DUST.map((mote) => (
          <div
            key={mote.id}
            className="sleep-mote"
            style={{
              left: mote.left,
              bottom: mote.bottom,
              width: `${mote.size}px`,
              height: `${mote.size}px`,
              '--dur': mote.dur,
              '--delay': mote.delay,
            }}
          />
        ))}
      </div>

      <div className="sleep-candle-glow" />

      {sparkles.map((sparkle) => (
        <div key={sparkle.id} className="sleep-sparkle" style={{ left: sparkle.x, top: sparkle.y }}>
          {sparkle.glyph}
        </div>
      ))}

      <div className="sleep-card">
        <div className="sleep-eyebrow">your cozy companion</div>
        <div className="sleep-headline">you are not alone tonight</div>

        <div
          className="sleep-cat-stage"
          onClick={tab === 'companion' ? handlePet : undefined}
          onTouchEnd={tab === 'companion' ? (event) => { event.preventDefault(); handlePet(event); } : undefined}
          onMouseDown={tab === 'companion' ? startPurr : undefined}
          onTouchStart={tab === 'companion' ? (event) => { event.preventDefault(); startPurr(); } : undefined}
          onMouseUp={stopPurr}
          onMouseLeave={stopPurr}
          onTouchCancel={stopPurr}
        >
          <div className="sleep-cat-aura" />
          <Cat mood={mood} petting={petting} kneading={kneading} />
        </div>

        <div className={`sleep-purr-row ${purring ? 'is-purring' : ''}`}>
          <div className="sleep-purr-waves">
            {[0, 1, 2, 3, 4, 5, 6].map((bar) => (
              <div key={bar} className="sleep-pbar" style={{ '--d': `${0.3 + bar * 0.06}s`, '--delay': `${bar * 0.05}s` }} />
            ))}
          </div>
          <span className="sleep-purr-text">purring…</span>
        </div>

        <div className="sleep-tabs">
          {['companion', 'breathe', 'anxiety', 'sleep', 'timer'].map((item) => (
            <button
              key={item}
              type="button"
              className={`sleep-tab ${tab === item ? 'is-active' : ''}`}
              onClick={() => setTab(item)}
            >
              {item}
            </button>
          ))}
        </div>

        {tab === 'companion' && (
          <>
            <div className="sleep-speech" style={{ opacity: speech ? 1 : 0.4 }}>
              {speech || 'I am right here.'}
            </div>

            <button type="button" className="sleep-main-btn" onClick={handlePet}>
              {kneading ? 'making biscuits 🍞' : petting ? 'settling in…' : 'pet me ✦'}
            </button>

            <div className="sleep-row" style={{ marginBottom: 14 }}>
              <button
                type="button"
                className="sleep-small-btn"
                onClick={async () => {
                  setMood('sleeping');
                  say(MESSAGES.sleeping[Math.floor(Math.random() * MESSAGES.sleeping.length)]);
                  await startPurr();
                  window.clearTimeout(purrTimeout.current);
                  purrTimeout.current = window.setTimeout(stopPurr, 8000);
                }}
              >
                let me sleep 💤
              </button>
              <button
                type="button"
                className="sleep-small-btn"
                onClick={() => {
                  setMood('bliss');
                  say('A slow blink from a cat means trust. Try blinking back slowly.');
                }}
              >
                slow blink 👁
              </button>
              <button
                type="button"
                className="sleep-small-btn"
                onMouseDown={startPurr}
                onMouseUp={stopPurr}
                onMouseLeave={stopPurr}
                onTouchStart={(event) => { event.preventDefault(); startPurr(); }}
                onTouchEnd={stopPurr}
              >
                hold to purr
              </button>
            </div>

            <div className="sleep-slider-wrap">
              <div className="sleep-label">purr volume</div>
              <input
                className="sleep-range"
                type="range"
                min="0.03"
                max="0.24"
                step="0.01"
                value={purrVolume}
                onChange={(event) => setPurrVolume(Number(event.target.value))}
              />
            </div>

            <div className="sleep-bond">
              <div className="sleep-bond-meta">
                <span>bond</span>
                <span>{bond}%</span>
              </div>
              <div className="sleep-bond-track">
                <div className="sleep-bond-fill" style={{ width: `${bond}%` }} />
              </div>
            </div>
          </>
        )}

        {tab === 'breathe' && (
          <>
            <div className="sleep-breathe-wrap">
              <div className="sleep-breathe-ring" />
              <div className="sleep-breathe-pulse" />
              <div className="sleep-breathe-core">
                <span className="sleep-breathe-word">{activeBreath.word}</span>
              </div>
            </div>
            <div className="sleep-phase">{activeBreath.word}…</div>
            <p className="sleep-copy">{activeBreath.note}</p>
            <p className="sleep-copy-note">4 · 4 · 6 · 2 — breathe with your cat</p>
            <div className="sleep-divider" />
            <p className="sleep-copy-soft">Each long exhale tells your nervous system that the danger has passed.</p>
          </>
        )}

        {tab === 'anxiety' && (
          <>
            <p className="sleep-copy">Your thoughts are loud right now, but they are not always accurate. Stay with the next small step.</p>
            <div className="sleep-label">5-4-3-2-1 grounding — tap each step</div>
            <div className="sleep-card-list">
              {GROUNDING.map((item, index) => (
                <div
                  key={item}
                  className={`sleep-ground-step ${groundDone.includes(index) ? 'is-done' : ''}`}
                  onClick={() => toggleGroundStep(index)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      toggleGroundStep(index);
                    }
                  }}
                >
                  <div className="sleep-ground-num">{groundDone.includes(index) ? '✓' : index + 1}</div>
                  <div className="sleep-ground-text">{item}</div>
                </div>
              ))}
            </div>
            {groundDone.length === 5 && (
              <p className="sleep-copy" style={{ color: 'var(--sc-amber)', marginTop: 10 }}>
                You are here. In this room. In this moment. And this moment can pass.
              </p>
            )}
            <div className="sleep-divider" />
            <div className="sleep-label">tools for hard nights</div>
            <div className="sleep-card-list">
              {ANXIETY_TOOLS.map((tool) => (
                <div key={tool.title} className="sleep-tip-card">
                  <span className="sleep-tip-icon">{tool.icon}</span>
                  <div>
                    <div className="sleep-tip-title">{tool.title}</div>
                    <div className="sleep-tip-body">{tool.body}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === 'sleep' && (
          <>
            <p className="sleep-copy">Sleep tends to arrive more easily when you stop forcing it and start making the room feel safer and quieter.</p>
            <div className="sleep-card-list">
              {SLEEP_TOOLS.map((tool) => (
                <div key={tool.title} className="sleep-tip-card">
                  <span className="sleep-tip-icon">{tool.icon}</span>
                  <div>
                    <div className="sleep-tip-title">{tool.title}</div>
                    <div className="sleep-tip-body">{tool.body}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === 'timer' && (
          <>
            <div className="sleep-label">sleep timer</div>
            <div className="sleep-timer">{formatTimer(timerSecs)}</div>
            <div className="sleep-row" style={{ marginBottom: 10 }}>
              {[5, 10, 15, 20, 30, 45].map((minutes) => (
                <button
                  key={minutes}
                  type="button"
                  className="sleep-small-btn"
                  onClick={() => {
                    setTimerSecs(minutes * 60);
                    setTimerOn(true);
                  }}
                >
                  {minutes}m
                </button>
              ))}
              {timerOn && (
                <button
                  type="button"
                  className="sleep-small-btn is-on"
                  onClick={() => {
                    window.clearInterval(timerInterval.current);
                    setTimerOn(false);
                  }}
                >
                  stop
                </button>
              )}
            </div>
            {timerSecs === 0 && <p className="sleep-copy" style={{ color: 'var(--sc-amber)' }}>goodnight, sweet dreams 🌙</p>}
            <div className="sleep-divider" />
            <div className="sleep-label">ambient sounds</div>
            <div className="sleep-row">
              {['🌧️ rain', '🌊 waves', '🔥 fire', '🌲 forest', '📻 white noise', '🎵 432 hz'].map((item) => (
                <button
                  key={item}
                  type="button"
                  className={`sleep-sound-btn ${ambient === item ? 'is-on' : ''}`}
                  onClick={() => setAmbient((current) => (current === item ? null : item))}
                >
                  {item}
                </button>
              ))}
            </div>
            {ambient && <p className="sleep-sound-copy">Imagine {ambient} gently filling the room.</p>}
          </>
        )}
      </div>
    </div>
  );
}

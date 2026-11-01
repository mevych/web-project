import { useEffect, useRef } from 'react';

const BLOCKS = '▁▂▃▄▅▆▇█';

export default function Equalizer({ levelsRef, bars = 32 }) {
  const ref = useRef(null);

  useEffect(() => {
    const avgs = new Float32Array(bars);
    let raf = 0;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      const { bins } = levelsRef.current;
      let s = '';
      for (let i = 0; i < bars; i++) {
        const idx = Math.floor(Math.pow(i / bars, 1.5) * 72);
        const raw = bins[idx] / 255;
        if (raw < 0.04) avgs[i] = 0;
        else if (avgs[i] === 0) avgs[i] = raw;
        avgs[i] += (raw - avgs[i]) * 0.02;
        const v = raw < 0.04 ? raw : Math.max(0, Math.min(1, 0.3 + (raw - avgs[i]) * 3));
        s += BLOCKS[Math.min(7, Math.floor(v * 8))];
      }
      if (ref.current) ref.current.textContent = s;
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [levelsRef, bars]);

  return <span ref={ref} />;
}
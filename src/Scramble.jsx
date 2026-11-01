import { useEffect, useState } from 'react';

const GLYPHS = '#%*+=-:.';
const FRAMES = 30;

export default function Scramble({ text }) {
  const [out, setOut] = useState(text);
  const [reduced] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  useEffect(() => {
    if (reduced) return undefined;
    let frame = 0;
    let raf = 0;
    const chars = [...text];

    const step = () => {
      frame += 1;
      const progress = frame / FRAMES;
      setOut(
        chars
          .map((ch, i) =>
            ch === ' ' || i / chars.length < progress
              ? ch
              : GLYPHS[Math.floor(Math.random() * GLYPHS.length)],
          )
          .join(''),
      );
      if (frame < FRAMES) raf = requestAnimationFrame(step);
      else setOut(text);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [text, reduced]);

  return <>{reduced ? text : out}</>;
}

import { useCallback, useEffect, useRef, useState } from 'react';
import { load, save } from './storage';

const HIT_GAIN = 25;
const BASE_LEVEL = 0.3;

const avg = (arr, from, to) => {
  let s = 0;
  for (let i = from; i < to; i++) s += arr[i];
  return s / ((to - from) * 255);
};
const clamp01 = (v) => Math.max(0, Math.min(1, v));

const follow = (s, raw) => {
  if (!s.ready) {
    s.slow = raw * 0.7;
    s.peak = raw;
    s.ready = true;
  }
  s.slow += (raw - s.slow) * 0.03;
  s.peak = Math.max(raw, s.peak * 0.997);
  const top = Math.max(s.peak, 0.1);
  const energy = raw / top;
  const hit = Math.max(0, raw - s.slow) / top;
  return clamp01(energy * energy * energy * BASE_LEVEL + hit * HIT_GAIN);
};

const getSavedVolume = () => {
  const v = parseFloat(load('volume'));
  if (Number.isFinite(v)) return clamp01(v);
  return 1;
};

export function useAudio(src) {
  const audioRef = useRef(null);
  const ctxRef = useRef(null);
  const analyserRef = useRef(null);
  const gainRef = useRef(null);
  const levelsRef = useRef({ bass: 0, mid: 0, treble: 0, bins: new Uint8Array(128) });
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState(false);
  const [volume, setVolumeState] = useState(getSavedVolume);
  const volumeRef = useRef(volume);

  useEffect(() => {
    const audio = new Audio(src);
    audio.loop = true;
    audio.preload = 'auto';
    audioRef.current = audio;

    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onError = () => {
      console.warn('Не удалось загрузить аудио:', src);
      setError(true);
      setPlaying(false);
    };
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('error', onError);

    const root = document.documentElement;
    const sb = { ready: false };
    const sm = { ready: false };
    const st = { ready: false };
    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const lv = levelsRef.current;
      const analyser = analyserRef.current;

      if (analyser && !audio.paused) {
        analyser.getByteFrequencyData(lv.bins);
        const bass = follow(sb, avg(lv.bins, 0, 3));
        const mid = follow(sm, avg(lv.bins, 3, 24));
        const treble = follow(st, avg(lv.bins, 24, 80));
        lv.bass += (bass - lv.bass) * (bass > lv.bass ? 0.5 : 0.1);
        lv.mid += (mid - lv.mid) * (mid > lv.mid ? 0.4 : 0.1);
        lv.treble += (treble - lv.treble) * (treble > lv.treble ? 0.4 : 0.12);
      } else {
        sb.ready = false;
        sm.ready = false;
        st.ready = false;
        lv.bass *= 0.9;
        lv.mid *= 0.9;
        lv.treble *= 0.9;
        for (let i = 0; i < lv.bins.length; i++) lv.bins[i] *= 0.88;
      }
      root.style.setProperty('--pulse', lv.bass.toFixed(3));
    };
    loop();

    return () => {
      cancelAnimationFrame(raf);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('error', onError);
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      if (ctxRef.current) ctxRef.current.close();
      ctxRef.current = null;
      analyserRef.current = null;
      gainRef.current = null;
      audioRef.current = null;
      root.style.removeProperty('--pulse');
    };
  }, [src]);

  const setVolume = useCallback((v) => {
    const value = clamp01(v);
    volumeRef.current = value;
    setVolumeState(value);
    if (gainRef.current) gainRef.current.gain.value = value;
    save('volume', String(value));
  }, []);

  const toggle = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!audio.paused) {
      audio.pause();
      return;
    }

    try {
      if (!ctxRef.current) {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        const ctx = new Ctx();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.7;
        const gain = ctx.createGain();
        gain.gain.value = volumeRef.current;

        const source = ctx.createMediaElementSource(audio);
        source.connect(analyser);
        source.connect(gain);
        gain.connect(ctx.destination);

        ctxRef.current = ctx;
        analyserRef.current = analyser;
        gainRef.current = gain;
      }
      await ctxRef.current.resume();
      await audio.play();
      setError(false);
    } catch (e) {
      console.warn(e);
      setError(true);
    }
  }, []);

  return { levelsRef, playing, error, toggle, volume, setVolume };
}
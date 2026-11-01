import { useEffect, useState } from 'react';
import AsciiBackground from './AsciiBackground';
import Equalizer from './Equalizer';
import Scramble from './Scramble';
import { useAudio } from './useAudio';
import { STRINGS } from './i18n';
import { TRACK, SOCIALS } from './config';
import { load, save } from './storage';
import './App.css';

const LANGS = ['ru', 'en'];

const getInitialLang = () => {
  const saved = load('lang');
  if (saved && STRINGS[saved]) return saved;
  return navigator.language?.toLowerCase().startsWith('ru') ? 'ru' : 'en';
};

const getInitialTheme = () => document.documentElement.dataset.theme || 'dark';

const PlayIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
    <path d="M3 1.5v13l11-6.5z" fill="currentColor" />
  </svg>
);
const PauseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
    <path d="M3 2h3.5v12H3zM9.5 2H13v12H9.5z" fill="currentColor" />
  </svg>
);

export default function App() {
  const [lang, setLang] = useState(getInitialLang);
  const [theme, setTheme] = useState(getInitialTheme);
  const { levelsRef, playing, error, toggle, volume, setVolume } = useAudio(TRACK.src);
  const t = STRINGS[lang];

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    save('theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang = lang;
    save('lang', lang);
  }, [lang]);

  return (
    <div className="page">
      <AsciiBackground levelsRef={levelsRef} />
      <div className="glow" aria-hidden="true" />
      <div className="scrim" aria-hidden="true" />

      <header className="bar">
        <div className="seg" role="group" aria-label={t.langLabel}>
          {LANGS.map((code) => (
            <button
              key={code}
              type="button"
              aria-pressed={lang === code}
              onClick={() => setLang(code)}
            >
              {code.toUpperCase()}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="chip"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          {theme === 'dark' ? t.toLight : t.toDark}
        </button>
      </header>

      <main className="hero">
        <h1 className="name" aria-label={t.name}>
          <Scramble text={t.name} />
        </h1>
        <p className="role">{t.role}</p>
        <p className="about">{t.about}</p>

        <div className="player">
          <button type="button" className="play" onClick={toggle} aria-pressed={playing}>
            {playing ? <PauseIcon /> : <PlayIcon />}
            <span>{playing ? t.pause : t.play}</span>
          </button>
          <p className="track">
            <span className="track-title">{TRACK.title}</span>
            <span className="track-artist">{TRACK.artist}</span>
          </p>
          <label className="volume">
            <svg width="18" height="18" viewBox="0 0 16 16" aria-hidden="true">
              <path d="M2 6h3l4-3.5v11L5 10H2z" fill="currentColor" />
              <path d="M11.5 5.5a3.5 3.5 0 0 1 0 5" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
            <span className="visually-hidden">{t.volume}</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
            />
          </label>
        </div>
        <div className="eq" aria-hidden="true">
          <Equalizer levelsRef={levelsRef} />
        </div>
        {error && (
          <p className="error" role="alert">
            {t.trackError}
          </p>
        )}
      </main>

      <footer className="foot">
        <ul className="socials" aria-label={t.socials}>
          {SOCIALS.map((s) => (
            <li key={s.id}>
              <a
                href={s.href}
                {...(s.href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              >
                {s.label}
              </a>
            </li>
          ))}
        </ul>
      </footer>
    </div>
  );
}

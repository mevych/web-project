import { useEffect, useState } from 'react';
import { STRINGS } from './i18n';
import { load, save } from './storage';
import './App.css';

const LANGS = ['ru', 'en'];

const getInitialLang = () => {
  const saved = load('lang');
  if (saved && STRINGS[saved]) return saved;
  return navigator.language?.toLowerCase().startsWith('ru') ? 'ru' : 'en';
};

const getInitialTheme = () => document.documentElement.dataset.theme || 'dark';

export default function App() {
  const [lang, setLang] = useState(getInitialLang);
  const [theme, setTheme] = useState(getInitialTheme);
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
          {t.name}
        </h1>
        <p className="role">{t.role}</p>
        <p className="about">{t.about}</p>
      </main>
    </div>
  );
}

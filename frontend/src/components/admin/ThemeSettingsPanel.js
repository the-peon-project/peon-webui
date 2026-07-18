import React from 'react';
import { Check, Moon, Sun } from 'lucide-react';

const THEME_OPTIONS = [
  {
    id: 'clean',
    name: 'Clean',
    description: 'Flat slate and light-blue UI with restrained, modern controls.',
    accent: 'sky',
    svg: (
      <svg viewBox="0 0 64 64" aria-hidden="true" className="theme-sigil-svg">
        <rect x="10" y="12" width="44" height="40" rx="4" fill="none" stroke="currentColor" strokeWidth="3" />
        <rect x="16" y="18" width="32" height="8" rx="2" fill="currentColor" opacity="0.8" />
        <rect x="16" y="30" width="18" height="6" rx="2" fill="currentColor" opacity="0.6" />
        <rect x="16" y="40" width="28" height="6" rx="2" fill="currentColor" opacity="0.4" />
      </svg>
    ),
  },
  {
    id: 'horde',
    name: 'Horde',
    description: 'War camp brutality with iron, leather, bone, and battle green.',
    accent: 'emerald',
    svg: (
      <svg viewBox="0 0 64 64" aria-hidden="true" className="theme-sigil-svg">
        <path d="M32 8L22 18v16c0 10 4 15 10 22 6-7 10-12 10-22V18L32 8z" fill="none" stroke="currentColor" strokeWidth="3" />
        <path d="M14 22l10 6-3 7 7-3 4 8 4-8 7 3-3-7 10-6" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="32" cy="29" r="5" fill="currentColor" opacity="0.8" />
      </svg>
    ),
  },
  {
    id: 'alliance',
    name: 'Alliance',
    description: 'Human castle discipline with stone, steel, and royal blue banners.',
    accent: 'blue',
    svg: (
      <svg viewBox="0 0 64 64" aria-hidden="true" className="theme-sigil-svg">
        <path d="M16 18h8v-6h8v6h8v-6h8v6h4v26c0 6-5 12-20 18-15-6-20-12-20-18V18h4z" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
        <path d="M22 26h20v18H22z" fill="currentColor" opacity="0.18" />
        <path d="M28 26v-8m8 8v-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        <path d="M32 24c-4 4-6 8-6 13 0 3 2 6 6 8 4-2 6-5 6-8 0-5-2-9-6-13z" fill="currentColor" opacity="0.7" />
      </svg>
    ),
  },
];

const THEME_LABELS = {
  clean: 'Clean',
  horde: 'Horde',
  alliance: 'Alliance',
};

const ThemeModeCard = ({ option, selected, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`theme-mode-card ${selected ? `theme-mode-card--${option.accent} theme-mode-card--selected` : ''}`}
    aria-pressed={selected}
  >
    <span className={`theme-mode-sigil theme-mode-sigil--${option.accent}`}>
      {option.svg}
    </span>
    <span className="theme-mode-copy">
      <span className="theme-mode-title">{option.name}</span>
      <span className="theme-mode-description">{option.description}</span>
    </span>
    <span className={`theme-mode-check ${selected ? 'theme-mode-check--active' : ''}`}>
      {selected ? <Check className="w-4 h-4" /> : null}
    </span>
  </button>
);

const ThemeSettingsPanel = ({ darkMode, themeMode, onDarkModeChange, onThemeModeChange }) => {
  return (
    <section className="theme-settings-panel stone-texture rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h3 className="warcraft-subtitle text-xl">Appearance</h3>
          <p className="text-sm text-gray-500">
            Admin-only theme controls. Changes persist in this browser session.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onDarkModeChange(!darkMode)}
          className="theme-switcher theme-switcher--admin inline-flex items-center gap-2 px-4 py-2"
          aria-label="Toggle light or dark mode"
        >
          {darkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          <span>{darkMode ? 'Dark' : 'Light'}</span>
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {THEME_OPTIONS.map((option) => (
          <ThemeModeCard
            key={option.id}
            option={option}
            selected={themeMode === option.id}
            onClick={() => onThemeModeChange(option.id)}
          />
        ))}
      </div>

      <div className="theme-settings-summary bg-black/20 rounded p-3 text-sm text-gray-400">
        Current theme: <span className="text-gray-200 font-semibold">{THEME_LABELS[themeMode] || THEME_LABELS.clean}</span>
        <span className="mx-2">•</span>
        Mode: <span className="text-gray-200 font-semibold">{darkMode ? 'Dark' : 'Light'}</span>
      </div>
    </section>
  );
};

export default ThemeSettingsPanel;

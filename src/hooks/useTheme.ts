'use client';

import { useState, useEffect, useCallback } from 'react';

interface ThemeConfig {
  basePalette: 'Dark' | 'Slate' | 'Navy';
  accentColor: string;
  glassmorphism: 'Solid' | 'Translucent' | 'Glass';
  fontPersonality: 'Professional' | 'Industrial' | 'Futuristic';
  buttonStyle: 'Neon Glow' | 'Minimalist Outline' | '3D Shadow';
}

const DEFAULT_THEME: ThemeConfig = {
  basePalette: 'Dark',
  accentColor: '#60A5FA',
  glassmorphism: 'Translucent',
  fontPersonality: 'Professional',
  buttonStyle: 'Neon Glow'
};

export function useTheme() {
  const [currentTheme, setCurrentTheme] = useState<ThemeConfig>(DEFAULT_THEME);

  const applyTheme = useCallback((config: ThemeConfig) => {
    const root = document.documentElement;
    
    // Base Colors
    let bg = '#121417';
    let surface = '#1E2126';
    
    if (config.basePalette === 'Slate') {
      bg = '#0F1923';
      surface = '#172130';
    } else if (config.basePalette === 'Navy') {
      bg = '#0A0E1A';
      surface = '#111827';
    }

    root.style.setProperty('--color-bg-primary', bg);
    root.style.setProperty('--color-bg-surface', surface);
    root.style.setProperty('--color-accent', config.accentColor);
    root.style.setProperty('--color-accent-glow', `${config.accentColor}80`);
    
    // Fonts
    let fontUi = 'Inter, sans-serif';
    let fontMono = 'JetBrains Mono, monospace';
    
    if (config.fontPersonality === 'Industrial') {
      fontUi = 'Roboto Mono, monospace';
    } else if (config.fontPersonality === 'Futuristic') {
      fontUi = 'Geist, sans-serif';
      fontMono = 'Geist Mono, monospace';
    }

    root.style.setProperty('--font-ui', fontUi);
    root.style.setProperty('--font-mono', fontMono);

    // Glassmorphism
    let blur = '0px';
    let surfaceOpacity = '1';
    
    if (config.glassmorphism === 'Translucent') {
      blur = '8px';
      surfaceOpacity = '0.85';
    } else if (config.glassmorphism === 'Glass') {
      blur = '16px';
      surfaceOpacity = '0.65';
    }

    root.style.setProperty('--blur-intensity', blur);
    root.style.setProperty('--surface-opacity', surfaceOpacity);

    // Button Style
    root.style.setProperty('--button-style', config.buttonStyle);
    
    setCurrentTheme(config);
  }, []);

  useEffect(() => {
    async function loadTheme() {
      if (typeof window !== 'undefined' && (window as any).noxis) {
        const savedTheme = await (window as any).noxis.store.get('themeConfig');
        if (savedTheme) {
          applyTheme(savedTheme);
        } else {
          applyTheme(DEFAULT_THEME);
        }
      } else {
        applyTheme(DEFAULT_THEME);
      }
    }

    loadTheme();
  }, [applyTheme]);

  const updateTheme = (partial: Partial<ThemeConfig>) => {
    const newTheme = { ...currentTheme, ...partial };
    applyTheme(newTheme);
    if ((window as any).noxis) {
      (window as any).noxis.store.set('themeConfig', newTheme);
    }
  };

  const resetTheme = () => {
    applyTheme(DEFAULT_THEME);
    if ((window as any).noxis) {
      (window as any).noxis.store.set('themeConfig', DEFAULT_THEME);
    }
  };

  return { currentTheme, updateTheme, resetTheme };
}

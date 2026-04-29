'use client';

import { useEffect } from 'react';
import { useIndustryVocabulary } from '@/providers/IndustryProvider';

/**
 * HUB_OS — Theme Watcher Component
 * Phase 10: Dynamic Industrial Theming Engine
 * 
 * Monitors the global theme state and injects the 'data-theme' attribute
 * into the document root for CSS variable scoping.
 */
export function ThemeWatcher() {
  const { themeId } = useIndustryVocabulary();

  useEffect(() => {
    // Inject theme ID into the <html> element
    document.documentElement.setAttribute('data-theme', themeId || 'onyx-gold');
    
    // Optional: Log theme shift for telemetry
    console.log(`[ThemeEngine] Shift to: ${themeId}`);
  }, [themeId]);

  // This is a logic-only component, it renders nothing
  return null;
}

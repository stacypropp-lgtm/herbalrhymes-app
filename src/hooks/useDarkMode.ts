import { useState, useEffect } from 'react';
import { getDarkMode, setDarkMode as saveDarkMode } from '../utils/storage.ts';

export function useDarkMode() {
  const [dark, setDark] = useState(getDarkMode);

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    saveDarkMode(dark);
  }, [dark]);

  return [dark, setDark] as const;
}

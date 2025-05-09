import { useEffect } from 'react';
import { useTheme } from 'next-themes';

export function useThemeSetup() {
  const { setTheme, theme } = useTheme();

  // Quando o componente for montado, defina o tema como escuro
  useEffect(() => {
    // Verifica se já existe uma preferência armazenada
    const storedTheme = localStorage.getItem('zapban-theme');
    
    // Se não houver preferência armazenada ou se o tema não for dark, defina como dark
    if (!storedTheme || storedTheme !== 'dark') {
      setTheme('dark');
      localStorage.setItem('zapban-theme', 'dark');
    }
  }, [setTheme]);

  // Quando o tema mudar, armazene-o no localStorage
  useEffect(() => {
    if (theme) {
      localStorage.setItem('zapban-theme', theme);
    }
  }, [theme]);

  return { theme, setTheme };
}
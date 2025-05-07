import { createContext, useState, useEffect, PropsWithChildren } from 'react';
import { getInitialLanguage } from '@/lib/i18n';
import i18n from '@/lib/i18n';

interface LanguageContextProps {
  language: string;
  setLanguage: React.Dispatch<React.SetStateAction<string>>;
}

// Create the context with default values
export const LanguageContext = createContext<LanguageContextProps>({
  language: 'pt-BR',
  setLanguage: () => {}
});

export const LanguageProvider = ({ children }: PropsWithChildren) => {
  const [language, setLanguage] = useState<string>(getInitialLanguage());

  // Change the language whenever the context language changes
  useEffect(() => {
    i18n.changeLanguage(language);
  }, [language]);

  // Setup language detection on mount only once
  useEffect(() => {
    // Get initial language
    const initialLang = getInitialLanguage();
    
    // Set the language
    setLanguage(initialLang);
    i18n.changeLanguage(initialLang);
  }, []);

  const value = {
    language,
    setLanguage
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

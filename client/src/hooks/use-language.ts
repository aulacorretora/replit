import { useContext, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { LanguageContext } from '@/contexts/LanguageContext';
import { saveLanguagePreference } from '@/lib/i18n';
import { LANGUAGES } from '@/lib/constants';

interface UseLanguageReturn {
  language: string;
  changeLanguage: (lang: string) => void;
  t: (key: string) => string;
  languages: typeof LANGUAGES;
}

export const useLanguage = (): UseLanguageReturn => {
  const { language, setLanguage } = useContext(LanguageContext);
  const { t, i18n } = useTranslation();

  const changeLanguage = useCallback((lang: string) => {
    if (LANGUAGES[lang as keyof typeof LANGUAGES]) {
      i18n.changeLanguage(lang);
      setLanguage(lang);
      saveLanguagePreference(lang);
    }
  }, [i18n, setLanguage]);

  return {
    language,
    changeLanguage,
    t,
    languages: LANGUAGES,
  };
};

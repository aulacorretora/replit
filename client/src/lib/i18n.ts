import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import locales
import enUS from '../locales/en-US.json';
import ptBR from '../locales/pt-BR.json';

// Initialize i18next
const initI18n = () => {
  i18n
    .use(initReactI18next) // passes i18n down to react-i18next
    .init({
      resources: {
        'en-US': {
          translation: enUS
        },
        'pt-BR': {
          translation: ptBR
        }
      },
      lng: getInitialLanguage(),
      fallbackLng: 'pt-BR',
      interpolation: {
        escapeValue: false // react already safes from xss
      },
      react: {
        useSuspense: false
      }
    });

  return i18n;
};

// Get initial language from localStorage or browser settings
export const getInitialLanguage = (): string => {
  const savedLang = localStorage.getItem('zapban_lang');
  if (savedLang) {
    return savedLang;
  }

  const browserLang = navigator.language;
  return browserLang === 'pt-BR' || browserLang.startsWith('pt') ? 'pt-BR' : 'en-US';
};

// Save language preference
export const saveLanguagePreference = (lang: string): void => {
  localStorage.setItem('zapban_lang', lang);
};

export default initI18n();

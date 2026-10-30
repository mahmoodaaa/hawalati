import { useEffect, useState } from 'react';
import { LanguageContext } from './languageContext.js';
import { getLanguage, setLanguagePreference } from '../i18n/translate.js';

export function LanguageProvider({ children }) {
  const [language, updateLanguage] = useState(getLanguage);
  function setLanguage(next) {
    setLanguagePreference(next);
    updateLanguage(getLanguage());
  }
  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.title = language === 'ar' ? 'حوالتي — استلام الحوالات' : 'Hawalati — Receive remittances';
  }, [language]);
  return <LanguageContext.Provider value={{ language, setLanguage }}>{children}</LanguageContext.Provider>;
}

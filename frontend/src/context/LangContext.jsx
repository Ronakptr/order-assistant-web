import { createContext, useContext, useState, useEffect } from 'react';
import i18n from '../i18n';

const LangContext = createContext();

export function LangProvider({ children }) {
  const savedLang = localStorage.getItem('language') || 'fa';
  const [lang, setLang] = useState(savedLang);

  useEffect(() => {
    // اعمال فوری زبان هنگام لود
    i18n.changeLanguage(lang);
    document.documentElement.setAttribute('dir', lang === 'fa' ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', lang);
  }, [lang]);

  const toggleLang = () => {
    const newLang = lang === 'fa' ? 'en' : 'fa';
    localStorage.setItem('language', newLang);
    i18n.changeLanguage(newLang);
    document.documentElement.setAttribute('dir', newLang === 'fa' ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', newLang);
    setLang(newLang);
  };

  return (
    <LangContext.Provider value={{ lang, toggleLang, isRTL: lang === 'fa' }}>
      {children}
    </LangContext.Provider>
  );
}

export const useLang = () => useContext(LangContext);
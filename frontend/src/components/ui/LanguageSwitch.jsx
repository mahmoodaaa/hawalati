import { Languages } from 'lucide-react';
import { useLanguage } from '../../context/languageContext.js';

export default function LanguageSwitch() {
  const { language, setLanguage } = useLanguage();
  return <button type="button" className="language-switch" lang={language === 'ar' ? 'en' : 'ar'}
    onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
    aria-label={language === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}>
    <Languages size={18} /><span>{language === 'ar' ? 'English' : 'العربية'}</span>
  </button>;
}

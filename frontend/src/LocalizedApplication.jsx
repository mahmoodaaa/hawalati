import App from './App.jsx';
import { useLanguage } from './context/languageContext.js';
import LanguageSwitch from './components/ui/LanguageSwitch.jsx';

export default function LocalizedApplication() {
  const { language } = useLanguage();
  // Changing a prop rerenders the existing tree; no keys or remounts lose form state.
  return <><App language={language} /><LanguageSwitch /></>;
}

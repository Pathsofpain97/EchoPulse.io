
import { useCallback, useEffect, useState } from 'react';

import './styles/global.css';

import Player from './components/Player';
import Intro from './components/Intro';

function getInitialLanguage() {
  try {
    const savedLanguage = localStorage.getItem('echopulse-language');

    return savedLanguage === 'en' ? 'en' : 'es';
  } catch {
    return 'es';
  }
}

function App() {
  const [showIntro, setShowIntro] = useState(true);
  const [language, setLanguage] = useState(getInitialLanguage);

  const handleIntroComplete = useCallback(() => {
    setShowIntro(false);
  }, []);

  const handleLanguageChange = useCallback((nextLanguage) => {
    setLanguage(nextLanguage);

    try {
      localStorage.setItem('echopulse-language', nextLanguage);
    } catch {
      // La aplicación sigue funcionando aunque el almacenamiento no esté disponible.
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  return (
    <>
      <Player
        language={language}
        onLanguageChange={handleLanguageChange}
      />

      {showIntro && (
        <Intro onComplete={handleIntroComplete} />
      )}
    </>
  );
}

export default App;

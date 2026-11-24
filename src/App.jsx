
import { useCallback, useEffect, useState } from 'react';

import './styles/global.css';

import Player from './components/Player';
import Intro from './components/Intro';
import SourceSelection from './components/SourceSelection';

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
  const [selectedSource, setSelectedSource] = useState(null);
  const [language, setLanguage] = useState(getInitialLanguage);

  const handleIntroComplete = useCallback(() => {
    setShowIntro(false);
  }, []);

  const handleSourceSelect = useCallback((source) => {
    setSelectedSource(source);
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
      {showIntro ? (
        <Intro onComplete={handleIntroComplete} />
      ) : selectedSource ? (
        <Player
          language={language}
          onLanguageChange={handleLanguageChange}
          initialSection={selectedSource}
        />
      ) : (
        <SourceSelection
          language={language}
          onLanguageChange={handleLanguageChange}
          onSelect={handleSourceSelect}
        />
      )}
    </>
  );
}

export default App;

import { ChevronDown, Compass, FolderOpen, Music2 } from 'lucide-react';
import echoPulseLogo from '../assets/EchoPulse.png';
import '../styles/source-selection.css';

function SourceSelection({ language = 'es', onLanguageChange = () => {}, onSelect = () => {} }) {
  const isEnglish = language === 'en';

  return (
    <main className="source-selection-screen">
      <div className="source-selection-glow source-selection-glow-one" />
      <div className="source-selection-glow source-selection-glow-two" />

      <header className="source-selection-header">
        <div className="source-selection-brand">
          <img className="source-selection-logo" src={echoPulseLogo} alt="" aria-hidden="true" />
          <Music2 className="source-selection-brand-music" size={21} aria-hidden="true" />
          <span>EchoPulse</span>
        </div>

        <div className="source-selection-language-control">
          <span className="source-selection-language-hint">{isEnglish ? 'CHANGE LANGUAGE HERE' : 'CAMBIÁ EL IDIOMA AQUÍ'}</span>
          <ChevronDown className="source-selection-language-arrow" size={15} aria-hidden="true" />
          <div className="source-selection-language" aria-label={isEnglish ? 'Language' : 'Idioma'} data-lang={language}>
          <button type="button" className={`lang-btn-es ${!isEnglish ? 'active' : ''}`} onClick={() => onLanguageChange('es')} aria-pressed={!isEnglish}>ES</button>
          <span>/</span>
          <button type="button" className={`lang-btn-en ${isEnglish ? 'active' : ''}`} onClick={() => onLanguageChange('en')} aria-pressed={isEnglish}>EN</button>
          </div>
        </div>
      </header>

      <section className="source-selection-content">
        <span className="source-selection-eyebrow">{isEnglish ? 'YOUR MUSIC, YOUR WAY' : 'TU MÚSICA, A TU MANERA'}</span>
        <h1>{isEnglish ? 'What would you like to listen to?' : '¿Qué querés escuchar?'}</h1>
        <p className="source-selection-description">
          {isEnglish
            ? 'Choose where your music comes from. You can switch at any time.'
            : 'Elegí de dónde viene tu música. Podés cambiar de opción cuando quieras.'}
        </p>

        <p className="source-selection-mode-hint">
          {isEnglish ? 'Click a card below to choose or switch your music mode.' : 'Hacé clic en una de estas opciones para elegir o cambiar de modo.'}
        </p>

        <div className="source-selection-options">
          <button type="button" className="source-option source-option-discover" onClick={() => onSelect('discover')}>
            <span className="source-option-icon"><Compass size={32} /></span>
            <span className="source-option-title">{isEnglish ? 'Discover music' : 'Explorar música'}</span>
            <span className="source-option-description">
              {isEnglish ? 'Explore the Audius catalog, discover new artists, and stream music instantly, right from EchoPulse.' : 'Explorá el catálogo de Audius, descubrí nuevos artistas y escuchá música al instante, directamente desde EchoPulse.'}
            </span>
            <span className="source-option-action">{isEnglish ? 'EXPLORE MUSIC' : 'EXPLORAR MÚSICA'}</span>
          </button>

          <button type="button" className="source-option source-option-local" onClick={() => onSelect('local')}>
            <span className="source-option-icon"><FolderOpen size={32} /></span>
            <span className="source-option-title">{isEnglish ? 'My music' : 'Mi música'}</span>
            <span className="source-option-description">
              {isEnglish ? 'Open your library, then choose Add music to select audio files from your device.' : 'Entrá a tu biblioteca y tocá «Agregar música» para elegir archivos de tu dispositivo.'}
            </span>
            <span className="source-option-action">{isEnglish ? 'GO TO MY MUSIC' : 'IR A MI MÚSICA'}</span>
          </button>
        </div>

        <p className="source-selection-footnote">
          {isEnglish
            ? 'Your music options are also available at the bottom of the player: discover tracks on Audius or add your own MP3 files.'
            : 'Dentro del reproductor también vas a encontrar estas opciones abajo: podés descubrir canciones en Audius o agregar tus propios archivos MP3.'}
        </p>
        <p className="source-selection-footnote source-selection-account-note">
          {isEnglish ? 'No account is needed to use your local music.' : 'No necesitás una cuenta para escuchar tu música local.'}
        </p>
      </section>

      <footer className="source-selection-footer">ECHOPULSE · MUSIC PLAYER</footer>
    </main>
  );
}

export default SourceSelection;

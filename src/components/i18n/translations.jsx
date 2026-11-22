
export const translations = {
  es: {
    language: 'Idioma',
    musicPlayer: 'REPRODUCTOR MUSICAL',
    fullscreenHint: 'Expandí el visualizador para disfrutarlo a pantalla completa',
    fullscreen: 'Pantalla completa',
    openFullscreen: 'Abrir visualizador a pantalla completa',
    nothingPlaying: 'Nada reproduciéndose',
    nowPlaying: 'Reproduciendo ahora',
    selectSong: 'Seleccioná una canción para comenzar',
    previous: 'Anterior',
    play: 'Reproducir',
    pause: 'Pausar',
    next: 'Siguiente',
    musicLibrary: 'Biblioteca musical',
    tracks: 'canciones',
    addMusic: 'Agregar música',
    searchMusic: 'Buscar en tu música...',
    clearSearch: 'Limpiar búsqueda',
    closeNotice: 'Cerrar aviso',
    emptyLibrary: 'Tu biblioteca está vacía',
    addFiles: 'Agregá archivos de audio para comenzar a escuchar',
    noSongsFound: 'No se encontraron canciones',
    tryAnotherSearch: 'Probá con otra búsqueda',
    playing: 'REPRODUCIENDO',
    removeSong: 'Eliminar canción',
    playSong: 'Reproducir',
    compatibleFiles: 'No se encontraron archivos de audio compatibles.',
    addedWithDuplicates: '{added} canciones agregadas · {duplicates} repetidas omitidas',
    added: '{added} canciones agregadas correctamente',
    alreadyInLibrary: '{duplicates} canciones ya estaban en tu biblioteca',
    library: 'Biblioteca',
    openLibrary: 'Abrir biblioteca musical',
    closeLibrary: 'Cerrar biblioteca',
    nowPlayingUpper: 'REPRODUCIENDO AHORA',
    echoIsPlaying: 'EchoPulse está reproduciendo',
    selectFromLibrary: 'Seleccioná una canción de tu biblioteca',
    paused: 'EN PAUSA',
    yourCollection: 'TU COLECCIÓN',
    tracksAvailable: 'canciones disponibles',
    fullscreenExit: 'Salir de pantalla completa',
    fullscreenReturn: 'Presioná ESC para volver',

    equalizer: 'Ecualizador',
    reset: 'Restablecer',
    presets: {
      Normal: 'Normal',
      Pop: 'Pop',
      Rock: 'Rock',
      Bass: 'Graves',
      Electronic: 'Electrónica',
      Acoustic: 'Acústico',
      Jazz: 'Jazz',
      Classical: 'Clásica',
      Vocal: 'Voz',
      Night: 'Noche',
      Personalizado: 'Personalizado'
    },
    bands: [
      {
        label: 'Graves',
        description: 'Profundidad y golpes del bombo'
      },
      {
        label: 'Bajos medios',
        description: 'Cuerpo y calidez de la música'
      },
      {
        label: 'Medios',
        description: 'Voces e instrumentos principales'
      },
      {
        label: 'Altos medios',
        description: 'Claridad y definición'
      },
      {
        label: 'Agudos',
        description: 'Brillo y detalles del sonido'
      }
    ],

    visualizerModes: {
      classic: 'Espectro',
      modern: 'Pulso',
      waveform: 'Forma de onda',
      mirror: 'Espejo neón',
      nebula: 'Nebulosa',
      aurora: 'Aurora',
      infinity: 'Gemas del infinito'
    },
    audioAnalyzerActive: 'ANALIZADOR DE AUDIO ACTIVO',
    waitingForAudio: 'ESPERANDO AUDIO'
  },

  en: {
    language: 'Language',
    musicPlayer: 'MUSIC PLAYER',
    fullscreenHint: 'Expand the visualizer to enjoy it in full screen',
    fullscreen: 'Full screen',
    openFullscreen: 'Open visualizer in full screen',
    nothingPlaying: 'Nothing playing',
    nowPlaying: 'Now playing',
    selectSong: 'Select a song to get started',
    previous: 'Previous',
    play: 'Play',
    pause: 'Pause',
    next: 'Next',
    musicLibrary: 'Music Library',
    tracks: 'tracks',
    addMusic: 'Add music',
    searchMusic: 'Search your music...',
    clearSearch: 'Clear search',
    closeNotice: 'Close notice',
    emptyLibrary: 'Your music library is empty',
    addFiles: 'Add audio files to start listening',
    noSongsFound: 'No songs found',
    tryAnotherSearch: 'Try another search',
    playing: 'PLAYING',
    removeSong: 'Remove song',
    playSong: 'Play',
    compatibleFiles: 'No compatible audio files were found.',
    addedWithDuplicates: '{added} songs added · {duplicates} duplicates skipped',
    added: '{added} songs added successfully',
    alreadyInLibrary: '{duplicates} songs were already in your library',
    library: 'Library',
    openLibrary: 'Open music library',
    closeLibrary: 'Close library',
    nowPlayingUpper: 'NOW PLAYING',
    echoIsPlaying: 'EchoPulse is playing',
    selectFromLibrary: 'Select a song in your library',
    paused: 'PAUSED',
    yourCollection: 'YOUR COLLECTION',
    tracksAvailable: 'tracks available',
    fullscreenExit: 'Exit full screen',
    fullscreenReturn: 'Press ESC to return',

    equalizer: 'Equalizer',
    reset: 'Reset',
    presets: {
      Normal: 'Normal',
      Pop: 'Pop',
      Rock: 'Rock',
      Bass: 'Bass',
      Electronic: 'Electronic',
      Acoustic: 'Acoustic',
      Jazz: 'Jazz',
      Classical: 'Classical',
      Vocal: 'Vocal',
      Night: 'Night',
      Personalizado: 'Custom'
    },
    bands: [
      {
        label: 'Bass',
        description: 'Depth and kick drum impact'
      },
      {
        label: 'Low mids',
        description: 'Body and warmth of the music'
      },
      {
        label: 'Mids',
        description: 'Vocals and main instruments'
      },
      {
        label: 'High mids',
        description: 'Clarity and definition'
      },
      {
        label: 'Treble',
        description: 'Brightness and sound details'
      }
    ],

    visualizerModes: {
      classic: 'Spectrum',
      modern: 'Pulse',
      waveform: 'Waveform',
      mirror: 'Neon Mirror',
      nebula: 'Nebula',
      aurora: 'Aurora',
      infinity: 'Infinity Stones'
    },
    audioAnalyzerActive: 'AUDIO ANALYZER ACTIVE',
    waitingForAudio: 'WAITING FOR AUDIO'
  }
};

export function t(language, key) {
  const dictionary = translations[language] || translations.es;

  return key.split('.').reduce(
    (value, part) => value?.[part],
    dictionary
  ) ?? key;
}

export function translateCount(language, key, values = {}) {
  return Object.entries(values).reduce(
    (message, [name, value]) =>
      message.replaceAll(`{${name}}`, String(value)),
    t(language, key)
  );
}

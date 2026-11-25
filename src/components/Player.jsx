
import { useEffect, useRef, useState } from 'react';

import {
  Music2,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  FolderOpen,
  ListMusic,
  Trash2,
  Maximize,
  X,
  Search,
  Compass
} from 'lucide-react';

import Visualizer, { VisualizerModeSelector } from './Visualizer';
import Equalizer from './Equalizer';
import AudiusExplorer from './AudiusExplorer';
import TrackArtwork from './TrackArtwork';
import { t } from './i18n/translations';
import echoPulseLogo from '../assets/EchoPulse.png';

import '../styles/player.css';
import '../styles/fullscreen.css';
import '../styles/mobile-refinement.css';
import '../styles/control-cards.css';

function readSynchsafeSize(bytes, offset) {
  return ((bytes[offset] & 0x7f) << 21) |
    ((bytes[offset + 1] & 0x7f) << 14) |
    ((bytes[offset + 2] & 0x7f) << 7) |
    (bytes[offset + 3] & 0x7f);
}

function findTextTerminator(bytes, start, encoding) {
  if (encoding === 1 || encoding === 2) {
    for (let index = start; index < bytes.length - 1; index += 2) {
      if (bytes[index] === 0 && bytes[index + 1] === 0) return index + 2;
    }
    return bytes.length;
  }

  const end = bytes.indexOf(0, start);
  return end === -1 ? bytes.length : end + 1;
}

async function extractMp3Artwork(file) {
  if (!/\.mp3$/i.test(file.name) || file.size < 20) return null;

  try {
    // Las etiquetas ID3 están al comienzo del MP3. Limitamos la lectura para
    // evitar cargar innecesariamente archivos de audio completos en memoria.
    const buffer = await file.slice(0, Math.min(file.size, 16 * 1024 * 1024)).arrayBuffer();
    const bytes = new Uint8Array(buffer);
    if (String.fromCharCode(...bytes.slice(0, 3)) !== 'ID3') return null;

    const version = bytes[3];
    if (version < 2 || version > 4) return null;

    const tagEnd = Math.min(10 + readSynchsafeSize(bytes, 6), bytes.length);
    let offset = 10;

    // Algunas etiquetas incluyen una cabecera extendida antes de los frames.
    if (version >= 3 && (bytes[5] & 0x40)) {
      const extendedSize = version === 4
        ? readSynchsafeSize(bytes, offset)
        : ((bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3]) >>> 0;
      offset += version === 4 ? extendedSize : extendedSize + 4;
    }

    while (offset < tagEnd - (version === 2 ? 6 : 10)) {
      const headerSize = version === 2 ? 6 : 10;
      const frameId = String.fromCharCode(...bytes.slice(offset, offset + (version === 2 ? 3 : 4)));
      if (!frameId.trim() || /^\0+$/.test(frameId)) break;

      const frameSize = version === 2
        ? (bytes[offset + 3] << 16) | (bytes[offset + 4] << 8) | bytes[offset + 5]
        : version === 4
          ? readSynchsafeSize(bytes, offset + 4)
          : ((bytes[offset + 4] << 24) | (bytes[offset + 5] << 16) | (bytes[offset + 6] << 8) | bytes[offset + 7]) >>> 0;

      const dataStart = offset + headerSize;
      const frameEnd = Math.min(dataStart + frameSize, tagEnd);
      if (frameSize <= 0 || frameEnd <= dataStart) break;

      if ((frameId === 'APIC' || frameId === 'PIC') && frameEnd - dataStart > 8) {
        const encoding = bytes[dataStart];
        let cursor = dataStart + 1;
        let mime = 'image/jpeg';

        if (frameId === 'PIC') {
          const imageFormat = String.fromCharCode(...bytes.slice(cursor, cursor + 3)).toUpperCase();
          mime = imageFormat === 'PNG' ? 'image/png' : 'image/jpeg';
          cursor += 3;
        } else {
          const mimeEnd = bytes.indexOf(0, cursor);
          if (mimeEnd === -1 || mimeEnd >= frameEnd) break;
          const declaredMime = new TextDecoder().decode(bytes.slice(cursor, mimeEnd));
          if (declaredMime.startsWith('image/')) mime = declaredMime;
          cursor = mimeEnd + 1;
        }

        // Tipo de imagen, seguido por la descripción terminada en cero.
        cursor += 1;
        cursor = findTextTerminator(bytes.subarray(0, frameEnd), cursor, encoding);

        if (cursor < frameEnd) {
          const imageBlob = new Blob([bytes.slice(cursor, frameEnd)], { type: mime });
          if (imageBlob.size > 0) return URL.createObjectURL(imageBlob);
        }
      }

      offset = frameEnd;
    }
  } catch (error) {
    console.warn('No se pudo leer la portada ID3 del archivo:', file.name, error);
  }

  return null;
}

function Player({ language = 'es', onLanguageChange = () => {}, initialSection = 'local' }) {
  const audioRef = useRef(null);
  const fileInputRef = useRef(null);
  const shouldAutoPlayRef = useRef(false);
  const playerLayoutRef = useRef(null);
  const controlsTimeoutRef = useRef(null);
  const dragCounterRef = useRef(0);
  // Conserva la energía y los colores efectivos entre el visualizador normal y fullscreen.
  const visualizerColorStateRef = useRef({
    energy: { low: 0, mid: 0, high: 0 },
    colors: null
  });

  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);
  const filtersRef = useRef([]);
  const songsRef = useRef([]);

  const [songs, setSongs] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [analyser, setAnalyser] = useState(null);

  const [equalizerValues, setEqualizerValues] = useState([0, 0, 0, 0, 0]);
  const [equalizerPreset, setEqualizerPreset] = useState('Normal');
  // Reloj compartido por los dos visualizadores: cambiar de vista no reinicia la transición cromática.
  const [colorTransitionStart, setColorTransitionStart] = useState(() => performance.now());
  const [visualizerMode, setVisualizerMode] = useState('classic');

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showFullscreenControls, setShowFullscreenControls] = useState(true);
  const [showFullscreenLibrary, setShowFullscreenLibrary] = useState(false);
  const [librarySearch, setLibrarySearch] = useState('');
  const [activeSection, setActiveSection] = useState(initialSection);
  const [currentAudiusSong, setCurrentAudiusSong] = useState(null);
  const [audiusQueue, setAudiusQueue] = useState([]);
  const [audiusIndex, setAudiusIndex] = useState(0);
  const [libraryNotice, setLibraryNotice] = useState(null);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);

  songsRef.current = songs;

  useEffect(() => {
    // Un cambio real de perfil inicia una transición nueva desde el cian.
    // Cambiar entre vista normal y fullscreen no modifica este estado.
    visualizerColorStateRef.current = {
      energy: { low: 0, mid: 0, high: 0 },
      colors: null
    };
    setColorTransitionStart(performance.now());
  }, [equalizerPreset]);

  const tr = (key, spanish, english) => {
    const translated = t(language, key);
    if (!translated || translated === key) {
      return language === 'en' ? english : spanish;
    }
    return translated;
  };

  const currentSong = currentAudiusSong || songs[currentIndex];

  const filteredSongs = songs
    .map((song, index) => ({ ...song, originalIndex: index }))
    .filter(song =>
      song.name.toLowerCase().includes(librarySearch.toLowerCase().trim())
    );

  const formatTime = (time) => {
    if (!Number.isFinite(time)) return '00:00';

    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);

    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const initializeAudioGraph = () => {
    if (audioContextRef.current) return audioContextRef.current;

    const AudioContextClass =
      window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass || !audioRef.current) return null;

    const context = new AudioContextClass();
    const analyserNode = context.createAnalyser();

    analyserNode.fftSize = 2048;
    analyserNode.smoothingTimeConstant = 0.82;

    const frequencies = [60, 250, 1000, 4000, 12000];

    const filters = frequencies.map((frequency, index) => {
      const filter = context.createBiquadFilter();

      filter.type = 'peaking';
      filter.frequency.value = frequency;
      filter.Q.value = 1;
      filter.gain.value = equalizerValues[index];

      return filter;
    });

    const source = context.createMediaElementSource(audioRef.current);

    source.connect(filters[0]);

    for (let i = 0; i < filters.length - 1; i++) {
      filters[i].connect(filters[i + 1]);
    }

    filters[filters.length - 1].connect(analyserNode);
    analyserNode.connect(context.destination);

    audioContextRef.current = context;
    analyserRef.current = analyserNode;
    sourceRef.current = source;
    filtersRef.current = filters;

    setAnalyser(analyserNode);

    return context;
  };

  useEffect(() => {
    filtersRef.current.forEach((filter, index) => {
      filter.gain.setTargetAtTime(
        equalizerValues[index],
        audioContextRef.current?.currentTime || 0,
        0.015
      );
    });
  }, [equalizerValues]);

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const getFileIdentifier = (file) => JSON.stringify([
    file.name,
    file.size,
    file.lastModified
  ]);

  const addAudioFiles = async (fileList) => {
    const files = Array.from(fileList || []);
    const audioFiles = files.filter(file =>
      file.type.startsWith('audio/') ||
      /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(file.name)
    );

    if (audioFiles.length === 0) {
      setLibraryNotice({ type: 'info', key: 'noCompatibleAudio' });
      return;
    }

    const existingSongs = songsRef.current;
    const existingIdentifiers = new Set(
      existingSongs.map(song => getFileIdentifier(song.file))
    );
    const newIdentifiers = new Set();
    const newSongs = [];
    let duplicateCount = 0;

    for (const file of audioFiles) {
      const identifier = getFileIdentifier(file);
      if (existingIdentifiers.has(identifier) || newIdentifiers.has(identifier)) {
        duplicateCount++;
        continue;
      }

      newIdentifiers.add(identifier);
      const artwork = await extractMp3Artwork(file);
      newSongs.push({
        id: crypto.randomUUID(),
        name: file.name.replace(/\.[^/.]+$/, ''),
        file,
        url: URL.createObjectURL(file),
        artwork
      });
    }

    if (newSongs.length > 0) {
      const context = initializeAudioGraph();
      if (context?.state === 'suspended') context.resume();

      const libraryWasEmpty = existingSongs.length === 0;
      setSongs(previousSongs => [...previousSongs, ...newSongs]);

      if (libraryWasEmpty) {
        setCurrentIndex(0);
        shouldAutoPlayRef.current = true;
      }
    }

    if (newSongs.length > 0 && duplicateCount > 0) {
      setLibraryNotice({ type: 'success', key: 'addedWithDuplicates', added: newSongs.length, duplicates: duplicateCount });
    } else if (newSongs.length > 0) {
      setLibraryNotice({ type: 'success', key: 'addedSuccessfully', added: newSongs.length });
    } else {
      setLibraryNotice({ type: 'info', key: 'alreadyInLibrary', duplicates: duplicateCount });
    }
  };

  const handleFiles = (event) => {
    const input = event.currentTarget;
    addAudioFiles(input.files).finally(() => { input.value = ''; });
  };

  const hasDraggedFiles = (event) =>
    Array.from(event.dataTransfer?.types || []).includes('Files');

  const handleDragEnter = (event) => {
    if (activeSection !== 'local' || isFullscreen || !hasDraggedFiles(event)) return;
    event.preventDefault();
    dragCounterRef.current += 1;
    setIsDraggingFiles(true);
  };

  const handleDragOver = (event) => {
    if (activeSection !== 'local' || isFullscreen || !hasDraggedFiles(event)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  };

  const handleDragLeave = (event) => {
    if (activeSection !== 'local' || isFullscreen || !hasDraggedFiles(event)) return;
    event.preventDefault();
    dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
    if (dragCounterRef.current === 0) setIsDraggingFiles(false);
  };

  const handleDrop = (event) => {
    if (activeSection !== 'local' || isFullscreen || !hasDraggedFiles(event)) return;
    event.preventDefault();
    dragCounterRef.current = 0;
    setIsDraggingFiles(false);
    addAudioFiles(event.dataTransfer.files);
  };

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio || !currentSong) return;

    audio.src = currentSong.url;
    audio.load();

    setCurrentTime(0);
    setDuration(0);

    if (shouldAutoPlayRef.current) {
      shouldAutoPlayRef.current = false;

      audio.play()
        .then(() => setIsPlaying(true))
        .catch(error => {
          console.error('Error al reproducir:', error);
          setIsPlaying(false);
        });
    } else {
      setIsPlaying(false);
    }
  }, [currentSong?.url]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  const togglePlay = async () => {
    const audio = audioRef.current;

    if (!audio || !currentSong) return;

    const context = initializeAudioGraph();

    if (context?.state === 'suspended') await context.resume();

    if (audio.paused) {
      try {
        await audio.play();
        setIsPlaying(true);
      } catch (error) {
        console.error('Error al reproducir:', error);
      }
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  };

  const playSong = (index) => {
    const wasPlayingAudius = Boolean(currentAudiusSong);
    setCurrentAudiusSong(null);
    setAudiusQueue([]);
    setAudiusIndex(0);

    if (index === currentIndex && !wasPlayingAudius) {
      if (audioRef.current?.paused) togglePlay();
      return;
    }

    shouldAutoPlayRef.current = true;
    setCurrentIndex(index);
  };

  const playAudiusTrack = (track, queue) => {
    const context = initializeAudioGraph();
    if (context?.state === 'suspended') context.resume();

    const normalizedQueue = (queue || [track]).filter(Boolean);
    const selectedIndex = Math.max(0, normalizedQueue.findIndex(item => item.id === track.id));
    setAudiusQueue(normalizedQueue);
    setAudiusIndex(selectedIndex);
    setCurrentAudiusSong(track);
    shouldAutoPlayRef.current = true;
    setIsPlaying(false);
  };

  const nextSong = () => {
    if (currentAudiusSong && audiusQueue.length > 0) {
      if (audiusQueue.length === 1) {
        const audio = audioRef.current;
        if (audio) { audio.currentTime = 0; audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false)); }
        return;
      }
      const nextIndex = (audiusIndex + 1) % audiusQueue.length;
      setAudiusIndex(nextIndex);
      setCurrentAudiusSong(audiusQueue[nextIndex]);
      shouldAutoPlayRef.current = true;
      return;
    }

    if (songs.length === 0) return;

    if (songs.length === 1) {
      const audio = audioRef.current;

      if (audio) {
        audio.currentTime = 0;
        audio.play()
          .then(() => setIsPlaying(true))
          .catch(error => console.error('Error al reproducir:', error));
      }

      return;
    }

    shouldAutoPlayRef.current = true;
    setCurrentIndex(previous => (previous + 1) % songs.length);
  };

  const previousSong = () => {
    if (currentAudiusSong && audiusQueue.length > 0) {
      const audio = audioRef.current;
      if (audio && audio.currentTime > 3) { audio.currentTime = 0; return; }
      const previousIndex = (audiusIndex - 1 + audiusQueue.length) % audiusQueue.length;
      setAudiusIndex(previousIndex);
      setCurrentAudiusSong(audiusQueue[previousIndex]);
      shouldAutoPlayRef.current = true;
      return;
    }

    if (songs.length === 0) return;

    const audio = audioRef.current;

    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }

    shouldAutoPlayRef.current = true;
    setCurrentIndex(previous => (previous - 1 + songs.length) % songs.length);
  };

  const updateProgress = () => {
    if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
  };

  const updateDuration = () => {
    if (audioRef.current) setDuration(audioRef.current.duration);
  };

  const handleSeek = (event) => {
    const audio = audioRef.current;
    if (!audio) return;

    const newTime = Number(event.target.value);
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const removeSong = (index) => {
    const removedSong = songs[index];
    if (!removedSong) return;

    const audio = audioRef.current;

    if (index === currentIndex) {
      if (songs.length === 1) {
        audio?.pause();
        audio?.removeAttribute('src');
        audio?.load();

        URL.revokeObjectURL(removedSong.url);
        if (removedSong.artwork?.startsWith('blob:')) URL.revokeObjectURL(removedSong.artwork);

        setSongs([]);
        setCurrentIndex(0);
        setIsPlaying(false);
        setCurrentTime(0);
        setDuration(0);
        return;
      }

      const nextIndex = index === songs.length - 1 ? index - 1 : index;

      URL.revokeObjectURL(removedSong.url);
      if (removedSong.artwork?.startsWith('blob:')) URL.revokeObjectURL(removedSong.artwork);
      shouldAutoPlayRef.current = true;

      setSongs(previous => previous.filter((_, i) => i !== index));
      setCurrentIndex(nextIndex);
      return;
    }

    URL.revokeObjectURL(removedSong.url);
    if (removedSong.artwork?.startsWith('blob:')) URL.revokeObjectURL(removedSong.artwork);

    setSongs(previous => previous.filter((_, i) => i !== index));

    if (index < currentIndex) {
      setCurrentIndex(previous => previous - 1);
    }
  };

  const scheduleHideFullscreenControls = (force = false) => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }

    if (showFullscreenLibrary && !force) return;

    controlsTimeoutRef.current = setTimeout(() => {
      setShowFullscreenControls(false);
    }, 2500);
  };

  const revealFullscreenControls = (event) => {
    setShowFullscreenControls(true);

    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }

    const target = event?.target;

    const isOverInteractiveArea = target?.closest?.(
      '.fullscreen-controls, .fullscreen-topbar, .visualizer-toolbar, .visualizer-mode-card, .fullscreen-library-panel'
    );

    if (isOverInteractiveArea || showFullscreenLibrary) return;

    scheduleHideFullscreenControls();
  };

  const enterFullscreen = async () => {
    const element = playerLayoutRef.current;
    if (!element) return;

    try {
      await element.requestFullscreen();
      setShowFullscreenControls(true);
    } catch (error) {
      console.error('No se pudo activar la pantalla completa:', error);
    }
  };

  const exitFullscreen = async () => {
    if (document.fullscreenElement) await document.exitFullscreen();
  };

  const toggleFullscreenLibrary = () => {
    const next = !showFullscreenLibrary;
    setShowFullscreenLibrary(next);

    if (next) {
      setShowFullscreenControls(true);

      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    } else {
      scheduleHideFullscreenControls(true);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      const active = document.fullscreenElement === playerLayoutRef.current;

      setIsFullscreen(active);

      if (active) {
        setShowFullscreenControls(true);
        scheduleHideFullscreenControls();
      } else {
        setShowFullscreenControls(true);
        setShowFullscreenLibrary(false);

        if (controlsTimeoutRef.current) {
          clearTimeout(controlsTimeoutRef.current);
        }
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);

      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    return () => {
      songsRef.current.forEach(song => {
        URL.revokeObjectURL(song.url);
        if (song.artwork?.startsWith('blob:')) URL.revokeObjectURL(song.artwork);
      });
    };
  }, []);

  useEffect(() => {
    return () => {
      sourceRef.current?.disconnect();

      filtersRef.current.forEach(filter => filter.disconnect());
      analyserRef.current?.disconnect();

      if (
        audioContextRef.current &&
        audioContextRef.current.state !== 'closed'
      ) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const getNoticeMessage = () => {
    if (!libraryNotice) return '';

    const { key, added, duplicates } = libraryNotice;

    if (key === 'noCompatibleAudio') {
      return tr(
        key,
        'No se encontraron archivos de audio compatibles.',
        'No compatible audio files were found.'
      );
    }

    if (key === 'addedWithDuplicates') {
      return language === 'en'
        ? `${added} songs added · ${duplicates} duplicates skipped`
        : `${added} canciones agregadas · ${duplicates} repetidas omitidas`;
    }

    if (key === 'addedSuccessfully') {
      return language === 'en'
        ? `${added} songs added successfully`
        : `${added} canciones agregadas correctamente`;
    }

    if (key === 'alreadyInLibrary') {
      return language === 'en'
        ? `${duplicates} songs were already in your library`
        : `${duplicates} canciones ya estaban en tu biblioteca`;
    }

    return '';
  };

  const renderLibraryNotice = () => {
    if (!libraryNotice) return null;

    return (
      <div
        className={`library-notice ${libraryNotice.type === 'info' ? 'notice-info' : ''}`}
        role="status"
      >
        <Music2 size={17} />
        <span>{getNoticeMessage()}</span>

        <button
          type="button"
          onClick={() => setLibraryNotice(null)}
          aria-label={tr('closeNotice', 'Cerrar aviso', 'Close notice')}
          title={tr('closeNotice', 'Cerrar aviso', 'Close notice')}
        >
          <X size={15} />
        </button>
      </div>
    );
  };

  const renderSongList = (compact = false) => {
    if (songs.length === 0) {
      return (
        <div className="empty-playlist">
          <Music2 size={compact ? 28 : 35} />
          <p>{tr('emptyLibrary', 'Tu biblioteca musical está vacía', 'Your music library is empty')}</p>
          <span>{tr('addAudioToListen', 'Agregá archivos de audio para comenzar a escuchar', 'Add audio files to start listening')}</span>
        </div>
      );
    }

    if (filteredSongs.length === 0) {
      return (
        <div className="empty-playlist search-empty">
          <Search size={25} />
          <p>{tr('noSongsFound', 'No se encontraron canciones', 'No songs found')}</p>
          <span>{tr('tryAnotherSearch', 'Probá con otra búsqueda', 'Try another search')}</span>
        </div>
      );
    }

    return filteredSongs.map(song => (
      <div
        className={`playlist-song ${song.originalIndex === currentIndex ? 'active' : ''}`}
        key={song.id}
      >
        <button
          className="song-select"
          onClick={() => playSong(song.originalIndex)}
          title={`${tr('play', 'Reproducir', 'Play')} ${song.name}`}
        >
          <TrackArtwork artwork={song.artwork} className="track-artwork-row" alt={song.name} />
          <span>{song.name}</span>
        </button>

        {song.originalIndex === currentIndex && isPlaying && (
          <span className="playing-label">
            {tr('playing', 'REPRODUCIENDO', 'PLAYING')}
          </span>
        )}

        <button
          className="remove-song"
          onClick={() => removeSong(song.originalIndex)}
          title={tr('removeSong', 'Eliminar canción', 'Remove song')}
          aria-label={`${tr('removeSong', 'Eliminar', 'Remove')} ${song.name}`}
        >
          <Trash2 size={compact ? 15 : 17} />
        </button>
      </div>
    ));
  };

  const languageSelector = (
    <div className="language-control">
      <span className="language-hint">{language === 'en' ? 'CHANGE LANGUAGE HERE' : 'CAMBIÁ EL IDIOMA AQUÍ'}</span>
      <div className="language-selector" aria-label={language === 'en' ? 'Language selector' : 'Selector de idioma'}>
      <button
        type="button"
        className={language === 'es' ? 'active' : ''}
        onClick={() => onLanguageChange('es')}
        aria-pressed={language === 'es'}
        title="Español"
      >
        ES
      </button>

      <span className="language-divider">/</span>

      <button
        type="button"
        className={language === 'en' ? 'active' : ''}
        onClick={() => onLanguageChange('en')}
        aria-pressed={language === 'en'}
        title="English"
      >
        EN
      </button>
      </div>
    </div>
  );

  return (
    <main
      className={`player-layout source-${activeSection} ${isFullscreen ? 'fullscreen-active' : ''} ${isDraggingFiles ? 'files-dragging' : ''}`}
      ref={playerLayoutRef}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <audio
        crossOrigin="anonymous"
        ref={audioRef}
        onTimeUpdate={updateProgress}
        onLoadedMetadata={updateDuration}
        onEnded={nextSong}
      />

      <input
        ref={fileInputRef}
        className="shared-audio-input"
        type="file"
        accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac"
        multiple
        onChange={handleFiles}
      />

      {isDraggingFiles && activeSection === 'local' && !isFullscreen && (
        <div className="file-drop-overlay" role="status" aria-live="polite">
          <div><FolderOpen size={42} /><strong>{language === 'en' ? 'Drop your music files here' : 'Soltá tus canciones aquí'}</strong><span>{language === 'en' ? 'MP3, WAV, OGG, M4A, AAC and FLAC' : 'MP3, WAV, OGG, M4A, AAC y FLAC'}</span></div>
        </div>
      )}

      <header className="player-header">
        <div className="player-header-main">
          <div className="player-brand">
            <img
              className="player-brand-logo"
              src={echoPulseLogo}
              alt=""
              aria-hidden="true"
            />
            <Music2 className="player-brand-music" size={23} aria-hidden="true" />
            <h1>EchoPulse</h1>
          </div>

          <span className="player-status">MUSIC PLAYER</span>
        </div>

        {languageSelector}
      </header>

      {!isFullscreen && (
        <>
          <div className="source-navigation-guidance">
            {language === 'en' ? 'Click here to switch between music modes' : 'Hacé clic aquí para cambiar de modo'}
          </div>
          <nav className="source-navigation" aria-label={language === 'en' ? 'Music sections' : 'Secciones de música'}>
          <button
            type="button"
            className={`source-nav-local ${activeSection === 'local' ? 'active' : ''}`}
            onClick={() => setActiveSection('local')}
            aria-pressed={activeSection === 'local'}
          >
            <FolderOpen size={17} />
            {language === 'en' ? 'My music' : 'Mi música'}
          </button>
          <button
            type="button"
            className={`source-nav-discover ${activeSection === 'discover' ? 'active' : ''}`}
            onClick={() => setActiveSection('discover')}
            aria-pressed={activeSection === 'discover'}
          >
            <Compass size={17} />
            {language === 'en' ? 'Discover music' : 'Descubrir música'}
          </button>
          </nav>
        </>
      )}

      <section className="music-player">
        <div className="visualizer-section">
          <div className="visualizer-area">
            {!isFullscreen && (
              <Visualizer
                analyser={analyser}
                preset={equalizerPreset}
                colorTransitionStart={colorTransitionStart}
                colorStateRef={visualizerColorStateRef}
                equalizerValues={equalizerValues}
                mode={visualizerMode}
                onModeChange={setVisualizerMode}
                language={language}
              />
            )}
          </div>

          <div className="fullscreen-launch-row">
            <span>
              {tr(
                'expandVisualizer',
                'Expandí el visualizador para disfrutarlo a pantalla completa',
                'Expand the visualizer to enjoy it in fullscreen'
              )}
            </span>

            <button
              className="fullscreen-launch"
              onClick={enterFullscreen}
              title={tr('openFullscreen', 'Abrir visualizador a pantalla completa', 'Open fullscreen visualizer')}
              aria-label={tr('openFullscreen', 'Abrir visualizador a pantalla completa', 'Open fullscreen visualizer')}
            >
              <Maximize size={17} />
              <span>{tr('fullscreen', 'Pantalla completa', 'Fullscreen')}</span>
            </button>
          </div>
        </div>

        {!isFullscreen && (
          <VisualizerModeSelector
            mode={visualizerMode}
            onModeChange={setVisualizerMode}
            language={language}
          />
        )}

        <div className={`current-track ${currentSong ? 'has-current-song' : ''}`}>
          {currentSong && <TrackArtwork artwork={currentSong.artwork} className="track-artwork-current" alt={currentSong.name} />}
          <div className="current-track-copy">
            <h2>{currentSong ? currentSong.name : tr('nothingPlaying', 'Nada reproduciéndose', 'Nothing playing')}</h2>
            <p>
              {currentSong
                ? (currentSong.artist || tr('nowPlaying', 'Reproduciendo ahora', 'Now playing'))
                : tr('selectSong', 'Seleccioná una canción para comenzar', 'Select a song to get started')}
            </p>
            {currentSong && isPlaying && <span className="current-track-playing"><Music2 size={13} /> {tr('playing', 'REPRODUCIENDO', 'PLAYING')}</span>}
          </div>
        </div>

        <div className="track-progress">
          <span>{formatTime(currentTime)}</span>
          <input
            type="range"
            min="0"
            max={duration || 0}
            step="0.1"
            value={currentTime}
            onChange={handleSeek}
            disabled={!currentSong || !duration}
          />
          <span>{formatTime(duration)}</span>
        </div>

        <div className="player-controls">
          <button onClick={previousSong} disabled={!currentSong} title={tr('previous', 'Anterior', 'Previous')}>
            <SkipBack size={23} />
          </button>

          <button
            className="play-button"
            onClick={togglePlay}
            disabled={!currentSong}
            title={isPlaying ? tr('pause', 'Pausar', 'Pause') : tr('play', 'Reproducir', 'Play')}
          >
            {isPlaying
              ? <Pause size={25} fill="currentColor" />
              : <Play size={25} fill="currentColor" />}
          </button>

          <button onClick={nextSong} disabled={!currentSong} title={tr('next', 'Siguiente', 'Next')}>
            <SkipForward size={23} />
          </button>
        </div>

        <div className="volume-control">
          <Volume2 size={20} />
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={event => setVolume(Number(event.target.value))}
          />
        </div>
      </section>

      <Equalizer
        values={equalizerValues}
        onChange={setEqualizerValues}
        preset={equalizerPreset}
        onPresetChange={setEqualizerPreset}
        language={language}
      />

      {activeSection === 'local' ? (
      <section className="playlist-panel">
        <div className="playlist-header">
          <div>
            <ListMusic size={21} />
            <h2>{tr('musicLibrary', 'Biblioteca musical', 'Music Library')}</h2>
          </div>
          <span>{songs.length} {tr('tracks', 'canciones', 'tracks')}</span>
        </div>

        <p className="local-drop-hint">
          {language === 'en'
            ? 'Add MP3s with the button or drag them here. Embedded album artwork will appear automatically.'
            : 'Agregá MP3 con el botón o arrastralos directamente aquí. Si tienen portada incorporada, EchoPulse la mostrará.'}
        </p>
        <div className="library-toolbar">
          <button className="add-music-button" onClick={openFilePicker}>
            <FolderOpen size={19} />
            {tr('addMusic', 'Agregar música', 'Add music')}
          </button>

          <label className="library-search">
            <Search size={17} />
            <input
              type="search"
              placeholder={tr('searchMusic', 'Buscar en tu música...', 'Search your music...')}
              value={librarySearch}
              onChange={event => setLibrarySearch(event.target.value)}
            />

            {librarySearch && (
              <button
                type="button"
                onClick={() => setLibrarySearch('')}
                aria-label={tr('clearSearch', 'Limpiar búsqueda', 'Clear search')}
              >
                <X size={15} />
              </button>
            )}
          </label>
        </div>

        {renderLibraryNotice()}

        <div className="playlist-content">
          {renderSongList()}
        </div>
      </section>
      ) : (
        <AudiusExplorer language={language} onPlayTrack={playAudiusTrack} />
      )}

      {isFullscreen && (
        <section
          className={`fullscreen-experience ${showFullscreenControls ? 'controls-visible' : ''} ${showFullscreenLibrary ? 'library-open' : ''}`}
          onPointerMove={revealFullscreenControls}
          onPointerDown={revealFullscreenControls}
          onPointerLeave={() => scheduleHideFullscreenControls()}
        >
          <div className="fullscreen-topbar">
            <div className="fullscreen-brand">
              <Music2 size={22} />
              <span>EchoPulse</span>
            </div>

            <div className="fullscreen-topbar-actions">
              {languageSelector}

              <button
                className={`fullscreen-library-toggle ${showFullscreenLibrary ? 'active' : ''}`}
                onClick={toggleFullscreenLibrary}
                title={tr('openLibrary', 'Abrir biblioteca musical', 'Open music library')}
                aria-label={tr('openLibrary', 'Abrir biblioteca musical', 'Open music library')}
              >
                <FolderOpen size={18} />
                <span>{tr('library', 'Biblioteca', 'Library')}</span>
                <span className="fullscreen-library-count">{songs.length}</span>
              </button>

              <button
                className="fullscreen-exit"
                onClick={exitFullscreen}
                title={tr('exitFullscreen', 'Salir de pantalla completa', 'Exit fullscreen')}
                aria-label={tr('exitFullscreen', 'Salir de pantalla completa', 'Exit fullscreen')}
              >
                <X size={21} />
              </button>
            </div>
          </div>

          <div className="fullscreen-main">
            <div className="fullscreen-visualizer">
              <Visualizer
                analyser={analyser}
                preset={equalizerPreset}
                colorTransitionStart={colorTransitionStart}
                colorStateRef={visualizerColorStateRef}
                equalizerValues={equalizerValues}
                mode={visualizerMode}
                onModeChange={setVisualizerMode}
                language={language}
              />
              <VisualizerModeSelector
                mode={visualizerMode}
                onModeChange={setVisualizerMode}
                language={language}
              />
            </div>

            <aside className="fullscreen-now-playing">
              <span className="fullscreen-eyebrow">
                {tr('nowPlayingUpper', 'REPRODUCIENDO AHORA', 'NOW PLAYING')}
              </span>

              <div className="fullscreen-track-icon">
                {currentSong
                  ? <TrackArtwork artwork={currentSong.artwork} className="track-artwork-fullscreen" alt={currentSong.name} />
                  : <Music2 size={35} />}
              </div>

              <h2>{currentSong ? currentSong.name : tr('nothingPlaying', 'Nada reproduciéndose', 'Nothing playing')}</h2>

              <p>
                {currentSong
                  ? (currentSong.artist || tr('echoPulsePlaying', 'EchoPulse está reproduciendo', 'EchoPulse is playing'))
                  : tr('selectSongInLibrary', 'Seleccioná una canción de tu biblioteca', 'Select a song in your library')}
              </p>

              <div className="fullscreen-track-status">
                <span className={isPlaying ? 'status-playing' : ''} />
                {isPlaying
                  ? tr('playing', 'REPRODUCIENDO', 'PLAYING')
                  : tr('paused', 'EN PAUSA', 'PAUSED')}
              </div>
            </aside>
          </div>

          <aside className="fullscreen-library-panel">
            <div className="fullscreen-library-header">
              <div>
                <span className="fullscreen-eyebrow">
                  {tr('yourCollection', 'TU COLECCIÓN', 'YOUR COLLECTION')}
                </span>
                <h2>{tr('musicLibrary', 'Biblioteca musical', 'Music Library')}</h2>
                <p>{songs.length} {tr('tracksAvailable', 'canciones disponibles', 'tracks available')}</p>
              </div>

              <button
                onClick={toggleFullscreenLibrary}
                title={tr('closeLibrary', 'Cerrar biblioteca', 'Close library')}
                aria-label={tr('closeLibrary', 'Cerrar biblioteca', 'Close library')}
              >
                <X size={19} />
              </button>
            </div>

            <button className="fullscreen-add-music" onClick={openFilePicker}>
              <FolderOpen size={17} />
              {tr('addMusic', 'Agregar música', 'Add music')}
            </button>

            {renderLibraryNotice()}

            <label className="library-search fullscreen-library-search">
              <Search size={16} />
              <input
                type="search"
                placeholder={tr('searchMusic', 'Buscar en tu música...', 'Search your music...')}
                value={librarySearch}
                onChange={event => setLibrarySearch(event.target.value)}
              />

              {librarySearch && (
                <button
                  type="button"
                  onClick={() => setLibrarySearch('')}
                  aria-label={tr('clearSearch', 'Limpiar búsqueda', 'Clear search')}
                >
                  <X size={14} />
                </button>
              )}
            </label>

            <div className="fullscreen-library-list">
              {renderSongList(true)}
            </div>
          </aside>

          <div className="fullscreen-controls">
            <div className="fullscreen-playback">
              <div className="fullscreen-progress">
                <span>{formatTime(currentTime)}</span>
                <input
                  type="range"
                  min="0"
                  max={duration || 0}
                  step="0.1"
                  value={currentTime}
                  onChange={handleSeek}
                  disabled={!currentSong || !duration}
                />
                <span>{formatTime(duration)}</span>
              </div>

              <div className="fullscreen-buttons">
                <button onClick={previousSong} disabled={!currentSong} title={tr('previous', 'Anterior', 'Previous')}>
                  <SkipBack size={21} />
                </button>

                <button
                  className="fullscreen-play-button"
                  onClick={togglePlay}
                  disabled={!currentSong}
                  title={isPlaying ? tr('pause', 'Pausar', 'Pause') : tr('play', 'Reproducir', 'Play')}
                >
                  {isPlaying
                    ? <Pause size={23} fill="currentColor" />
                    : <Play size={23} fill="currentColor" />}
                </button>

                <button onClick={nextSong} disabled={!currentSong} title={tr('next', 'Siguiente', 'Next')}>
                  <SkipForward size={21} />
                </button>

                <div className="fullscreen-volume">
                  <Volume2 size={18} />
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={volume}
                    onChange={event => setVolume(Number(event.target.value))}
                  />
                </div>
              </div>
            </div>

            <div className="fullscreen-equalizer">
              <Equalizer
                values={equalizerValues}
                onChange={setEqualizerValues}
                preset={equalizerPreset}
                onPresetChange={setEqualizerPreset}
                language={language}
              />
            </div>
          </div>

          <div className="fullscreen-hint">
            {tr('pressEsc', 'Presioná ESC para volver', 'Press ESC to return')}
          </div>
        </section>
      )}
    </main>
  );
}

export default Player;

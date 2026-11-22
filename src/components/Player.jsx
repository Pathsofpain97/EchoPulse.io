
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
  Search
} from 'lucide-react';

import Visualizer from './Visualizer';
import Equalizer from './Equalizer';

import '../styles/player.css';
import '../styles/fullscreen.css';

function Player() {
  const audioRef = useRef(null);
  const fileInputRef = useRef(null);
  const shouldAutoPlayRef = useRef(false);

  const playerLayoutRef = useRef(null);
  const controlsTimeoutRef = useRef(null);

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

  const [equalizerValues, setEqualizerValues] = useState([
    0, 0, 0, 0, 0
  ]);

  const [equalizerPreset, setEqualizerPreset] = useState('Normal');

  const [visualizerMode, setVisualizerMode] = useState('classic');

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showFullscreenControls, setShowFullscreenControls] = useState(true);
  const [showFullscreenLibrary, setShowFullscreenLibrary] = useState(false);

  const [librarySearch, setLibrarySearch] = useState('');

  songsRef.current = songs;

  const currentSong = songs[currentIndex];

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
    if (audioContextRef.current) {
      return audioContextRef.current;
    }

    const AudioContextClass =
      window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass || !audioRef.current) {
      return null;
    }

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

    // El analizador recibe el audio después de aplicar el ecualizador.
    filters[filters.length - 1].connect(analyserNode);

    analyserNode.connect(context.destination);

    audioContextRef.current = context;
    analyserRef.current = analyserNode;
    sourceRef.current = source;
    filtersRef.current = filters;

    setAnalyser(analyserNode);

    return context;
  };

  // Aplicar los cambios del ecualizador a los filtros de audio.
  useEffect(() => {
    filtersRef.current.forEach((filter, index) => {
      filter.gain.setTargetAtTime(
        equalizerValues[index],
        audioContextRef.current?.currentTime || 0,
        0.015
      );
    });
  }, [equalizerValues]);

  // Selector de archivos compartido por ambas bibliotecas.
  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const handleFiles = (event) => {
    const files = Array.from(event.target.files || []);

    const audioFiles = files.filter(file =>
      file.type.startsWith('audio/') ||
      /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(file.name)
    );

    if (audioFiles.length === 0) {
      event.target.value = '';
      return;
    }

    const context = initializeAudioGraph();

    if (context?.state === 'suspended') {
      context.resume();
    }

    const newSongs = audioFiles.map(file => ({
      id: crypto.randomUUID(),
      name: file.name.replace(/\.[^/.]+$/, ''),
      file,
      url: URL.createObjectURL(file)
    }));

    const libraryWasEmpty = songsRef.current.length === 0;

    setSongs(previousSongs => [
      ...previousSongs,
      ...newSongs
    ]);

    if (libraryWasEmpty) {
      setCurrentIndex(0);
      shouldAutoPlayRef.current = true;
    }

    event.target.value = '';
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
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const togglePlay = async () => {
    const audio = audioRef.current;

    if (!audio || !currentSong) return;

    const context = initializeAudioGraph();

    if (context?.state === 'suspended') {
      await context.resume();
    }

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
    if (index === currentIndex) {
      if (audioRef.current?.paused) {
        togglePlay();
      }

      return;
    }

    shouldAutoPlayRef.current = true;
    setCurrentIndex(index);
  };

  const nextSong = () => {
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

    setCurrentIndex(previous =>
      (previous + 1) % songs.length
    );
  };

  const previousSong = () => {
    if (songs.length === 0) return;

    const audio = audioRef.current;

    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }

    shouldAutoPlayRef.current = true;

    setCurrentIndex(previous =>
      (previous - 1 + songs.length) % songs.length
    );
  };

  const updateProgress = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const updateDuration = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
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

        setSongs([]);
        setCurrentIndex(0);
        setIsPlaying(false);
        setCurrentTime(0);
        setDuration(0);

        return;
      }

      const nextIndex = index === songs.length - 1
        ? index - 1
        : index;

      URL.revokeObjectURL(removedSong.url);

      shouldAutoPlayRef.current = true;

      setSongs(previous =>
        previous.filter((_, i) => i !== index)
      );

      setCurrentIndex(nextIndex);

      return;
    }

    URL.revokeObjectURL(removedSong.url);

    setSongs(previous =>
      previous.filter((_, i) => i !== index)
    );

    if (index < currentIndex) {
      setCurrentIndex(previous => previous - 1);
    }
  };

  // Controles de pantalla completa.
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
      '.fullscreen-controls, .fullscreen-topbar, .visualizer-toolbar, .fullscreen-library-panel'
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
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    }
  };

  // Apertura y cierre del panel lateral de biblioteca.
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
      const active =
        document.fullscreenElement === playerLayoutRef.current;

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
      });
    };
  }, []);

  useEffect(() => {
    return () => {
      sourceRef.current?.disconnect();

      filtersRef.current.forEach(filter => {
        filter.disconnect();
      });

      analyserRef.current?.disconnect();

      if (
        audioContextRef.current &&
        audioContextRef.current.state !== 'closed'
      ) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Lista reutilizable para biblioteca normal y fullscreen.
  const renderSongList = (compact = false) => {
    if (songs.length === 0) {
      return (
        <div className="empty-playlist">
          <Music2 size={compact ? 28 : 35} />
          <p>Your music library is empty</p>
          <span>Add audio files to start listening</span>
        </div>
      );
    }

    if (filteredSongs.length === 0) {
      return (
        <div className="empty-playlist search-empty">
          <Search size={25} />
          <p>No songs found</p>
          <span>Try another search</span>
        </div>
      );
    }

    return filteredSongs.map(song => (
      <div
        className={`playlist-song ${
          song.originalIndex === currentIndex ? 'active' : ''
        }`}
        key={song.id}
      >
        <button
          className="song-select"
          onClick={() => playSong(song.originalIndex)}
          title={`Play ${song.name}`}
        >
          <Music2 size={compact ? 16 : 19} />
          <span>{song.name}</span>
        </button>

        {song.originalIndex === currentIndex && isPlaying && (
          <span className="playing-label">PLAYING</span>
        )}

        <button
          className="remove-song"
          onClick={() => removeSong(song.originalIndex)}
          title="Remove song"
          aria-label={`Remove ${song.name}`}
        >
          <Trash2 size={compact ? 15 : 17} />
        </button>
      </div>
    ));
  };

  return (
    <main
      className={`player-layout ${isFullscreen ? 'fullscreen-active' : ''}`}
      ref={playerLayoutRef}
    >
      <audio
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

      {/* Encabezado */}
      <header className="player-header">
        <div className="player-brand">
          <Music2 size={27} />
          <h1>EchoPulse</h1>
        </div>

        <span className="player-status">MUSIC PLAYER</span>
      </header>

      {/* Reproductor principal */}
      <section className="music-player">
        <div className="visualizer-section">
          <div className="visualizer-area">
            {!isFullscreen && (
              <Visualizer
                analyser={analyser}
                preset={equalizerPreset}
                equalizerValues={equalizerValues}
                mode={visualizerMode}
                onModeChange={setVisualizerMode}
              />
            )}
          </div>

          <div className="fullscreen-launch-row">
            <span>
              Expandí el visualizador para disfrutarlo a pantalla completa
            </span>

            <button
              className="fullscreen-launch"
              onClick={enterFullscreen}
              title="Abrir visualizador a pantalla completa"
              aria-label="Abrir visualizador a pantalla completa"
            >
              <Maximize size={17} />
              <span>Pantalla completa</span>
            </button>
          </div>
        </div>

        <div className="current-track">
          <h2>{currentSong ? currentSong.name : 'Nothing playing'}</h2>
          <p>{currentSong ? 'Now playing' : 'Select a song to get started'}</p>
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
          <button onClick={previousSong} disabled={!currentSong} title="Previous">
            <SkipBack size={23} />
          </button>

          <button
            className="play-button"
            onClick={togglePlay}
            disabled={!currentSong}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying
              ? <Pause size={25} fill="currentColor" />
              : <Play size={25} fill="currentColor" />}
          </button>

          <button onClick={nextSong} disabled={!currentSong} title="Next">
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

      {/* Ecualizador normal */}
      <Equalizer
        values={equalizerValues}
        onChange={setEqualizerValues}
        preset={equalizerPreset}
        onPresetChange={setEqualizerPreset}
      />

      {/* Biblioteca musical normal */}
      <section className="playlist-panel">
        <div className="playlist-header">
          <div>
            <ListMusic size={21} />
            <h2>Music Library</h2>
          </div>

          <span>{songs.length} tracks</span>
        </div>

        <div className="library-toolbar">
          <button
            className="add-music-button"
            onClick={openFilePicker}
          >
            <FolderOpen size={19} />
            Add music
          </button>

          <label className="library-search">
            <Search size={17} />

            <input
              type="search"
              placeholder="Search your music..."
              value={librarySearch}
              onChange={event => setLibrarySearch(event.target.value)}
            />

            {librarySearch && (
              <button
                type="button"
                onClick={() => setLibrarySearch('')}
                aria-label="Clear search"
              >
                <X size={15} />
              </button>
            )}
          </label>
        </div>

        <div className="playlist-content">
          {renderSongList()}
        </div>
      </section>

      {/* Experiencia fullscreen */}
      {isFullscreen && (
        <section
          className={`fullscreen-experience ${
            showFullscreenControls ? 'controls-visible' : ''
          } ${showFullscreenLibrary ? 'library-open' : ''}`}
          onPointerMove={revealFullscreenControls}
          onPointerDown={revealFullscreenControls}
          onPointerLeave={scheduleHideFullscreenControls}
        >
          <div className="fullscreen-topbar">
            <div className="fullscreen-brand">
              <Music2 size={22} />
              <span>EchoPulse</span>
            </div>

            <div className="fullscreen-topbar-actions">
              <button
                className={`fullscreen-library-toggle ${
                  showFullscreenLibrary ? 'active' : ''
                }`}
                onClick={toggleFullscreenLibrary}
                title="Open music library"
                aria-label="Open music library"
              >
                <FolderOpen size={18} />
                <span>Library</span>
                <span className="fullscreen-library-count">
                  {songs.length}
                </span>
              </button>

              <button
                className="fullscreen-exit"
                onClick={exitFullscreen}
                title="Salir de pantalla completa"
                aria-label="Salir de pantalla completa"
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
                equalizerValues={equalizerValues}
                mode={visualizerMode}
                onModeChange={setVisualizerMode}
              />
            </div>

            <aside className="fullscreen-now-playing">
              <span className="fullscreen-eyebrow">NOW PLAYING</span>

              <div className="fullscreen-track-icon">
                <Music2 size={35} />
              </div>

              <h2>{currentSong ? currentSong.name : 'Nothing playing'}</h2>

              <p>
                {currentSong
                  ? 'EchoPulse is playing'
                  : 'Select a song in your library'}
              </p>

              <div className="fullscreen-track-status">
                <span className={isPlaying ? 'status-playing' : ''} />
                {isPlaying ? 'PLAYING' : 'PAUSED'}
              </div>
            </aside>
          </div>

          {/* Biblioteca lateral fullscreen */}
          <aside className="fullscreen-library-panel">
            <div className="fullscreen-library-header">
              <div>
                <span className="fullscreen-eyebrow">YOUR COLLECTION</span>
                <h2>Music Library</h2>
                <p>{songs.length} tracks available</p>
              </div>

              <button
                onClick={toggleFullscreenLibrary}
                title="Close library"
                aria-label="Close library"
              >
                <X size={19} />
              </button>
            </div>

            <button
              className="fullscreen-add-music"
              onClick={openFilePicker}
            >
              <FolderOpen size={17} />
              Add music
            </button>

            <label className="library-search fullscreen-library-search">
              <Search size={16} />

              <input
                type="search"
                placeholder="Search your music..."
                value={librarySearch}
                onChange={event => setLibrarySearch(event.target.value)}
              />

              {librarySearch && (
                <button
                  type="button"
                  onClick={() => setLibrarySearch('')}
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </label>

            <div className="fullscreen-library-list">
              {renderSongList(true)}
            </div>
          </aside>

          {/* Controles flotantes */}
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
                <button
                  onClick={previousSong}
                  disabled={!currentSong}
                  title="Previous"
                >
                  <SkipBack size={21} />
                </button>

                <button
                  className="fullscreen-play-button"
                  onClick={togglePlay}
                  disabled={!currentSong}
                  title={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying
                    ? <Pause size={23} fill="currentColor" />
                    : <Play size={23} fill="currentColor" />}
                </button>

                <button
                  onClick={nextSong}
                  disabled={!currentSong}
                  title="Next"
                >
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
              />
            </div>
          </div>

          <div className="fullscreen-hint">
            Presioná ESC para volver
          </div>
        </section>
      )}
    </main>
  );
}

export default Player;

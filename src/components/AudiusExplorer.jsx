import { useEffect, useState } from 'react';
import { Compass, Disc3, Headphones, LoaderCircle, Music2, Play, Search, Sparkles } from 'lucide-react';
import { getAudiusTrending, normalizeAudiusTrack, searchAudiusTracks } from '../services/audius';
import '../styles/audius-explorer.css';

function AudiusExplorer({ language = 'es', onPlayTrack }) {
  const isEnglish = language === 'en';
  const [query, setQuery] = useState('');
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  const copy = isEnglish ? {
    eyebrow: 'POWERED BY AUDIUS', title: 'Find your next favorite sound', subtitle: 'Explore independent artists and music from the Audius catalog.',
    search: 'Search tracks, artists or genres...', button: 'Search', trending: 'Trending this week', results: 'Search results', loading: 'Loading music...', empty: 'No tracks found. Try another search.',
    error: 'Audius could not be reached right now. Please try again in a moment.', retry: 'Try again', play: 'Play track', artist: 'Unknown artist', powered: 'Music catalog provided by Audius'
  } : {
    eyebrow: 'IMPULSADO POR AUDIUS', title: 'Encontrá tu próximo sonido favorito', subtitle: 'Explorá artistas independientes y música del catálogo de Audius.',
    search: 'Buscar canciones, artistas o géneros...', button: 'Buscar', trending: 'Tendencias de esta semana', results: 'Resultados de búsqueda', loading: 'Cargando música...', empty: 'No encontramos canciones. Probá con otra búsqueda.',
    error: 'No pudimos conectar con Audius en este momento. Intentá nuevamente en unos instantes.', retry: 'Reintentar', play: 'Reproducir canción', artist: 'Artista desconocido', powered: 'Catálogo musical proporcionado por Audius'
  };

  const loadTrending = async (signal) => {
    setLoading(true);
    setError('');
    setSearched(false);
    try {
      const data = await getAudiusTrending({ signal });
      setTracks(data.map(normalizeAudiusTrack).filter(Boolean));
    } catch (err) {
      if (err.name !== 'AbortError') setError(copy.error);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    loadTrending(controller.signal);
    return () => controller.abort();
    // Initial discovery request; language only changes presentation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = async (event) => {
    event.preventDefault();
    const term = query.trim();
    if (!term) {
      const controller = new AbortController();
      await loadTrending(controller.signal);
      return;
    }
    setLoading(true);
    setError('');
    setSearched(true);
    try {
      const data = await searchAudiusTracks(term);
      setTracks(data.map(normalizeAudiusTrack).filter(Boolean));
    } catch {
      setError(copy.error);
      setTracks([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePlay = (track) => onPlayTrack?.(track, tracks);

  return (
    <section className="audius-explorer" aria-label={isEnglish ? 'Discover music on Audius' : 'Explorar música en Audius'}>
      <div className="audius-explorer-heading">
        <span className="audius-explorer-eyebrow"><Sparkles size={13} /> {copy.eyebrow}</span>
        <h2>{copy.title}</h2>
        <p>{copy.subtitle}</p>
      </div>

      <form className="audius-search" onSubmit={handleSearch}>
        <Search size={19} aria-hidden="true" />
        <input value={query} onChange={event => setQuery(event.target.value)} placeholder={copy.search} aria-label={copy.search} />
        <button type="submit">{copy.button}</button>
      </form>

      <div className="audius-results-heading">
        <div><span className="audius-section-icon"><Compass size={17} /></span><h3>{searched ? copy.results : copy.trending}</h3></div>
        <span className="audius-results-count">{tracks.length}</span>
      </div>

      {loading ? (
        <div className="audius-state"><LoaderCircle className="audius-spinner" size={27} /><span>{copy.loading}</span></div>
      ) : error ? (
        <div className="audius-state audius-error"><Disc3 size={28} /><p>{error}</p><button type="button" onClick={() => loadTrending()}>{copy.retry}</button></div>
      ) : tracks.length === 0 ? (
        <div className="audius-state"><Headphones size={29} /><span>{copy.empty}</span></div>
      ) : (
        <div className="audius-track-grid">
          {tracks.map((track, index) => (
            <article className="audius-track-card" key={track.id}>
              <button className="audius-track-art" type="button" onClick={() => handlePlay(track)} aria-label={`${copy.play}: ${track.name}`}>
                {track.artwork ? <img src={track.artwork} alt="" loading="lazy" /> : <span className="audius-art-fallback"><Music2 size={30} /></span>}
                <span className="audius-art-play"><Play size={21} fill="currentColor" /></span>
              </button>
              <div className="audius-track-meta">
                <strong title={track.name}>{track.name}</strong>
                <span title={track.artist}>{track.artist || copy.artist}</span>
              </div>
              <button className="audius-track-play" type="button" onClick={() => handlePlay(track)} aria-label={`${copy.play}: ${track.name}`}><Play size={16} fill="currentColor" /></button>
              <span className="audius-track-index">{String(index + 1).padStart(2, '0')}</span>
            </article>
          ))}
        </div>
      )}
      <footer className="audius-explorer-footer">{copy.powered} · <a href="https://audius.co" target="_blank" rel="noreferrer">Audius</a></footer>
    </section>
  );
}

export default AudiusExplorer;

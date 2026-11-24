const API_BASE = 'https://api.audius.co/v1';
const API_KEY = import.meta.env.VITE_AUDIUS_API_KEY || '';

async function request(path, { signal } = {}) {
  const headers = {};
  if (API_KEY) headers['x-api-key'] = API_KEY;

  const response = await fetch(`${API_BASE}${path}`, { headers, signal });
  if (!response.ok) {
    const error = new Error(`Audius respondió con estado ${response.status}`);
    error.status = response.status;
    throw error;
  }
  const payload = await response.json();
  return Array.isArray(payload?.data) ? payload.data : [];
}

export function getAudiusTrending({ limit = 24, signal } = {}) {
  const params = new URLSearchParams({ time: 'week', limit: String(limit) });
  return request(`/tracks/trending?${params}`, { signal });
}

export function searchAudiusTracks(query, { limit = 30, signal } = {}) {
  const params = new URLSearchParams({ query, limit: String(limit), sort_method: 'relevant' });
  return request(`/tracks/search?${params}`, { signal });
}

function getArtwork(track) {
  const artwork = track?.artwork;
  if (typeof artwork === 'string') return artwork;
  return artwork?.['480x480'] || artwork?.['1000x1000'] || artwork?.['150x150'] || '';
}

export function normalizeAudiusTrack(track) {
  if (!track?.id || track.is_streamable === false || track.is_stream_gated === true) return null;
  const artist = track.user?.name || track.user?.handle || 'Audius Artist';
  return {
    id: `audius-${track.id}`,
    audiusId: track.id,
    name: track.title || 'Untitled track',
    artist,
    artwork: getArtwork(track),
    duration: Number(track.duration) || 0,
    genre: track.genre || '',
    source: 'audius',
    permalink: track.permalink ? `https://audius.co${track.permalink}` : 'https://audius.co',
    url: `${API_BASE}/tracks/${encodeURIComponent(track.id)}/stream`
  };
}

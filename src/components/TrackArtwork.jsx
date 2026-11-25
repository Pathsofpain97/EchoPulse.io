import { useEffect, useState } from 'react';
import { Music2 } from 'lucide-react';
import '../styles/track-artwork.css';

function TrackArtwork({ artwork, className = '', alt = 'Album artwork' }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [artwork]);

  return (
    <span className={`track-artwork ${className}`} aria-label={alt} role="img">
      {artwork && !failed ? (
        <img src={artwork} alt="" loading="lazy" onError={() => setFailed(true)} />
      ) : (
        <span className="track-artwork-fallback" aria-hidden="true">
          <Music2 />
          <small>ECHOPULSE</small>
        </span>
      )}
    </span>
  );
}

export default TrackArtwork;

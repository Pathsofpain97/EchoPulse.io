
import { RotateCcw, SlidersHorizontal } from 'lucide-react';
import { t } from './i18n/translations';
import '../styles/equalizer.css';

const frequencies = [
  '60 Hz',
  '250 Hz',
  '1 kHz',
  '4 kHz',
  '12 kHz'
];

const presets = {
  Normal: [0, 0, 0, 0, 0],
  Pop: [-1, 2, 4, 2, -1],
  Rock: [4, 2, -1, 3, 5],
  Bass: [7, 5, 0, -2, -3],
  Electronic: [5, 3, 0, 3, 4],
  Acoustic: [1, 2, 2, 1, 3],
  Jazz: [3, 2, 0, 2, 2],
  Classical: [0, 1, 1, 2, 3],
  Vocal: [-1, 1, 4, 3, 1],
  Night: [3, 2, 0, -2, -4]
};

function Equalizer({
  values,
  onChange,
  preset = 'Normal',
  onPresetChange = () => {},
  language = 'es'
}) {
  const handlePreset = (name) => {
    onPresetChange(name);
    onChange([...presets[name]]);
  };

  const handleBandChange = (index, value) => {
    onPresetChange('Personalizado');

    const updatedValues = [...values];
    updatedValues[index] = Number(value);

    onChange(updatedValues);
  };

  const resetEqualizer = () => {
    onPresetChange('Normal');
    onChange([...presets.Normal]);
  };

  const bands = t(language, 'bands');

  return (
    <section
      className="equalizer-panel"
      data-preset={preset}
    >
      <div className="equalizer-header">
        <div className="equalizer-title">
          <SlidersHorizontal size={19} />
          <h2>{t(language, 'equalizer')}</h2>
        </div>

        <button
          className="equalizer-reset"
          onClick={resetEqualizer}
          title={t(language, 'reset')}
        >
          <RotateCcw size={15} />
          {t(language, 'reset')}
        </button>
      </div>

      <div className="equalizer-presets-card">
        <div className="equalizer-presets-heading">
          {language === 'en' ? 'SOUND PRESETS' : 'PERFILES DE SONIDO'}
        </div>
        <div className="equalizer-presets">
          {Object.keys(presets).map(name => (
            <button
              key={name}
              type="button"
              className={preset === name ? 'active' : ''}
              onClick={() => handlePreset(name)}
              aria-pressed={preset === name}
            >
              {t(language, `presets.${name}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="equalizer-sliders">
        {bands.map((band, index) => (
          <div
            className="equalizer-band"
            key={frequencies[index]}
          >
            <span className="equalizer-value">
              {values[index] > 0 ? '+' : ''}
              {values[index]} dB
            </span>

            <input
              type="range"
              min="-12"
              max="12"
              step="1"
              value={values[index]}
              onChange={event =>
                handleBandChange(index, event.target.value)
              }
              aria-label={band.label}
              title={`${band.label}: ${band.description}`}
              style={{
                '--slider-progress': `${((values[index] + 12) / 24) * 100}%`
              }}
            />

            <div className="equalizer-band-info">
              <strong>{band.label}</strong>
              <span>{frequencies[index]}</span>
              <p>{band.description}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default Equalizer;

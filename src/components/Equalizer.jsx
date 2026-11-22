
import { RotateCcw, SlidersHorizontal } from 'lucide-react';
import '../styles/equalizer.css';

const bands = [
  {
    label: 'Graves',
    frequency: '60 Hz',
    description: 'Profundidad y golpes del bombo'
  },
  {
    label: 'Bajos medios',
    frequency: '250 Hz',
    description: 'Cuerpo y calidez de la música'
  },
  {
    label: 'Medios',
    frequency: '1 kHz',
    description: 'Voces e instrumentos principales'
  },
  {
    label: 'Altos medios',
    frequency: '4 kHz',
    description: 'Claridad y definición'
  },
  {
    label: 'Agudos',
    frequency: '12 kHz',
    description: 'Brillo y detalles del sonido'
  }
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
  onPresetChange = () => {}
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

  return (
    <section
      className="equalizer-panel"
      data-preset={preset}
    >
      <div className="equalizer-header">

        <div className="equalizer-title">
          <SlidersHorizontal size={19} />
          <h2>Equalizer</h2>
        </div>

        <button
          className="equalizer-reset"
          onClick={resetEqualizer}
          title="Reset equalizer"
        >
          <RotateCcw size={15} />
          Reset
        </button>

      </div>

      <div className="equalizer-presets">

        {Object.keys(presets).map(name => (
          <button
            key={name}
            className={preset === name ? 'active' : ''}
            onClick={() => handlePreset(name)}
          >
            {name}
          </button>
        ))}

      </div>

      <div className="equalizer-sliders">

        {bands.map((band, index) => (
          <div
            className="equalizer-band"
            key={band.frequency}
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
              <span>{band.frequency}</span>
              <p>{band.description}</p>
            </div>

          </div>
        ))}

      </div>
    </section>
  );
}

export default Equalizer;

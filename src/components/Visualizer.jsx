
import { useEffect, useRef, useState } from 'react';
import '../styles/visualizer.css';
import { t } from './i18n/translations';

const MODES = {
  classic: 'SPECTRUM',
  modern: 'PULSE',
  waveform: 'WAVEFORM',
  mirror: 'NEON MIRROR',
  nebula: 'NEBULA',
  aurora: 'AURORA',
  infinity: 'INFINITY STONES'
};

const BASE_CYAN = '#35e7f2';

const PRESET_COLORS = {
  Normal: {
    low: '#6575ff',
    mid: '#35e7f2',
    high: '#995cff',
    accent: '#ed35d1'
  },
  Pop: {
    low: '#ff70c8',
    mid: '#ed35d1',
    high: '#ffc0ed',
    accent: '#ff4fa3'
  },
  Rock: {
    low: '#e63946',
    mid: '#ff623e',
    high: '#ffd166',
    accent: '#ff8a32'
  },
  Bass: {
    low: '#263bba',
    mid: '#6554ff',
    high: '#35b9f2',
    accent: '#995cff'
  },
  Electronic: {
    low: '#3155ff',
    mid: '#00e5ff',
    high: '#a855f7',
    accent: '#526bff'
  },
  Acoustic: {
    low: '#c87938',
    mid: '#e8b76a',
    high: '#8bc9a0',
    accent: '#f2d18b'
  },
  Jazz: {
    low: '#6535b8',
    mid: '#a45cff',
    high: '#ed35d1',
    accent: '#ff9acb'
  },
  Classical: {
    low: '#557acb',
    mid: '#b6d9f5',
    high: '#c6b5f5',
    accent: '#e6d6a5'
  },
  Vocal: {
    low: '#ff719e',
    mid: '#ff9bc8',
    high: '#ed35d1',
    accent: '#35e7f2'
  },
  Night: {
    low: '#18265e',
    mid: '#354b9c',
    high: '#7954c9',
    accent: '#a45cff'
  },
  Personalizado: {
    low: '#995cff',
    mid: '#35e7f2',
    high: '#ed35d1',
    accent: '#ff8acb'
  }
};

const INFINITY_COLORS = [
  '#a855f7',
  '#318bff',
  '#ff3d4f',
  '#ff9d35',
  '#39e879',
  '#ffe34d'
];

function clamp(value, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function getRGB(color) {
  if (color.startsWith('rgb')) {
    return color.match(/[\d.]+/g).map(Number);
  }

  let hex = color.replace('#', '');

  if (hex.length === 3) {
    hex = hex.split('').map(char => char + char).join('');
  }

  return [
    parseInt(hex.substring(0, 2), 16),
    parseInt(hex.substring(2, 4), 16),
    parseInt(hex.substring(4, 6), 16)
  ];
}

function mixColors(colorA, colorB, amount) {
  const a = getRGB(colorA);
  const b = getRGB(colorB);
  const progress = clamp(amount);

  const result = a.map((value, index) =>
    Math.round(value + (b[index] - value) * progress)
  );

  return `rgb(${result.join(',')})`;
}

function Visualizer({
  analyser,
  preset = 'Normal',
  equalizerValues = [0, 0, 0, 0, 0],
  mode: controlledMode,
  onModeChange,
  language = 'es'
}) {
  const canvasRef = useRef(null);
  const startTimeRef = useRef(null);
  const previousAnalyserRef = useRef(null);
  const equalizerValuesRef = useRef(equalizerValues);

  equalizerValuesRef.current = equalizerValues;

  const [internalMode, setInternalMode] = useState('classic');

  const mode = controlledMode ?? internalMode;
  const setMode = onModeChange ?? setInternalMode;

  const tr = (key, spanish, english) => {
    const translated = t(language, key);

    if (!translated || translated === key) {
      return language === 'en' ? english : spanish;
    }

    return translated;
  };

  const modeLabels = {
    classic: tr('mode_classic', 'ESPECTRO', 'SPECTRUM'),
    modern: tr('mode_modern', 'PULSO', 'PULSE'),
    waveform: tr('mode_waveform', 'ONDA', 'WAVEFORM'),
    mirror: tr('mode_mirror', 'ESPEJO NEÓN', 'NEON MIRROR'),
    nebula: tr('mode_nebula', 'NEBULOSA', 'NEBULA'),
    aurora: tr('mode_aurora', 'AURORA', 'AURORA'),
    infinity: tr('mode_infinity', 'GEMAS DEL INFINITO', 'INFINITY STONES')
  };

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) return;

    if (previousAnalyserRef.current !== analyser) {
      startTimeRef.current = null;
      previousAnalyserRef.current = analyser;
    }

    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    let animationId;
    let lastFrameTime = 0;

    const frequencyData = analyser
      ? new Uint8Array(analyser.frequencyBinCount)
      : new Uint8Array(1024);

    const timeData = analyser
      ? new Uint8Array(analyser.fftSize)
      : new Uint8Array(1024);

    const waveformSmoothData = new Float32Array(timeData.length).fill(128);

    const energy = {
      low: 0,
      mid: 0,
      high: 0
    };

    const particles = Array.from({ length: 3200 }, () => {
      const position = Math.random();
      const centerX = (position - 0.5) * 2;

      const curve =
        Math.sin(position * Math.PI * 2.4) * 0.25 +
        Math.cos(position * Math.PI * 1.3) * 0.12;

      const spread = 0.08 + Math.random() * 0.22;

      return {
        x: centerX + (Math.random() - 0.5) * 0.18,
        y: curve + (Math.random() - 0.5) * spread,
        z: Math.random(),
        size: 0.45 + Math.random() * 1.7,
        speed: 0.35 + Math.random() * 1.1,
        phase: Math.random() * Math.PI * 2,
        depth: 0.4 + Math.random() * 1.2,
        color: Math.random()
      };
    });

    const auroraStrands = Array.from({ length: 56 }, (_, index) => ({
      x: (index + Math.random()) / 56,
      width: index % 3 === 0
        ? 4 + Math.random() * 9
        : 9 + Math.random() * 22,
      length: 0.48 + Math.random() * 0.43,
      top: 0.035 + Math.random() * 0.20,
      speed: 0.12 + Math.random() * 0.25,
      phase: Math.random() * Math.PI * 2,
      sway: 12 + Math.random() * 42,
      color: Math.random()
    }));

    const infinityParticles = Array.from(
      { length: 6 },
      () => Array.from({ length: 18 }, () => ({
        angle: Math.random() * Math.PI * 2,
        distance: 0.75 + Math.random() * 0.65,
        speed: 0.12 + Math.random() * 0.35,
        size: 0.6 + Math.random() * 1.5,
        phase: Math.random() * Math.PI * 2,
        opacity: 0.2 + Math.random() * 0.55
      }))
    );

    const infinityEnergy = Array(6).fill(0);

    const getAverage = (data, start, end) => {
      let total = 0;
      let count = 0;

      for (let i = start; i < end; i++) {
        total += data[i];
        count++;
      }

      return count ? total / count / 255 : 0;
    };

    const getDynamicColors = (data, elapsed) => {
      const low = getAverage(data, 1, Math.floor(data.length * 0.08));
      const mid = getAverage(data, Math.floor(data.length * 0.08), Math.floor(data.length * 0.35));
      const high = getAverage(data, Math.floor(data.length * 0.35), Math.floor(data.length * 0.85));

      energy.low += (low - energy.low) * 0.035;
      energy.mid += (mid - energy.mid) * 0.035;
      energy.high += (high - energy.high) * 0.035;

      const palette = PRESET_COLORS[preset] || PRESET_COLORS.Normal;

      const cycle = (Math.sin(elapsed * 0.00013) + 1) / 2;
      const colorProgress = clamp((elapsed - 4000) / 8000);

      let lowTarget;
      let midTarget;
      let highTarget;
      let accentTarget;

      if (preset === 'Normal') {
        lowTarget = mixColors('#6575ff', '#35a9f2', clamp(cycle * 0.35 + energy.low * 0.3, 0, 0.7));
        midTarget = mixColors('#35e7f2', '#6575ff', clamp(cycle * 0.2 + energy.mid * 0.3, 0, 0.65));
        highTarget = mixColors('#995cff', '#ed35d1', clamp(cycle * 0.35 + energy.high * 0.3, 0, 0.7));
        accentTarget = mixColors('#ed35d1', '#ff8acb', clamp(cycle * 0.3 + energy.high * 0.2, 0, 0.7));

        return {
          low: mixColors(BASE_CYAN, lowTarget, colorProgress),
          mid: mixColors(BASE_CYAN, midTarget, colorProgress),
          high: mixColors(BASE_CYAN, highTarget, colorProgress),
          magenta: mixColors(BASE_CYAN, accentTarget, colorProgress)
        };
      }

      if (preset === 'Personalizado') {
        lowTarget = mixColors('#995cff', '#35a9f2', clamp(cycle * 0.4 + energy.low * 0.3, 0, 0.75));
        midTarget = mixColors('#35e7f2', '#6575ff', clamp(cycle * 0.3 + energy.mid * 0.3, 0, 0.7));
        highTarget = mixColors('#ed35d1', '#ff8acb', clamp(cycle * 0.35 + energy.high * 0.3, 0, 0.7));
        accentTarget = mixColors('#ff8acb', '#35a9f2', clamp(cycle * 0.35 + energy.low * 0.2, 0, 0.7));

        return {
          low: mixColors(BASE_CYAN, lowTarget, colorProgress),
          mid: mixColors(BASE_CYAN, midTarget, colorProgress),
          high: mixColors(BASE_CYAN, highTarget, colorProgress),
          magenta: mixColors(BASE_CYAN, accentTarget, colorProgress)
        };
      }

      const independentPresets = [
        'Electronic',
        'Acoustic',
        'Jazz',
        'Classical',
        'Vocal',
        'Night'
      ];

      if (independentPresets.includes(preset)) {
        lowTarget = mixColors(palette.low, palette.mid, clamp(cycle * 0.18 + energy.low * 0.42, 0, 0.58));
        midTarget = mixColors(palette.mid, palette.high, clamp(cycle * 0.16 + energy.mid * 0.42, 0, 0.58));
        highTarget = mixColors(palette.high, palette.accent, clamp(cycle * 0.22 + energy.high * 0.42, 0, 0.62));
        accentTarget = mixColors(palette.accent, palette.low, clamp(cycle * 0.3 + energy.low * 0.22, 0, 0.58));

        return {
          low: lowTarget,
          mid: midTarget,
          high: highTarget,
          magenta: accentTarget
        };
      }

      lowTarget = mixColors(palette.low, palette.accent, clamp(cycle * 0.22 + energy.low * 0.38, 0, 0.65));
      midTarget = mixColors(palette.mid, palette.high, clamp(cycle * 0.2 + energy.mid * 0.4, 0, 0.65));
      highTarget = mixColors(palette.high, palette.accent, clamp(cycle * 0.25 + energy.high * 0.4, 0, 0.7));
      accentTarget = mixColors(palette.accent, palette.low, clamp(cycle * 0.4 + energy.low * 0.2, 0, 0.7));

      return {
        low: mixColors(BASE_CYAN, lowTarget, colorProgress),
        mid: mixColors(BASE_CYAN, midTarget, colorProgress),
        high: mixColors(BASE_CYAN, highTarget, colorProgress),
        magenta: mixColors(BASE_CYAN, accentTarget, colorProgress)
      };
    };

    const draw = (timestamp) => {
      const frameInterval =
        mode === 'aurora' || mode === 'nebula' || mode === 'infinity'
          ? 1000 / 30
          : 0;

      if (frameInterval && timestamp - lastFrameTime < frameInterval) {
        animationId = requestAnimationFrame(draw);
        return;
      }

      lastFrameTime = timestamp;

      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp;
      }

      const elapsed = timestamp - startTimeRef.current;
      const rect = canvas.getBoundingClientRect();

      const width = rect.width;
      const height = rect.height;

      if (!width || !height) {
        animationId = requestAnimationFrame(draw);
        return;
      }

      const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.25);
      const canvasWidth = Math.round(width * pixelRatio);
      const canvasHeight = Math.round(height * pixelRatio);

      if (canvas.width !== canvasWidth || canvas.height !== canvasHeight) {
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
      }

      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      ctx.clearRect(0, 0, width, height);

      if (analyser) {
        analyser.getByteFrequencyData(frequencyData);
        analyser.getByteTimeDomainData(timeData);
      } else {
        frequencyData.fill(0);
        timeData.fill(128);
      }

      const colors = getDynamicColors(frequencyData, elapsed);

      switch (mode) {
        case 'classic':
          drawClassic(ctx, width, height, frequencyData, colors);
          break;
        case 'modern':
          drawModern(ctx, width, height, frequencyData, colors);
          break;
        case 'waveform':
          drawWaveform(ctx, width, height, timeData, colors, waveformSmoothData);
          break;
        case 'mirror':
          drawMirror(ctx, width, height, frequencyData, colors);
          break;
        case 'nebula':
          drawNebula(ctx, width, height, frequencyData, colors, energy, particles, elapsed);
          break;
        case 'aurora':
          drawAurora(ctx, width, height, colors, energy, elapsed, auroraStrands);
          break;
        case 'infinity':
          drawInfinityStones(
            ctx,
            width,
            height,
            frequencyData,
            elapsed,
            infinityParticles,
            infinityEnergy,
            getAverage,
            equalizerValuesRef.current
          );
          break;
        default:
          break;
      }

      animationId = requestAnimationFrame(draw);
    };

    animationId = requestAnimationFrame(draw);

    return () => cancelAnimationFrame(animationId);
  }, [analyser, mode, preset]);

  return (
    <div className="visualizer-stage">
      <div className="visualizer-toolbar">
        <span className="visualizer-label">
          {tr('visualizerTitle', 'ECHOPULSE VISUALIZADOR', 'ECHOPULSE VISUALIZER')}
        </span>

        <div className="visualizer-modes">
          <button className={mode === 'classic' ? 'selected' : ''} onClick={() => setMode('classic')}>
            {tr('spectrum', 'Espectro', 'Spectrum')}
          </button>

          <button className={mode === 'modern' ? 'selected' : ''} onClick={() => setMode('modern')}>
            {tr('pulse', 'Pulso', 'Pulse')}
          </button>

          <button className={mode === 'waveform' ? 'selected' : ''} onClick={() => setMode('waveform')}>
            {tr('waveform', 'Forma de onda', 'Waveform')}
          </button>

          <button className={mode === 'mirror' ? 'selected' : ''} onClick={() => setMode('mirror')}>
            {tr('neonMirror', 'Espejo neón', 'Neon Mirror')}
          </button>

          <button className={mode === 'nebula' ? 'selected' : ''} onClick={() => setMode('nebula')}>
            {tr('nebula', 'Nebulosa', 'Nebula')}
          </button>

          <button className={mode === 'aurora' ? 'selected' : ''} onClick={() => setMode('aurora')}>
            {tr('aurora', 'Aurora', 'Aurora')}
          </button>

          <button className={mode === 'infinity' ? 'selected' : ''} onClick={() => setMode('infinity')}>
            {tr('infinityStones', 'Gemas del infinito', 'Infinity Stones')}
          </button>
        </div>
      </div>

      <canvas ref={canvasRef} />

      <div className="visualizer-footer">
        <span>
          {analyser
            ? tr('audioAnalyzerActive', 'ANALIZADOR DE AUDIO ACTIVO', 'AUDIO ANALYZER ACTIVE')
            : tr('waitingForAudio', 'ESPERANDO AUDIO', 'WAITING FOR AUDIO')}
        </span>

        <span>{modeLabels[mode] || MODES[mode]}</span>
      </div>
    </div>
  );
}

function drawClassic(ctx, width, height, data, colors) {
  const bars = 72;
  const barWidth = width / bars;
  const gap = 3;

  const gradient = ctx.createLinearGradient(0, height, 0, 0);
  gradient.addColorStop(0, colors.low);
  gradient.addColorStop(0.5, colors.mid);
  gradient.addColorStop(1, colors.high);

  for (let i = 0; i < bars; i++) {
    const dataIndex = Math.floor((i / bars) * data.length * 0.65);
    const value = data[dataIndex] / 255;
    const barHeight = Math.max(3, value * height * 0.65);

    const x = i * barWidth;
    const y = height - barHeight - 25;

    ctx.fillStyle = gradient;
    ctx.fillRect(x + gap / 2, y, Math.max(1, barWidth - gap), barHeight);

    ctx.globalAlpha = 0.12;
    ctx.fillRect(
      x + gap / 2,
      height - 23,
      Math.max(1, barWidth - gap),
      Math.min(barHeight * 0.35, 35)
    );
    ctx.globalAlpha = 1;
  }
}

function drawModern(ctx, width, height, data, colors) {
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) * 0.20;
  const bars = 100;

  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, colors.low);
  gradient.addColorStop(0.5, colors.mid);
  gradient.addColorStop(1, colors.magenta);

  ctx.save();
  ctx.translate(centerX, centerY);

  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.strokeStyle = colors.mid;
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.globalAlpha = 1;

  for (let i = 0; i < bars; i++) {
    const angle = (i / bars) * Math.PI * 2;
    const dataIndex = Math.floor((i / bars) * data.length * 0.7);
    const value = data[dataIndex] / 255;
    const barLength = Math.max(3, value * radius * 0.85);

    ctx.beginPath();
    ctx.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
    ctx.lineTo(
      Math.cos(angle) * (radius + barLength),
      Math.sin(angle) * (radius + barLength)
    );

    ctx.strokeStyle = gradient;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.shadowBlur = 10;
    ctx.shadowColor = colors.mid;
    ctx.stroke();
  }

  ctx.shadowBlur = 0;

  const centerGradient = ctx.createRadialGradient(0, 0, 2, 0, 0, radius * 0.85);
  centerGradient.addColorStop(0, colors.mid);
  centerGradient.addColorStop(1, 'rgba(0,0,0,0)');

  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.85, 0, Math.PI * 2);
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = centerGradient;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawWaveform(ctx, width, height, data, colors, smoothData) {
  const centerY = height / 2;
  const gradient = ctx.createLinearGradient(0, 0, width, 0);

  gradient.addColorStop(0, colors.low);
  gradient.addColorStop(0.5, colors.mid);
  gradient.addColorStop(1, colors.magenta);

  const points = [];
  const amplitudeScale = height * 0.25;
  const smoothing = 0.18;

  for (let i = 0; i < data.length; i++) {
    const target = data[i];
    smoothData[i] += (target - smoothData[i]) * smoothing;

    const x = (i / (data.length - 1)) * width;
    const amplitude = (smoothData[i] - 128) / 128;

    points.push({
      x,
      y: centerY + amplitude * amplitudeScale
    });
  }

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);

  for (let i = 1; i < points.length - 1; i++) {
    const current = points[i];
    const next = points[i + 1];

    const middleX = (current.x + next.x) / 2;
    const middleY = (current.y + next.y) / 2;

    ctx.quadraticCurveTo(current.x, current.y, middleX, middleY);
  }

  const last = points[points.length - 1];
  ctx.lineTo(last.x, last.y);

  ctx.strokeStyle = gradient;
  ctx.lineWidth = 2.2;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.shadowBlur = 9;
  ctx.shadowColor = colors.mid;
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.beginPath();
  ctx.moveTo(0, centerY);
  ctx.lineTo(width, centerY);
  ctx.strokeStyle = colors.low;
  ctx.globalAlpha = 0.12;
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.restore();
}

function drawNebula(ctx, width, height, data, colors, energy, particles, elapsed) {
  const centerX = width / 2;
  const centerY = height / 2;
  const time = elapsed * 0.001;

  const spreadX = width * (0.43 + energy.low * 0.06);
  const spreadY = height * (0.43 + energy.low * 0.07);

  const groups = [
    { color: colors.mid, path: new Path2D() },
    { color: colors.magenta, path: new Path2D() },
    { color: colors.high, path: new Path2D() }
  ];

  const highlights = new Path2D();

  for (let side = 0; side < 2; side++) {
    const direction = side === 0 ? 1 : -1;

    particles.forEach((particle, index) => {
      const frequencyIndex = Math.floor((index / particles.length) * data.length * 0.55);
      const audioValue = data[frequencyIndex] / 255;

      const phase = time * particle.speed + particle.phase + side * 1.35;

      const flowX =
        Math.sin(phase * 0.7 + particle.y * 3) * 0.045 +
        Math.cos(phase * 0.35 + particle.z * 5) * 0.025;

      const flowY =
        Math.cos(phase * 0.55 + particle.x * 3) * 0.055 +
        Math.sin(phase * 0.4 + particle.z * 4) * 0.025;

      const mirroredX = particle.x * direction;

      const x = centerX + (mirroredX + flowX * direction) * spreadX;
      const y = centerY + (particle.y + flowY + side * 0.025) * spreadY;

      const pulse = 0.8 + Math.sin(time * 1.2 + particle.phase + side) * 0.18;

      const size = particle.size * pulse * (0.85 + audioValue * 0.8) * particle.depth;

      const groupIndex =
        particle.color < 0.34 ? 0 :
        particle.color < 0.68 ? 1 : 2;

      groups[groupIndex].path.moveTo(x + size, y);
      groups[groupIndex].path.arc(x, y, size, 0, Math.PI * 2);

      if (particle.depth > 1.25 && audioValue > 0.12) {
        highlights.moveTo(x + size * 0.35, y);
        highlights.arc(x, y, size * 0.35, 0, Math.PI * 2);
      }
    });
  }

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  groups.forEach((group, index) => {
    ctx.fillStyle = group.color;
    ctx.globalAlpha = index === 0 ? 0.38 : 0.29;
    ctx.fill(group.path);
  });

  ctx.fillStyle = '#ffffff';
  ctx.globalAlpha = 0.25 + energy.high * 0.12;
  ctx.fill(highlights);
  ctx.restore();
}

function drawAurora(ctx, width, height, colors, energy, elapsed, strands) {
  const time = elapsed * 0.00035;
  const palette = [colors.low, colors.mid, colors.high, colors.magenta];

  ctx.save();
  ctx.globalCompositeOperation = 'screen';

  const ambient = ctx.createLinearGradient(0, 0, width, height);
  ambient.addColorStop(0, 'rgba(0,0,0,0)');
  ambient.addColorStop(0.5, `rgba(70,100,190,${0.035 + energy.mid * 0.025})`);
  ambient.addColorStop(1, 'rgba(0,0,0,0)');

  ctx.fillStyle = ambient;
  ctx.fillRect(0, 0, width, height);

  strands.forEach(strand => {
    const color = palette[Math.floor(strand.color * palette.length)];
    const rgb = getRGB(color);
    const phase = time * strand.speed + strand.phase;

    const top = height * strand.top;
    const length = height * strand.length;
    const bottom = Math.min(height * 1.05, top + length);

    const centerX =
      strand.x * width +
      Math.sin(phase) * strand.sway +
      Math.sin(phase * 0.45) * strand.sway * 0.35;

    const points = [];
    const segments = 12;

    for (let i = 0; i <= segments; i++) {
      const progress = i / segments;
      const y = top + (bottom - top) * progress;

      const flowing =
        Math.sin(phase + progress * 3.2) * strand.sway * 0.42 +
        Math.sin(phase * 0.7 + progress * 6) * strand.sway * 0.22;

      const audioFold = Math.sin(progress * Math.PI) * energy.mid * 18;
      const x = centerX + flowing + audioFold;

      const taper = Math.pow(Math.sin(progress * Math.PI), 0.65);

      const widthVariation =
        strand.width *
        (0.45 + Math.sin(progress * 4 + phase) * 0.18) *
        (0.2 + taper * 0.8);

      points.push({
        x,
        y,
        left: x - widthVariation,
        right: x + widthVariation
      });
    }

    const gradient = ctx.createLinearGradient(
      centerX - strand.width * 1.7,
      0,
      centerX + strand.width * 1.7,
      0
    );

    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(0.2, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.07)`);
    gradient.addColorStop(0.5, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.28)`);
    gradient.addColorStop(0.8, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.07)`);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');

    ctx.beginPath();
    ctx.moveTo(points[0].left, points[0].y);

    for (let i = 1; i < points.length; i++) {
      const previous = points[i - 1];
      const current = points[i];

      const middleX = (previous.left + current.left) / 2;
      const middleY = (previous.y + current.y) / 2;

      ctx.quadraticCurveTo(previous.left, previous.y, middleX, middleY);
    }

    ctx.lineTo(points[points.length - 1].right, points[points.length - 1].y);

    for (let i = points.length - 1; i >= 0; i--) {
      ctx.lineTo(points[i].right, points[i].y);
    }

    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.globalAlpha = 0.95 + energy.mid * 0.05;
    ctx.fill();

    const coreGradient = ctx.createLinearGradient(
      centerX - strand.width * 0.45,
      0,
      centerX + strand.width * 0.45,
      0
    );

    coreGradient.addColorStop(0, 'rgba(255,255,255,0)');
    coreGradient.addColorStop(0.5, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.22)`);
    coreGradient.addColorStop(1, 'rgba(255,255,255,0)');

    ctx.fillStyle = coreGradient;
    ctx.globalAlpha = 0.48;
    ctx.fill();
  });

  ctx.restore();
}

function drawInfinityStones(
  ctx,
  width,
  height,
  data,
  elapsed,
  particles,
  stoneEnergy,
  getAverage,
  equalizerValues
) {
  const time = elapsed * 0.001;

  const stoneWidth = Math.min(
    72,
    Math.max(32, width * 0.075),
    width / 10
  );

  const stoneHeight = stoneWidth * 1.38;
  const gap = stoneWidth * 0.48;
  const totalWidth = stoneWidth * 6 + gap * 5;
  const startX = (width - totalWidth) / 2 + stoneWidth / 2;
  const centerY = height / 2;

  const bandRanges = [
    [0, 0.08],
    [0.08, 0.18],
    [0.18, 0.32],
    [0.32, 0.48],
    [0.48, 0.66],
    [0.66, 0.85]
  ];

  const eq = equalizerValues || [0, 0, 0, 0, 0];

  const eqInfluence = [
    Number(eq[0] || 0),
    Number(eq[1] || 0),
    (Number(eq[2] || 0) + Number(eq[3] || 0)) / 2,
    Number(eq[3] || 0),
    Number(eq[4] || 0),
    Number(eq[4] || 0)
  ];

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  const ambient = ctx.createRadialGradient(
    width / 2,
    centerY,
    5,
    width / 2,
    centerY,
    width * 0.48
  );

  ambient.addColorStop(0, 'rgba(80,75,160,0.08)');
  ambient.addColorStop(1, 'rgba(0,0,0,0)');

  ctx.fillStyle = ambient;
  ctx.fillRect(0, 0, width, height);

  INFINITY_COLORS.forEach((color, index) => {
    const x = startX + index * (stoneWidth + gap);
    const range = bandRanges[index];

    const start = Math.floor(data.length * range[0]);
    const end = Math.max(start + 1, Math.floor(data.length * range[1]));

    const audio = getAverage(data, start, end);
    const eqGain = eqInfluence[index];

    const adjustedAudio = clamp(
      audio * (1 + eqGain * 0.025) + eqGain * 0.012
    );

    stoneEnergy[index] += (adjustedAudio - stoneEnergy[index]) * 0.12;

    const sound = stoneEnergy[index];
    const breathing = Math.sin(time * 1.15 + index * 0.8) * 0.045;
    const pulse = 1 + breathing + sound * 0.18;

    const currentWidth = stoneWidth * pulse;
    const currentHeight = stoneHeight * pulse;
    const glow = 0.75 + sound * 0.65;
    const rgb = getRGB(color);
    const auraRadius = currentWidth * (1.5 + sound * 0.45);

    const aura = ctx.createRadialGradient(
      x,
      centerY,
      currentWidth * 0.08,
      x,
      centerY,
      auraRadius
    );

    aura.addColorStop(0, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${0.28 * glow})`);
    aura.addColorStop(0.45, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${0.13 * glow})`);
    aura.addColorStop(1, 'rgba(0,0,0,0)');

    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.ellipse(x, centerY, auraRadius, auraRadius * 1.2, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(x, centerY);
    ctx.scale(currentWidth / 2, currentHeight / 2);

    const coreGradient = ctx.createRadialGradient(-0.18, -0.24, 0.04, 0, 0, 1);

    coreGradient.addColorStop(0, `rgba(255,255,255,${0.95 + sound * 0.05})`);
    coreGradient.addColorStop(0.16, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.98)`);
    coreGradient.addColorStop(0.52, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.78)`);
    coreGradient.addColorStop(0.82, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.38)`);
    coreGradient.addColorStop(1, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.04)`);

    ctx.beginPath();
    ctx.ellipse(0, 0, 0.88, 0.92, 0, 0, Math.PI * 2);
    ctx.fillStyle = coreGradient;
    ctx.shadowBlur = 28 + sound * 30;
    ctx.shadowColor = color;
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.save();
    ctx.beginPath();
    ctx.ellipse(0, 0, 0.87, 0.91, 0, 0, Math.PI * 2);
    ctx.clip();

    for (let wave = 0; wave < 3; wave++) {
      const phase = time * (0.75 + wave * 0.2) + index * 0.8 + wave * 2.1;

      ctx.beginPath();

      for (let point = 0; point <= 24; point++) {
        const progress = point / 24;
        const px = -1 + progress * 2;

        const py =
          Math.sin(px * 3.8 + phase) * 0.17 +
          Math.cos(px * 6.2 - phase * 0.7) * 0.07 +
          (wave - 1) * 0.19;

        if (point === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }

      ctx.strokeStyle = wave === 1
        ? 'rgba(255,255,255,0.48)'
        : `rgba(255,255,255,${0.16 + sound * 0.12})`;

      ctx.lineWidth = wave === 1 ? 0.035 : 0.022;
      ctx.stroke();
    }

    for (let swirl = 0; swirl < 2; swirl++) {
      const rotation = time * (swirl === 0 ? 0.55 : -0.42) + index * 0.65;

      ctx.beginPath();

      for (let point = 0; point <= 36; point++) {
        const progress = point / 36;
        const angle = progress * Math.PI * 2 + rotation;
        const radius = 0.12 + progress * 0.62;

        const px = Math.cos(angle) * radius * 0.75;
        const py = Math.sin(angle) * radius * 0.82;

        if (point === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }

      ctx.strokeStyle = `rgba(255,255,255,${0.14 + sound * 0.13})`;
      ctx.lineWidth = 0.025;
      ctx.stroke();
    }

    ctx.restore();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.ellipse(
      x,
      centerY,
      currentWidth * 0.48,
      currentHeight * 0.48,
      0,
      0,
      Math.PI * 2
    );

    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.3 + sound * 0.3;
    ctx.lineWidth = 1.2;
    ctx.shadowBlur = 14 + sound * 12;
    ctx.shadowColor = color;
    ctx.stroke();
    ctx.restore();

    particles[index].forEach(particle => {
      const angle = particle.angle + time * particle.speed;

      const distance =
        particle.distance +
        Math.sin(time * 1.3 + particle.phase) * 0.08 +
        sound * 0.16;

      const particleX = x + Math.cos(angle) * currentWidth * distance * 0.65;
      const particleY = centerY + Math.sin(angle) * currentHeight * distance * 0.65;
      const particleSize = particle.size * (0.8 + sound * 0.8);

      ctx.beginPath();
      ctx.arc(particleX, particleY, particleSize, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = particle.opacity * (0.65 + sound * 0.5);
      ctx.fill();
    });

    ctx.globalAlpha = 1;

    const sparkle = 0.5 + Math.sin(time * 5 + index) * 0.5;

    ctx.beginPath();
    ctx.arc(
      x,
      centerY - currentHeight * 0.58,
      1.2 + sparkle * 1.8 + sound * 2,
      0,
      Math.PI * 2
    );

    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.25 + sparkle * 0.25 + sound * 0.5;
    ctx.fill();
    ctx.globalAlpha = 1;
  });

  ctx.restore();
}

function drawMirror(ctx, width, height, data, colors) {
  const bars = 72;
  const barWidth = width / bars;
  const gap = 3;
  const centerY = height / 2;
  const maxHeight = height * 0.38;

  const neon = {
    low: mixColors(colors.low, '#00eaff', 0.18),
    mid: mixColors(colors.mid, '#00f5ff', 0.12),
    high: mixColors(colors.high, '#b84dff', 0.18),
    magenta: mixColors(colors.magenta, '#ff20d9', 0.14)
  };

  const gradient = ctx.createLinearGradient(
    0,
    centerY - maxHeight,
    0,
    centerY + maxHeight
  );

  gradient.addColorStop(0, neon.magenta);
  gradient.addColorStop(0.28, neon.high);
  gradient.addColorStop(0.52, neon.mid);
  gradient.addColorStop(1, neon.low);

  for (let i = 0; i < bars; i++) {
    const dataIndex = Math.floor((i / bars) * data.length * 0.65);
    const value = data[dataIndex] / 255;
    const barHeight = Math.max(3, value * maxHeight);

    const x = i * barWidth + gap / 2;
    const actualWidth = Math.max(1, barWidth - gap);

    ctx.fillStyle = gradient;
    ctx.fillRect(x, centerY - barHeight, actualWidth, barHeight);
    ctx.fillRect(x, centerY, actualWidth, barHeight);

    if (value > 0.55) {
      ctx.fillStyle = neon.magenta;
      ctx.globalAlpha = 0.3;
      ctx.fillRect(x, centerY - barHeight, actualWidth, 2);
      ctx.fillRect(x, centerY + barHeight - 2, actualWidth, 2);
      ctx.globalAlpha = 1;
    }
  }

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, centerY);
  ctx.lineTo(width, centerY);

  ctx.strokeStyle = neon.mid;
  ctx.globalAlpha = 0.85;
  ctx.lineWidth = 1.5;
  ctx.shadowBlur = 12;
  ctx.shadowColor = neon.mid;
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.restore();
}

export default Visualizer;

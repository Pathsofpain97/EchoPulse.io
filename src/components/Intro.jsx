
import { useEffect, useRef } from 'react';
import '../styles/intro.css';

function Intro({ onComplete }) {
  const canvasRef = useRef(null);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    let animationFrame;
    let particles = [];
    let width = window.innerWidth;
    let height = window.innerHeight;
    let startTime = null;
    let completed = false;

    const duration = 3500;

    // Paleta ampliada de EchoPulse.
    const colors = [
      '#35e7f2',
      '#35e7f2',
      '#35a9f2',
      '#00c9d8',
      '#00e5c3',
      '#39e58c',
      '#72e85b',
      '#b5ed62',
      '#6575ff',
      '#536dfe',
      '#995cff',
      '#995cff',
      '#bd5cff',
      '#ed35d1',
      '#ff62b5',
      '#ff8acb',
      '#ff9b70',
      '#ffad42',
      '#ffd166',
      '#fff0a6',
      '#ffffff'
    ];

    const random = (min, max) =>
      Math.random() * (max - min) + min;

    const gaussian = () => {
      const u = Math.max(Math.random(), 0.0001);
      const v = Math.random();

      return Math.sqrt(-2 * Math.log(u)) *
        Math.cos(2 * Math.PI * v);
    };

    const clamp = (value, min, max) =>
      Math.max(min, Math.min(max, value));

    const smoothStep = (edge0, edge1, value) => {
      const t = clamp(
        (value - edge0) / (edge1 - edge0),
        0,
        1
      );

      return t * t * (3 - 2 * t);
    };

    // ========================================
    // CANVAS
    // ========================================

    const resizeCanvas = () => {
      const dpr = Math.min(
        window.devicePixelRatio || 1,
        2
      );

      width = window.innerWidth;
      height = window.innerHeight;

      canvas.width = width * dpr;
      canvas.height = height * dpr;

      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      createParticles();
    };

    // ========================================
    // GENERACIÓN DE LA NEBULOSA
    // ========================================

    const createParticles = () => {
      const amount = Math.min(
        5200,
        Math.max(
          2200,
          Math.floor((width * height) / 190)
        )
      );

      particles = Array.from(
        { length: amount },
        () => {
          const position = random(-0.08, 1.08);

          const mainWave =
            Math.sin(position * Math.PI * 2.2) *
            height * 0.105;

          const secondaryWave =
            Math.sin(position * Math.PI * 5.5) *
            height * 0.035;

          const centerY =
            height * 0.5 +
            mainWave +
            secondaryWave;

          const spread =
            Math.random() < 0.8
              ? height * 0.12
              : height * 0.25;

          const size = random(0.7, 3.1);

          return {
            x:
              position * width +
              gaussian() * width * 0.018,

            y:
              centerY +
              gaussian() * spread,

            size,

            alpha: random(0.2, 0.85),

            color:
              colors[
                Math.floor(random(0, colors.length))
              ],

            speedX: random(-0.2, 0.2),
            speedY: random(-0.18, 0.18),

            phase: random(0, Math.PI * 2),

            spread: random(0.17, 0.44),

            wave: random(4, 18),

            twinkle: random(0.7, 2),

            glow: random(2, 6)
          };
        }
      );
    };

    // ========================================
    // DIBUJO DE PARTÍCULAS
    // ========================================

    const drawParticle = (particle, progress, elapsed) => {
      const center = width / 2;

      const direction =
        particle.x >= center ? 1 : -1;

      // Apertura lateral de la nebulosa.
      const opening = Math.max(
        0,
        Math.min(
          1,
          (progress - 0.52) / 0.40
        )
      );

      const easedOpening =
        opening * opening * (3 - 2 * opening);

      const distance =
        easedOpening *
        width *
        particle.spread;

      const x =
        particle.x +
        direction * distance;

      const organicMotion =
        Math.sin(
          particle.phase + elapsed * 0.0018
        ) * particle.wave;

      const y =
        particle.y +
        organicMotion * (0.4 + easedOpening);

      // Desvanecimiento al final.
      const fadeProgress = Math.max(
        0,
        Math.min(
          1,
          (progress - 0.79) / 0.21
        )
      );

      const fade =
        1 - Math.pow(fadeProgress, 1.35);

      // Brillo orgánico.
      const twinkle =
        0.85 +
        Math.sin(
          elapsed * 0.001 * particle.twinkle +
          particle.phase
        ) * 0.15;

      // Protección visual detrás del nombre.
      // Las partículas siguen presentes, pero con menos intensidad.
      const normalizedX =
        (x - center) / (width * 0.28);

      const normalizedY =
        (y - height * 0.5) / (height * 0.24);

      const centerDistance = Math.sqrt(
        normalizedX * normalizedX +
        normalizedY * normalizedY
      );

      const centerVisibility =
        0.24 +
        0.76 * smoothStep(
          0.65,
          1.35,
          centerDistance
        );

      const alpha =
        particle.alpha *
        fade *
        twinkle *
        centerVisibility;

      if (alpha <= 0.01) return;

      // Partícula principal.
      ctx.globalAlpha = alpha;
      ctx.fillStyle = particle.color;

      ctx.beginPath();

      ctx.arc(
        x,
        y,
        particle.size * (1 - easedOpening * 0.2),
        0,
        Math.PI * 2
      );

      ctx.fill();

      // Halo luminoso.
      if (particle.size > 1.25) {
        ctx.globalAlpha = alpha * 0.12;

        ctx.fillStyle = particle.color;

        ctx.beginPath();

        ctx.arc(
          x,
          y,
          particle.size * particle.glow,
          0,
          Math.PI * 2
        );

        ctx.fill();
      }

      // Rastros durante la apertura.
      if (
        easedOpening > 0.15 &&
        particle.size > 1.5
      ) {
        ctx.globalAlpha = alpha * 0.25;

        ctx.strokeStyle = particle.color;
        ctx.lineWidth = 0.7;

        ctx.beginPath();

        ctx.moveTo(x, y);

        ctx.lineTo(
          x - direction * (8 + easedOpening * 20),
          y - particle.speedY * 12
        );

        ctx.stroke();
      }
    };

    // ========================================
    // ANIMACIÓN PRINCIPAL
    // ========================================

    const animate = (timestamp) => {
      if (startTime === null) {
        startTime = timestamp;
      }

      const elapsed = timestamp - startTime;

      const progress = Math.min(
        elapsed / duration,
        1
      );

      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';

      // Fondo oscuro.
      ctx.fillStyle = '#020309';
      ctx.fillRect(0, 0, width, height);

      // Mezcla luminosa de las partículas.
      ctx.globalCompositeOperation = 'lighter';

      particles.forEach((particle) => {
        particle.x += particle.speedX;
        particle.y += particle.speedY;

        if (particle.y < -15) {
          particle.y = height + 15;
        }

        if (particle.y > height + 15) {
          particle.y = -15;
        }

        drawParticle(
          particle,
          progress,
          elapsed
        );
      });

      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';

      // Finalización.
      if (elapsed >= duration && !completed) {
        completed = true;
        onCompleteRef.current?.();
        return;
      }

      animationFrame =
        requestAnimationFrame(animate);
    };

    // ========================================
    // INICIALIZACIÓN
    // ========================================

    resizeCanvas();

    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    );

    if (reducedMotion.matches) {
      completed = true;
      onCompleteRef.current?.();

      return () => {
        cancelAnimationFrame(animationFrame);
      };
    }

    animationFrame =
      requestAnimationFrame(animate);

    window.addEventListener('resize', resizeCanvas);

    // ========================================
    // LIMPIEZA
    // ========================================

    return () => {
      cancelAnimationFrame(animationFrame);

      window.removeEventListener(
        'resize',
        resizeCanvas
      );
    };
  }, []);

  return (
    <div
      className="intro-screen"
      aria-hidden="true"
    >
      <canvas
        ref={canvasRef}
        className="intro-canvas"
      />

      <div className="intro-brand">
        <h1>EchoPulse</h1>

        <span>MUSIC PLAYER</span>

        <div className="intro-brand-line" />
      </div>
    </div>
  );
}

export default Intro;

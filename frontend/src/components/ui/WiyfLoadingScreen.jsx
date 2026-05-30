import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import loadVideo from '../../assets/load.mp4';

export default function WiyfLoadingScreen() {
  const videoRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // ensure playback rate and start
    video.muted = true;
    video.playsInline = true;
    video.defaultMuted = true;
    video.playbackRate = 1.25;

    const tryPlay = () => video.play().catch(() => {});
    tryPlay();

    rafRef.current = window.requestAnimationFrame(() => {});

    const onCan = () => tryPlay();
    video.addEventListener('canplay', onCan);

    return () => {
      video.removeEventListener('canplay', onCan);
      window.cancelAnimationFrame(rafRef.current);
      if (video) video.pause();
    };
  }, []);

  return (
    <motion.div
      className="fixed inset-0 z-50 overflow-hidden bg-black"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      <video
        ref={videoRef}
        className="h-[100dvh] w-[100dvw] object-cover object-center transform-gpu"
        src={loadVideo}
        autoPlay
        muted
        loop={false}
        playsInline
        preload="auto"
        controls={false}
        disablePictureInPicture
        controlsList="nodownload nofullscreen noremoteplayback"
      />

      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <svg viewBox="0 0 900 420" className="w-full max-w-5xl drop-shadow-[0_14px_0_rgba(0,0,0,0.14)]" role="img" aria-hidden>
          <defs>
            <linearGradient id="pot-fill" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f6b26b" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>
            <linearGradient id="steam-fade" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.02" />
              <stop offset="55%" stopColor="#ffffff" stopOpacity="0.32" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.75" />
            </linearGradient>
          </defs>

          <motion.g
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
          >
            <ellipse cx="450" cy="320" rx="180" ry="34" fill="rgba(0,0,0,0.18)" />
            <rect x="304" y="178" width="292" height="126" rx="30" fill="#2b211d" stroke="#211a16" strokeWidth="10" />
            <rect x="292" y="158" width="316" height="38" rx="19" fill="url(#pot-fill)" stroke="#211a16" strokeWidth="10" />
            <rect x="344" y="138" width="212" height="28" rx="14" fill="#f6b26b" stroke="#211a16" strokeWidth="8" />
            <rect x="240" y="204" width="62" height="20" rx="10" fill="#2b211d" stroke="#211a16" strokeWidth="8" />
            <rect x="598" y="204" width="62" height="20" rx="10" fill="#2b211d" stroke="#211a16" strokeWidth="8" />
            <rect x="338" y="244" width="224" height="34" rx="17" fill="#4a3329" opacity="0.95" />
          </motion.g>

          <motion.g
            animate={{ opacity: [0.75, 1, 0.75] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
          >
            <path d="M 430 112 C 418 94 426 80 440 68 C 456 80 458 96 448 112 C 442 124 430 126 430 112 Z" fill="url(#steam-fade)" />
            <path d="M 470 112 C 460 94 468 78 484 68 C 500 82 500 96 492 112 C 486 124 474 126 470 112 Z" fill="url(#steam-fade)" />
            <path d="M 512 122 C 502 104 510 88 526 78 C 540 92 544 106 534 122 C 528 132 516 134 512 122 Z" fill="url(#steam-fade)" />
          </motion.g>

          <motion.g
            animate={{ y: [0, -16, 0], opacity: [0, 1, 0] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <path d="M 450 118 C 442 98 446 82 454 70 C 466 84 470 100 466 118 C 460 130 452 132 450 118 Z" fill="#ffffff" opacity="0.72" />
          </motion.g>

          <motion.g
            animate={{ x: [0, 0, -12, 0], y: [0, -8, -18, -26], opacity: [0, 1, 1, 0] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: 'easeOut', delay: 0.2 }}
          >
            <ellipse cx="428" cy="140" rx="10" ry="8" fill="#7cfc98" />
            <ellipse cx="432" cy="136" rx="5" ry="9" fill="#52b788" transform="rotate(-18 432 136)" />
          </motion.g>

          <motion.g
            animate={{ x: [0, 0, 10, 0], y: [0, -10, -24, -32], opacity: [0, 1, 1, 0] }}
            transition={{ duration: 3.1, repeat: Infinity, ease: 'easeOut', delay: 0.8 }}
          >
            <circle cx="472" cy="142" r="9" fill="#fb7185" />
            <circle cx="470" cy="138" r="3" fill="#fecdd3" />
          </motion.g>

          <motion.g
            animate={{ x: [0, 0, 14, 0], y: [0, -12, -26, -34], opacity: [0, 1, 1, 0] }}
            transition={{ duration: 2.9, repeat: Infinity, ease: 'easeOut', delay: 1.4 }}
          >
            <rect x="508" y="136" width="16" height="12" rx="4" fill="#fbbf24" transform="rotate(24 516 142)" />
            <rect x="514" y="132" width="6" height="16" rx="3" fill="#f59e0b" transform="rotate(-18 517 140)" />
          </motion.g>

          <motion.g
            animate={{ x: [0, 0, -8, 0], y: [0, -14, -30, -38], opacity: [0, 1, 1, 0] }}
            transition={{ duration: 3.3, repeat: Infinity, ease: 'easeOut', delay: 2.0 }}
          >
            <path d="M 388 146 L 398 126 L 408 146 Z" fill="#f97316" />
            <path d="M 399 142 L 404 130 L 410 142 Z" fill="#fdba74" />
          </motion.g>

          <motion.g
            animate={{ x: [0, 0, 8, 0], y: [0, -11, -24, -32], opacity: [0, 1, 1, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeOut', delay: 2.5 }}
          >
            <circle cx="548" cy="144" r="7" fill="#86efac" />
            <circle cx="550" cy="141" r="3" fill="#dcfce7" />
          </motion.g>
        </svg>
      </div>
    </motion.div>
  );
}
import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import loadVideo from '../../assets/load.mp4';

const waveVariants = {
  low: 'M 0 268 C 120 250 200 286 320 266 C 440 246 560 286 680 264 C 780 248 840 280 900 266 L 900 420 L 0 420 Z',
  mid: 'M 0 246 C 120 224 200 262 320 244 C 440 224 560 264 680 242 C 780 226 840 256 900 244 L 900 420 L 0 420 Z',
  high: 'M 0 220 C 120 198 200 236 320 216 C 440 196 560 236 680 214 C 780 198 840 228 900 216 L 900 420 L 0 420 Z',
};

export default function WiyfLoadingScreen() {
  const videoRef = useRef(null);
  const rafRef = useRef(null);
  const [progress, setProgress] = useState(0);

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

    // update progress from actual playback time for smooth sync
    const tick = () => {
      if (video && video.duration > 0) {
        const p = Math.min(100, Math.round((video.currentTime / video.duration) * 100));
        setProgress(p);
      }
      rafRef.current = window.requestAnimationFrame(tick);
    };
    rafRef.current = window.requestAnimationFrame(tick);

    const onCan = () => tryPlay();
    video.addEventListener('canplay', onCan);

    return () => {
      video.removeEventListener('canplay', onCan);
      window.cancelAnimationFrame(rafRef.current);
      if (video) video.pause();
    };
  }, []);

  // compute svg rect Y for fill based on progress (svg height 420)
  const fillTop = 420 - Math.round((progress / 100) * 260); // 160-420 range

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

      {/* SVG overlay: WIYF outline with liquid fill */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <svg viewBox="0 0 900 420" className="w-full max-w-5xl" role="img" aria-hidden>
          <defs>
            <linearGradient id="wiyf-fill" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fff5b8" />
              <stop offset="48%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#f97316" />
            </linearGradient>
            <mask id="wiyf-mask">
              <rect width="900" height="420" fill="black" />
              <text
                x="450"
                y="218"
                textAnchor="middle"
                dominantBaseline="middle"
                fill="white"
                fontFamily="'Comic Neue', sans-serif"
                fontSize="220"
                fontWeight="700"
                letterSpacing="12"
              >
                WIYF
              </text>
            </mask>
          </defs>

          {/* liquid moving under mask */}
          <g mask="url(#wiyf-mask)">
            <motion.path
              d={waveVariants.low}
              fill="url(#wiyf-fill)"
              animate={{ d: [waveVariants.low, waveVariants.mid, waveVariants.high, waveVariants.mid, waveVariants.low] }}
              transition={{ duration: 4.8, repeat: Infinity, ease: 'easeInOut' }}
            />
            <rect x="0" y={fillTop} width="900" height="420" fill="url(#wiyf-fill)" opacity="0.85" />
            <motion.path
              d="M 0 250 C 130 228 220 272 350 246 C 470 224 560 262 690 240 C 790 228 845 248 900 244"
              fill="none"
              stroke="rgba(255,255,255,0.7)"
              strokeWidth="10"
              strokeLinecap="round"
              strokeLinejoin="round"
              animate={{ x: [0, 10, 0, -10, 0] }}
              transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
            />
          </g>

          {/* outline stroke */}
          <text
            x="450"
            y="218"
            textAnchor="middle"
            dominantBaseline="middle"
            fill="none"
            stroke="#211a16"
            strokeWidth="12"
            paintOrder="stroke"
            strokeLinejoin="round"
            strokeLinecap="round"
            fontFamily="'Comic Neue', sans-serif"
            fontSize="220"
            fontWeight="800"
            letterSpacing="10"
          >
            WIYF
          </text>
        </svg>
      </div>
    </motion.div>
  );
}
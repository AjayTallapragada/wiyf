import { motion } from 'framer-motion';

export default function WiyfLoadingScreen() {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#fff3d6]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Comic Halftone Dot Background Pattern */}
      <div
        className="absolute inset-0 opacity-5 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(#211a16 2.5px, transparent 2.5px)',
          backgroundSize: '24px 24px',
        }}
      />

      <div className="relative flex flex-col items-center justify-center scale-90 sm:scale-100">
        {/* SVG Liquid Fill Loading Text */}
        <svg
          width="600"
          height="220"
          viewBox="0 0 600 220"
          className="drop-shadow-[6px_6px_0px_#211a16] select-none"
        >
          <defs>
            {/* The Text Clip Path */}
            <clipPath id="wiyf-text-clip">
              <text
                x="50%"
                y="55%"
                textAnchor="middle"
                dominantBaseline="middle"
                fontFamily="'Arial Black', Impact, sans-serif"
                fontSize="150"
                fontWeight="900"
              >
                WIYF
              </text>
            </clipPath>
          </defs>

          {/* Background Text (Thick outline behind the liquid) */}
          <text
            x="50%"
            y="55%"
            textAnchor="middle"
            dominantBaseline="middle"
            fontFamily="'Arial Black', Impact, sans-serif"
            fontSize="150"
            fontWeight="900"
            fill="none"
            stroke="#211a16"
            strokeWidth="18"
            strokeLinejoin="miter"
            strokeMiterlimit="3"
            paintOrder="stroke fill"
          />

          {/* Liquid Mask Container */}
          <g clipPath="url(#wiyf-text-clip)">
            {/* Outer background inside the text before liquid fills it */}
            <rect width="600" height="220" fill="#fffaf0" />

            {/* Rising Wavy Liquid Group */}
            <g className="wave-y">
              {/* Horizontal flowing wave path (loops seamlessly every 300px) */}
              <path
                className="wave-x"
                fill="#211a16"
                d="M 0,100 C 75,80 75,120 150,100 C 225,80 225,120 300,100 C 375,80 375,120 450,100 C 525,80 525,120 600,100 C 675,80 675,120 750,100 C 825,80 825,120 900,100 L 900,300 L 0,300 Z"
              />
            </g>
          </g>

          {/* Foreground Text Outline (Thick border over the clipped liquid to look neobrutalist/comic style) */}
          <text
            x="50%"
            y="55%"
            textAnchor="middle"
            dominantBaseline="middle"
            fontFamily="'Arial Black', Impact, sans-serif"
            fontSize="150"
            fontWeight="900"
            fill="none"
            stroke="#211a16"
            strokeWidth="18"
            strokeLinejoin="miter"
            strokeMiterlimit="3"
          />
        </svg>

        {/* Comic banner loader caption */}
        <div className="mt-8 px-6 py-2 border-3 border-ink bg-[#ffbe0b] font-display text-2xl uppercase tracking-wider shadow-sticker rotate-[-2deg] select-none text-ink animate-bounce">
          Sharpening the spatula...
        </div>
      </div>

      {/* Wave animation keyframes */}
      <style>{`
        @keyframes waveHorizontal {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-300px);
          }
        }
        @keyframes waveVertical {
          0% {
            transform: translateY(120px);
          }
          100% {
            transform: translateY(-80px);
          }
        }
        .wave-x {
          animation: waveHorizontal 2.2s linear infinite;
        }
        .wave-y {
          animation: waveVertical 2.2s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
      `}</style>
    </motion.div>
  );
}
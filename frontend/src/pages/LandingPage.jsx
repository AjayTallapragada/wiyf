import { Camera } from 'lucide-react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import AiChef from '../components/ai/AiChef';
import ComicButton from '../components/ui/ComicButton';
import ComicCard from '../components/ui/ComicCard';

const floating = ['tomato', 'egg', 'leaf', 'spoon'];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
};

export default function LandingPage({ setPage }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  });

  const y = useTransform(scrollYProgress, [0, 1], [0, 100]);
  const opacity = useTransform(scrollYProgress, [0, 1], [1, 0.5]);

  return (
    <section ref={ref} className="grid min-h-[calc(100vh-110px)] items-center gap-8 lg:grid-cols-[1.05fr_.95fr] overflow-hidden">
      <motion.div className="space-y-6" variants={containerVariants} initial="hidden" animate="visible">
        <motion.div 
          variants={itemVariants}
          className="inline-flex rounded-full border-3 border-ink bg-paper px-4 py-2 font-hand text-xl shadow-sticker"
        >
          AI kitchen assistant
        </motion.div>
        <motion.h1 
          variants={itemVariants}
          className="max-w-3xl font-display text-5xl leading-none tracking-normal text-tomato sm:text-7xl md:text-8xl"
        >
          What's In Your Fridge?
        </motion.h1>
        <motion.p 
          variants={itemVariants}
          className="max-w-2xl font-hand text-2xl sm:text-3xl leading-tight text-cocoa"
        >
          Snap your fridge, pop the ingredients into a smart pantry, and get cozy recipes that match your goals.
        </motion.p>
        <motion.div variants={itemVariants} className="flex flex-wrap gap-3">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <ComicButton icon={Camera} onClick={() => setPage('scan')}>Get Started</ComicButton>
          </motion.div>
        </motion.div>
        <motion.div variants={itemVariants}>
          <AiChef message="Protein power, tomato drama, dinner magic." />
        </motion.div>
      </motion.div>

      <motion.div style={{ y, opacity }}>
        <ComicCard className="relative min-h-[320px] sm:min-h-[430px] overflow-hidden bg-cream">
          <motion.div 
            className="absolute left-6 top-6 rounded-full border-3 border-ink bg-butter px-3 py-1 sm:px-4 sm:py-2 font-display text-2xl sm:text-4xl shadow-sticker"
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            BAM!
          </motion.div>
          {floating.map((item, index) => (
            <motion.div
              key={item}
              animate={{
                y: [0, -14, 0],
                rotate: [0, 4, 0],
                x: [0, 6, 0],
              }}
              transition={{
                duration: 3.6, // consistent interval
                repeat: Infinity,
                repeatType: 'reverse',
                ease: 'easeInOut',
                delay: index * 0.45, // staggered, regular intervals
              }}
              className="absolute rounded-[28px] border-3 border-ink bg-paper px-3 py-2 sm:px-5 sm:py-4 font-hand text-xl sm:text-3xl shadow-sticker"
              style={{ left: `${16 + index * 18}%`, top: `${22 + (index % 2) * 35}%` }}
              whileHover={{ scale: 1.06 }}
            >
              {item}
            </motion.div>
          ))}
          <motion.div 
            className="absolute bottom-8 left-1/2 grid h-48 w-56 -translate-x-1/2 place-items-center rounded-[42px] border-3 border-ink bg-leaf/20 shadow-comic"
            animate={{ scale: [1, 1.02, 1] }}
            transition={{ duration: 4, repeat: Infinity }}
          >
            <motion.img 
              src="/icons/fridge-doodle.svg" 
              alt="Doodle fridge" 
              className="h-24 w-24"
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
            />
            <span className="font-doodle text-2xl font-bold">AI Chef</span>
          </motion.div>
        </ComicCard>
      </motion.div>
    </section>
  );
}

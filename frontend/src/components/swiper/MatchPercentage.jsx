import { motion } from 'framer-motion';

export default function MatchPercentage({ percentage }) {
  return (
    <div className="rounded-[24px] border-3 border-ink bg-white/35 p-4 shadow-sticker backdrop-blur-md">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="font-doodle text-sm font-bold uppercase tracking-wide text-cocoa/80">Pantry Match</p>
          <p className="font-display text-4xl text-tomato">{percentage}%</p>
        </div>
        <div className="h-3 w-28 overflow-hidden rounded-full border-2 border-ink bg-paper">
          <motion.div
            className="h-full bg-gradient-to-r from-leaf to-tomato"
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
          />
        </div>
      </div>
    </div>
  );
}

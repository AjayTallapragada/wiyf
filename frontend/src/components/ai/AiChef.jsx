import { motion } from 'framer-motion';
import SpeechBubble from '../ui/SpeechBubble';

export default function AiChef({ message = 'Nice combo!' }) {
  return (
    <div className="flex items-end gap-4">
      <motion.div
        animate={{ y: [0, -6, 0], rotate: [-2, 2, -2] }}
        transition={{ duration: 3, repeat: Infinity }}
        className="grid h-20 w-20 shrink-0 place-items-center rounded-full border-3 border-ink bg-butter text-4xl shadow-sticker"
        aria-hidden="true"
      >
        chef
      </motion.div>
      <SpeechBubble className="max-w-md">{message}</SpeechBubble>
    </div>
  );
}

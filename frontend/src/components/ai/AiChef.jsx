import { motion } from 'framer-motion';
import { ChefHat, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import SpeechBubble from '../ui/SpeechBubble';

const chefQuips = [
  'I checked the pantry. It has main-character energy.',
  'Tiny chef brain loading: 40% recipes, 60% snack opinions.',
  'If dinner had a drumroll, this would be the crispy part.',
  'I am legally required to say: taste before adding more chili.',
  'Leftovers fear me. Lunchboxes respect me.',
  'Your fridge called. It wants a glow-up and maybe garlic.',
  'I can turn three ingredients into dinner and one ingredient into confidence.',
  'This pantry is not empty. It is minimalist cuisine.',
];

export default function AiChef({ message = 'Nice combo!', messages = [] }) {
  const lines = useMemo(() => [message, ...messages, ...chefQuips].filter(Boolean), [message, messages]);
  const [lineIndex, setLineIndex] = useState(0);
  const activeMessage = lines[lineIndex % lines.length] || message;

  function nextLine() {
    setLineIndex((index) => (index + 1) % lines.length);
  }

  return (
    <div className="flex items-end gap-4">
      <motion.button
        type="button"
        onClick={nextLine}
        whileTap={{ scale: 0.92, rotate: 4 }}
        whileHover={{ y: -4 }}
        animate={{ y: [0, -6, 0], rotate: [-2, 2, -2] }}
        transition={{ duration: 3, repeat: Infinity }}
        className="relative grid h-20 w-20 shrink-0 place-items-center rounded-full border-3 border-ink bg-butter text-4xl shadow-sticker outline-none transition focus-visible:ring-4 focus-visible:ring-tomato/40"
        aria-label="Ask the AI chef for another line"
      >
        <ChefHat size={42} strokeWidth={2.6} />
        <motion.span
          className="absolute -right-1 -top-1 grid h-7 w-7 place-items-center rounded-full border-2 border-ink bg-tomato text-paper"
          animate={{ rotate: [0, 12, -12, 0], scale: [1, 1.08, 1] }}
          transition={{ duration: 2.2, repeat: Infinity }}
          aria-hidden="true"
        >
          <Sparkles size={15} />
        </motion.span>
      </motion.button>
      <SpeechBubble className="max-w-md">{activeMessage}</SpeechBubble>
    </div>
  );
}

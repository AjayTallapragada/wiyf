import { motion } from 'framer-motion';

export default function ComicButton({ children, className = '', icon: Icon, variant = 'primary', ...props }) {
  const variants = {
    primary: 'bg-tomato text-white',
    green: 'bg-leaf text-white',
    yellow: 'bg-butter text-ink',
    paper: 'bg-paper text-ink',
  };

  return (
    <motion.button
      whileHover={{ y: -2, rotate: -1 }}
      whileTap={{ scale: 0.96, rotate: 1 }}
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border-3 border-ink px-5 py-3 font-doodle text-lg font-bold shadow-sticker transition-colors ${variants[variant]} ${className}`}
      {...props}
    >
      {Icon ? <Icon size={20} strokeWidth={3} /> : null}
      <span>{children}</span>
    </motion.button>
  );
}

import { motion } from 'framer-motion';
import { popIn } from '../../animations/variants';

export default function ComicCard({ children, className = '', as: Component = motion.article, ...props }) {
  return (
    <Component
      variants={popIn}
      className={`doodle-border paper-texture p-5 shadow-comic ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
}

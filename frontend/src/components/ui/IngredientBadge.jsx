import { motion } from 'framer-motion';
import { categoryStyles } from '../../utils/categories';

export default function IngredientBadge({ ingredient, onRemove }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.84 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`flex items-center justify-between gap-3 rounded-full border-2 px-4 py-2 font-hand text-lg ${categoryStyles[ingredient.category] || categoryStyles.other}`}
    >
      <span>{ingredient.name}</span>
      <span className="rounded-full bg-white/80 px-2 font-body text-xs font-black uppercase tracking-wide">{ingredient.category || 'other'}</span>
      <span className="rounded-full bg-white/70 px-2 text-sm">{Math.round((ingredient.confidence || 1) * 100)}%</span>
      {onRemove ? (
        <button className="font-body text-sm font-black" onClick={() => onRemove(ingredient.id)} aria-label={`Remove ${ingredient.name}`}>
          x
        </button>
      ) : null}
    </motion.div>
  );
}

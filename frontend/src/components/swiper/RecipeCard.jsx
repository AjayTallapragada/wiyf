import { Clock3, MoveHorizontal } from 'lucide-react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import MatchPercentage from './MatchPercentage';
import { formatIngredientLabel, getRecipeMatch } from '../../utils/recipeMatch';

const SWIPE_THRESHOLD = 140;

export default function RecipeCard({ recipe, pantry, onLike, onDislike, onOpen }) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-220, 0, 220], [-14, 0, 14]);
  const likeOpacity = useTransform(x, [20, 120], [0, 1]);
  const dislikeOpacity = useTransform(x, [-120, -20], [1, 0]);
  const match = getRecipeMatch(recipe, pantry);

  return (
    <motion.article
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      style={{ x, rotate }}
      onDragEnd={(_, info) => {
        if (info.offset.x >= SWIPE_THRESHOLD) {
          onLike();
          return;
        }

        if (info.offset.x <= -SWIPE_THRESHOLD) {
          onDislike();
          return;
        }

        x.set(0);
      }}
      initial={{ opacity: 0, scale: 0.92, y: 30 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, x: 200 }}
      transition={{ type: 'spring', stiffness: 240, damping: 22 }}
      className="relative mx-auto w-full max-w-xl touch-pan-y select-none"
    >
      <motion.div style={{ opacity: likeOpacity }} className="pointer-events-none absolute left-6 top-6 z-20 rounded-full border-3 border-ink bg-leaf px-4 py-2 font-doodle text-xl font-bold text-white shadow-sticker">
        LIKE
      </motion.div>
      <motion.div style={{ opacity: dislikeOpacity }} className="pointer-events-none absolute right-6 top-6 z-20 rounded-full border-3 border-ink bg-tomato px-4 py-2 font-doodle text-xl font-bold text-white shadow-sticker">
        NOPE
      </motion.div>

      <div
        role="button"
        tabIndex={0}
        onClick={onOpen}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onOpen();
          }
        }}
        className="rounded-[34px] border-3 border-white/35 bg-white/22 p-3 shadow-[0_18px_55px_rgba(33,26,22,0.18)] backdrop-blur-xl"
      >
        <div className="rounded-[28px] border-3 border-ink bg-[linear-gradient(180deg,rgba(255,250,240,0.94),rgba(255,255,255,0.68))] p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-doodle text-sm font-bold uppercase tracking-[0.2em] text-cocoa/70">Pantry-first pick</p>
              <h2 className="mt-2 font-display text-4xl leading-none text-tomato sm:text-5xl">{recipe.title}</h2>
              <p className="mt-3 max-w-lg font-hand text-2xl leading-tight text-cocoa">{recipe.description}</p>
            </div>
            <div className="rounded-[22px] border-3 border-ink bg-butter px-4 py-3 text-center shadow-sticker">
              <Clock3 className="mx-auto mb-1" size={20} />
              <p className="font-doodle text-lg font-bold">{recipe.cooking_time} min</p>
            </div>
          </div>

          <div className="mt-5">
            <MatchPercentage percentage={match.percentage} />
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <section className="rounded-[24px] border-3 border-ink bg-leaf/10 p-4">
              <p className="font-doodle text-lg font-bold text-leaf">Available Ingredients</p>
              <ul className="mt-3 space-y-2 font-hand text-xl text-cocoa">
                {(match.available.length ? match.available : recipe.ingredients_used || []).slice(0, 6).map((item) => (
                  <li key={item}>✓ {formatIngredientLabel(item)}</li>
                ))}
              </ul>
            </section>

            <section className="rounded-[24px] border-3 border-ink bg-tomato/10 p-4">
              <p className="font-doodle text-lg font-bold text-tomato">Missing Ingredients</p>
              <ul className="mt-3 space-y-2 font-hand text-xl text-cocoa">
                {(match.missing.length ? match.missing : ['Nothing missing']).slice(0, 6).map((item) => (
                  <li key={item}>✗ {formatIngredientLabel(item)}</li>
                ))}
              </ul>
            </section>
          </div>

          <div className="mt-5 flex items-center justify-between gap-3 rounded-[24px] border-3 border-ink bg-paper/80 px-4 py-3">
            <p className="font-hand text-xl text-cocoa">Swipe or tap buttons to move through your stack.</p>
            <div className="hidden items-center gap-2 rounded-full border-2 border-ink bg-cream px-3 py-2 font-doodle text-sm font-bold text-cocoa md:flex">
              <MoveHorizontal size={16} />
              Swipe
            </div>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

import { Clock, Flame, Heart, Salad, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import ComicButton from '../ui/ComicButton';
import ComicCard from '../ui/ComicCard';

export default function RecipeCard({ recipe, onFavorite, onOpen }) {
  return (
    <ComicCard
      className={`flex h-full flex-col gap-4 bg-paper ${onOpen ? 'cursor-pointer' : ''}`}
      as={motion.article}
      onClick={onOpen}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-4xl leading-none tracking-normal text-tomato">{recipe.title}</h3>
          <p className="mt-2 font-hand text-xl leading-snug">{recipe.description}</p>
        </div>
        <motion.div animate={{ rotate: [0, 8, -8, 0] }} transition={{ repeat: Infinity, duration: 4 }} className="rounded-full border-2 border-ink bg-butter p-2">
          <Sparkles size={22} />
        </motion.div>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center font-doodle">
        <span className="rounded-xl border-2 border-ink bg-cream p-2"><Clock className="mx-auto" size={18} />{recipe.cooking_time}m</span>
        <span className="rounded-xl border-2 border-ink bg-cream p-2"><Flame className="mx-auto" size={18} />{recipe.calories}</span>
        <span className="rounded-xl border-2 border-ink bg-cream p-2"><Salad className="mx-auto" size={18} />{recipe.protein}g</span>
      </div>
      <div>
        <p className="font-doodle text-lg font-bold">Uses</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {recipe.ingredients_used.map((item) => (
            <span key={item} className="rounded-full border-2 border-leaf bg-leaf/10 px-3 py-1 font-hand text-lg text-leaf">{item}</span>
          ))}
        </div>
      </div>
      {recipe.missing_ingredients.length ? (
        <div>
          <p className="font-doodle text-lg font-bold">Missing</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {recipe.missing_ingredients.map((item) => (
              <span key={item} className="rounded-full border-2 border-tomato bg-tomato/10 px-3 py-1 font-hand text-lg text-tomato">{item}</span>
            ))}
          </div>
        </div>
      ) : null}
      <ol className="space-y-2 font-body text-sm leading-relaxed">
        {recipe.instructions.map((step, index) => (
          <li key={step} className="flex gap-2">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 border-ink bg-butter font-bold">{index + 1}</span>
            {step}
          </li>
        ))}
      </ol>
      <div className="mt-auto flex items-center justify-between gap-3">
        <span className="font-hand text-xl text-cocoa">{recipe.ai_message}</span>
        <ComicButton
          variant="yellow"
          icon={Heart}
          onClick={(event) => {
            event.stopPropagation();
            onFavorite(recipe);
          }}
          className="min-h-10 px-3 py-2 text-base"
        >
          Save
        </ComicButton>
      </div>
    </ComicCard>
  );
}

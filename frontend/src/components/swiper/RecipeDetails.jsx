import { ArrowLeft, Heart } from 'lucide-react';
import ComicButton from '../ui/ComicButton';
import MatchPercentage from './MatchPercentage';
import { formatIngredientLabel, getRecipeMatch } from '../../utils/recipeMatch';

export default function RecipeDetails({ recipe, pantry, onBack, onFavorite }) {
  const match = getRecipeMatch(recipe, pantry);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ComicButton variant="paper" icon={ArrowLeft} onClick={onBack}>Back</ComicButton>
        <ComicButton variant="green" icon={Heart} onClick={() => onFavorite(recipe)}>Save to Favorites</ComicButton>
      </div>

      <section className="rounded-[34px] border-3 border-white/35 bg-white/22 p-3 shadow-[0_18px_55px_rgba(33,26,22,0.18)] backdrop-blur-xl">
        <div className="rounded-[28px] border-3 border-ink bg-[linear-gradient(180deg,rgba(255,250,240,0.94),rgba(255,255,255,0.68))] p-6">
          <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-4">
              <div>
                <p className="font-doodle text-sm font-bold uppercase tracking-[0.2em] text-cocoa/70">Recipe Details</p>
                <h1 className="mt-2 font-display text-5xl leading-none text-tomato sm:text-6xl">{recipe.title}</h1>
                <p className="mt-3 font-hand text-2xl leading-tight text-cocoa">{recipe.description}</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-[22px] border-3 border-ink bg-butter px-4 py-3 shadow-sticker">
                  <p className="font-doodle text-sm font-bold uppercase tracking-wide text-cocoa/70">Prep Time</p>
                  <p className="font-display text-3xl text-cocoa">{recipe.cooking_time} min</p>
                </div>
                <div className="rounded-[22px] border-3 border-ink bg-paper px-4 py-3 shadow-sticker">
                  <p className="font-doodle text-sm font-bold uppercase tracking-wide text-cocoa/70">Calories</p>
                  <p className="font-display text-3xl text-cocoa">{recipe.calories || 'N/A'}</p>
                </div>
                <div className="rounded-[22px] border-3 border-ink bg-paper px-4 py-3 shadow-sticker">
                  <p className="font-doodle text-sm font-bold uppercase tracking-wide text-cocoa/70">Protein</p>
                  <p className="font-display text-3xl text-cocoa">{recipe.protein || 'N/A'}g</p>
                </div>
              </div>

              <MatchPercentage percentage={match.percentage} />
            </div>

            <div className="rounded-[24px] border-3 border-ink bg-leaf/10 p-5">
              <p className="font-display text-4xl text-leaf">Ingredients</p>
              <ul className="mt-4 space-y-3 font-hand text-xl text-cocoa">
                {(recipe.ingredients || []).map((item, index) => (
                  <li key={`${item.name}-${index}`}>• {item.quantity ? `${item.quantity} ` : ''}{formatIngredientLabel(item.name)}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-[28px] border-3 border-ink bg-white/65 p-6 shadow-sticker backdrop-blur-md">
          <p className="font-display text-4xl text-leaf">Pantry Match Info</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-[22px] border-3 border-ink bg-leaf/10 p-4">
              <p className="font-doodle text-lg font-bold text-leaf">Available Ingredients</p>
              <ul className="mt-3 space-y-2 font-hand text-xl text-cocoa">
                {(match.available.length ? match.available : recipe.ingredients_used || []).map((item) => (
                  <li key={item}>✓ {formatIngredientLabel(item)}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-[22px] border-3 border-ink bg-tomato/10 p-4">
              <p className="font-doodle text-lg font-bold text-tomato">Missing Ingredients</p>
              <ul className="mt-3 space-y-2 font-hand text-xl text-cocoa">
                {(match.missing.length ? match.missing : ['Nothing missing']).map((item) => (
                  <li key={item}>✗ {formatIngredientLabel(item)}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border-3 border-ink bg-white/65 p-6 shadow-sticker backdrop-blur-md">
          <p className="font-display text-4xl text-tomato">Instructions</p>
          <ol className="mt-4 space-y-3">
            {recipe.instructions.map((step, index) => (
              <li key={`${index}-${step}`} className="flex gap-3 rounded-[22px] border-3 border-ink bg-paper p-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-3 border-ink bg-butter font-display text-2xl">{index + 1}</span>
                <span className="font-hand text-xl leading-snug text-cocoa">{step}</span>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}

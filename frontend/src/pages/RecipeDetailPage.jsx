import { ArrowLeft, CheckCircle2, Heart, ListChecks } from 'lucide-react';
import { useMemo, useState } from 'react';
import ComicButton from '../components/ui/ComicButton';
import ComicCard from '../components/ui/ComicCard';
import AiChef from '../components/ai/AiChef';

export default function RecipeDetailPage({ recipe, onBack, onFavorite }) {
  const checklist = useMemo(() => {
    const fromFullList = recipe.ingredients?.map((item) => ({
      key: `${item.name}-${item.quantity}`,
      label: item.quantity ? `${item.quantity} ${item.name}` : item.name,
    })) || [];
    if (fromFullList.length) return fromFullList;
    return recipe.ingredients_used.map((name) => ({ key: name, label: name }));
  }, [recipe]);
  const [checked, setChecked] = useState({});
  const completed = checklist.filter((item) => checked[item.key]).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ComicButton variant="paper" icon={ArrowLeft} onClick={onBack}>Back</ComicButton>
        <ComicButton variant="yellow" icon={Heart} onClick={() => onFavorite(recipe)}>Save</ComicButton>
      </div>
      <AiChef message={completed === checklist.length ? 'All ingredients checked. Let the cooking begin!' : 'Check ingredients as you prep them.'} />
      <ComicCard className="bg-cream">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-6xl leading-none text-tomato">{recipe.title}</h1>
            <p className="mt-2 max-w-2xl font-hand text-2xl text-cocoa">{recipe.description}</p>
          </div>
          <div className="rounded-2xl border-3 border-ink bg-paper px-4 py-3 text-center font-doodle shadow-sticker">
            <div className="text-2xl font-bold">{recipe.cooking_time} min</div>
            <div>{recipe.calories} cal | {recipe.protein}g protein</div>
          </div>
        </div>
      </ComicCard>
      <div className="grid gap-6 lg:grid-cols-[.85fr_1.15fr]">
        <ComicCard>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-display text-5xl text-leaf">Checklist</h2>
            <span className="rounded-full border-2 border-ink bg-butter px-3 py-1 font-doodle font-bold">{completed}/{checklist.length}</span>
          </div>
          <div className="space-y-3">
            {checklist.map((item) => (
              <label key={item.key} className={`flex cursor-pointer items-center gap-3 rounded-2xl border-3 border-ink px-4 py-3 font-hand text-2xl shadow-sticker transition ${checked[item.key] ? 'bg-leaf/20 text-cocoa' : 'bg-paper'}`}>
                <input
                  type="checkbox"
                  className="h-6 w-6 accent-leaf"
                  checked={Boolean(checked[item.key])}
                  onChange={(event) => setChecked({ ...checked, [item.key]: event.target.checked })}
                />
                <span className={checked[item.key] ? 'line-through decoration-4 decoration-tomato' : ''}>{item.label}</span>
              </label>
            ))}
          </div>
          {recipe.missing_ingredients?.length ? (
            <div className="mt-5 rounded-2xl border-3 border-tomato bg-tomato/10 p-4">
              <p className="font-doodle text-lg font-bold text-tomato">Missing ingredients</p>
              <p className="font-hand text-xl">{recipe.missing_ingredients.join(', ')}</p>
            </div>
          ) : null}
        </ComicCard>
        <ComicCard>
          <div className="mb-4 flex items-center gap-3">
            <ListChecks size={34} />
            <h2 className="font-display text-5xl text-tomato">Steps</h2>
          </div>
          <ol className="space-y-4">
            {recipe.instructions.map((step, index) => (
              <li key={step} className="flex gap-4 rounded-2xl border-3 border-ink bg-paper p-4 shadow-sticker">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-3 border-ink bg-butter font-display text-3xl">{index + 1}</span>
                <span className="font-hand text-2xl leading-snug">{step}</span>
              </li>
            ))}
          </ol>
          {completed === checklist.length ? (
            <div className="mt-5 flex items-center gap-3 rounded-2xl border-3 border-leaf bg-leaf/15 p-4 font-hand text-2xl text-leaf">
              <CheckCircle2 />
              Ready to cook.
            </div>
          ) : null}
        </ComicCard>
      </div>
    </div>
  );
}

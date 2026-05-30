import { CalendarDays, Loader2 } from 'lucide-react';
import { useState } from 'react';
import AiChef from '../components/ai/AiChef';
import ComicButton from '../components/ui/ComicButton';
import ComicCard from '../components/ui/ComicCard';
import { generateMealPlan } from '../services/api';

export default function MealPlannerPage({ pantry, preferences }) {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);

  async function createPlan() {
    setLoading(true);
    try {
      setPlan(await generateMealPlan({ ingredients: pantry.ingredients, preferences }));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <AiChef message="Weekly planning, pantry first, shopping list second." />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-4xl sm:text-6xl text-tomato">Meal Planner</h1>
        <ComicButton icon={loading ? Loader2 : CalendarDays} onClick={createPlan}>{loading ? 'Planning' : 'Generate Week'}</ComicButton>
      </div>
      {plan ? (
        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          <div className="grid gap-4">
            {plan.days.map((day) => (
              <ComicCard key={day.day}>
                <h2 className="font-display text-4xl text-leaf">{day.day}</h2>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <Meal title="Lunch" recipe={day.lunch.title} />
                  <Meal title="Dinner" recipe={day.dinner.title} />
                  <Meal title="Snack" recipe={day.snack} />
                </div>
              </ComicCard>
            ))}
          </div>
          <ComicCard className="h-fit">
            <h2 className="font-display text-4xl text-tomato">Shopping List</h2>
            <ul className="mt-3 space-y-2 font-hand text-2xl">
              {plan.shopping_list.map((item) => <li key={item}>- {item}</li>)}
            </ul>
          </ComicCard>
        </div>
      ) : (
        <ComicCard className="text-center font-hand text-3xl">Generate a pantry-first week.</ComicCard>
      )}
    </div>
  );
}

function Meal({ title, recipe }) {
  return (
    <div className="rounded-2xl border-3 border-ink bg-paper p-4 shadow-sticker">
      <p className="font-doodle text-lg font-bold text-cocoa">{title}</p>
      <p className="font-hand text-2xl">{recipe}</p>
    </div>
  );
}

import { Save, Sparkles } from 'lucide-react';
import { useEffect } from 'react';
import AiChef from '../components/ai/AiChef';
import ComicButton from '../components/ui/ComicButton';
import ComicCard from '../components/ui/ComicCard';
import { getPreferences, savePreferences } from '../services/api';

const toggles = [
  ['high_protein', 'High protein'],
  ['low_oil', 'Low oil'],
  ['low_calorie', 'Low calorie'],
  ['muscle_gain', 'Muscle gain'],
  ['weight_loss', 'Weight loss'],
];

export default function PreferencesPage({ preferences, setPreferences, setPage }) {
  useEffect(() => {
    getPreferences().then(setPreferences).catch(() => {});
  }, [setPreferences]);

  async function save() {
    const data = await savePreferences(preferences);
    setPreferences(data);
    setPage('recipes');
  }

  return (
    <div className="space-y-6">
      <AiChef message="Tell me the dinner mood and I will keep the pantry first." />
      <ComicCard className="space-y-6">
        <div>
          <h2 className="font-display text-5xl text-tomato">Diet Style</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {['vegetarian', 'non-vegetarian', 'vegan'].map((diet) => (
              <button key={diet} onClick={() => setPreferences({ ...preferences, diet })} className={`rounded-2xl border-3 border-ink px-4 py-4 font-hand text-2xl shadow-sticker ${preferences.diet === diet ? 'bg-leaf text-white' : 'bg-paper'}`}>
                {diet}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {toggles.map(([key, label]) => (
            <label key={key} className={`cursor-pointer rounded-2xl border-3 border-ink px-4 py-4 font-hand text-xl shadow-sticker ${preferences[key] ? 'bg-butter' : 'bg-paper'}`}>
              <input type="checkbox" className="mr-2 h-5 w-5 accent-tomato" checked={preferences[key]} onChange={(event) => setPreferences({ ...preferences, [key]: event.target.checked })} />
              {label}
            </label>
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="font-doodle text-lg font-bold">
            Cuisine
            <input className="mt-2 w-full rounded-2xl border-3 border-ink bg-paper px-4 py-3 font-hand text-xl" value={preferences.cuisine} onChange={(event) => setPreferences({ ...preferences, cuisine: event.target.value })} />
          </label>
          <label className="font-doodle text-lg font-bold">
            Cooking time
            <input className="mt-2 w-full rounded-2xl border-3 border-ink bg-paper px-4 py-3 font-hand text-xl" type="number" min="5" max="180" value={preferences.cooking_time} onChange={(event) => setPreferences({ ...preferences, cooking_time: Number(event.target.value) })} />
          </label>
          <label className="font-doodle text-lg font-bold">
            Servings
            <input className="mt-2 w-full rounded-2xl border-3 border-ink bg-paper px-4 py-3 font-hand text-xl" type="number" min="1" max="12" value={preferences.servings} onChange={(event) => setPreferences({ ...preferences, servings: Number(event.target.value) })} />
          </label>
        </div>
        <div className="flex flex-wrap gap-3">
          <ComicButton icon={Save} onClick={save}>Save Goals</ComicButton>
          <ComicButton icon={Sparkles} variant="yellow" onClick={() => setPage('recipes')}>Generate</ComicButton>
        </div>
      </ComicCard>
    </div>
  );
}

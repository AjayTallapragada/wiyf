import { AlertTriangle, Minus, Plus, Save, Sparkles, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
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

const cuisines = ['surprise me', 'Indian', 'South Indian', 'North Indian', 'Italian', 'Mexican', 'Thai', 'Mediterranean'];

function clamp(value, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return min;
  return Math.min(max, Math.max(min, parsed));
}

function normalizeAllergy(value) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

export default function PreferencesPage({ preferences, setPreferences, setPage, setRecipes }) {
  const [allergyInput, setAllergyInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const allergies = preferences.allergies || [];

  useEffect(() => {
    getPreferences().then(setPreferences).catch(() => {});
  }, [setPreferences]);

  const activeGoals = useMemo(
    () => toggles.filter(([key]) => preferences[key]).map(([, label]) => label),
    [preferences],
  );

  function updatePreference(key, value) {
    setPreferences({ ...preferences, [key]: value });
  }

  function updateNumber(key, value, min, max) {
    updatePreference(key, clamp(value, min, max));
  }

  function addAllergy() {
    const allergy = normalizeAllergy(allergyInput);
    if (!allergy || allergies.includes(allergy)) return;
    updatePreference('allergies', [...allergies, allergy]);
    setAllergyInput('');
  }

  function removeAllergy(allergy) {
    updatePreference('allergies', allergies.filter((item) => item !== allergy));
  }

  async function persist(nextPage) {
    setSaving(true);
    setSaveError('');
    try {
      const normalized = {
        ...preferences,
        cuisine: preferences.cuisine?.trim() || 'surprise me',
        cooking_time: clamp(preferences.cooking_time, 5, 180),
        servings: clamp(preferences.servings, 1, 12),
        allergies: allergies.map(normalizeAllergy).filter(Boolean),
      };
      const data = await savePreferences(normalized);
      setPreferences(data);
      if (nextPage === 'recipes') setRecipes?.([]);
      setPage(nextPage);
    } catch (error) {
      setSaveError('Could not save preferences. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <AiChef message="Set the rules. I will make the recipe behave." />
      <ComicCard className="space-y-6">
        <div>
          <h2 className="font-display text-5xl text-tomato">Diet Style</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {['vegetarian', 'non-vegetarian', 'vegan'].map((diet) => (
              <button
                key={diet}
                type="button"
                onClick={() => updatePreference('diet', diet)}
                className={`rounded-2xl border-3 border-ink px-4 py-4 font-hand text-2xl shadow-sticker ${preferences.diet === diet ? 'bg-leaf text-white' : 'bg-paper'}`}
              >
                {diet}
              </button>
            ))}
          </div>
        </div>

        <div>
          <h2 className="font-display text-5xl text-leaf">Goals</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {toggles.map(([key, label]) => (
              <label key={key} className={`cursor-pointer rounded-2xl border-3 border-ink px-4 py-4 font-hand text-xl shadow-sticker ${preferences[key] ? 'bg-butter' : 'bg-paper'}`}>
                <input
                  type="checkbox"
                  className="mr-2 h-5 w-5 accent-tomato"
                  checked={Boolean(preferences[key])}
                  onChange={(event) => updatePreference(key, event.target.checked)}
                />
                {label}
              </label>
            ))}
          </div>
        </div>

        <div>
          <h2 className="font-display text-5xl text-tomato">Cuisine</h2>
          <div className="mt-3 flex flex-wrap gap-3">
            {cuisines.map((cuisine) => (
              <button
                key={cuisine}
                type="button"
                onClick={() => updatePreference('cuisine', cuisine)}
                className={`rounded-2xl border-3 border-ink px-4 py-3 font-hand text-xl shadow-sticker ${preferences.cuisine === cuisine ? 'bg-butter' : 'bg-paper'}`}
              >
                {cuisine}
              </button>
            ))}
          </div>
          <input
            className="mt-3 w-full rounded-2xl border-3 border-ink bg-paper px-4 py-3 font-hand text-xl"
            value={preferences.cuisine}
            onChange={(event) => updatePreference('cuisine', event.target.value)}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="font-doodle text-lg font-bold">
            Cooking time
            <div className="mt-2 grid grid-cols-[auto_1fr_auto] items-center gap-2">
              <button type="button" onClick={() => updateNumber('cooking_time', preferences.cooking_time - 5, 5, 180)} className="grid h-12 w-12 place-items-center rounded-full border-3 border-ink bg-paper shadow-sticker">
                <Minus size={20} />
              </button>
              <input className="w-full rounded-2xl border-3 border-ink bg-paper px-4 py-3 text-center font-hand text-xl" type="number" min="5" max="180" value={preferences.cooking_time} onChange={(event) => updateNumber('cooking_time', event.target.value, 5, 180)} />
              <button type="button" onClick={() => updateNumber('cooking_time', preferences.cooking_time + 5, 5, 180)} className="grid h-12 w-12 place-items-center rounded-full border-3 border-ink bg-paper shadow-sticker">
                <Plus size={20} />
              </button>
            </div>
          </label>
          <label className="font-doodle text-lg font-bold">
            Servings
            <div className="mt-2 grid grid-cols-[auto_1fr_auto] items-center gap-2">
              <button type="button" onClick={() => updateNumber('servings', preferences.servings - 1, 1, 12)} className="grid h-12 w-12 place-items-center rounded-full border-3 border-ink bg-paper shadow-sticker">
                <Minus size={20} />
              </button>
              <input className="w-full rounded-2xl border-3 border-ink bg-paper px-4 py-3 text-center font-hand text-xl" type="number" min="1" max="12" value={preferences.servings} onChange={(event) => updateNumber('servings', event.target.value, 1, 12)} />
              <button type="button" onClick={() => updateNumber('servings', preferences.servings + 1, 1, 12)} className="grid h-12 w-12 place-items-center rounded-full border-3 border-ink bg-paper shadow-sticker">
                <Plus size={20} />
              </button>
            </div>
          </label>
        </div>

        <div>
          <h2 className="font-display text-5xl text-leaf">Allergies</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
            <input
              className="rounded-2xl border-3 border-ink bg-paper px-4 py-3 font-hand text-xl"
              value={allergyInput}
              onChange={(event) => setAllergyInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  addAllergy();
                }
              }}
              placeholder="peanut, mushroom, shellfish"
            />
            <ComicButton icon={Plus} variant="yellow" onClick={addAllergy}>Add</ComicButton>
          </div>
          {allergies.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {allergies.map((allergy) => (
                <button
                  key={allergy}
                  type="button"
                  onClick={() => removeAllergy(allergy)}
                  className="flex items-center gap-2 rounded-full border-2 border-tomato bg-tomato/10 px-3 py-1 font-hand text-lg text-tomato"
                >
                  {allergy}
                  <X size={16} />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="rounded-2xl border-3 border-ink bg-cream p-4 shadow-sticker">
          <p className="font-doodle text-lg font-bold text-cocoa">Current rules</p>
          <p className="font-hand text-2xl">
            {preferences.diet}, {preferences.cuisine || 'surprise me'}, {preferences.cooking_time} min, {preferences.servings} serving{preferences.servings === 1 ? '' : 's'}
            {activeGoals.length ? `, ${activeGoals.join(', ')}` : ''}
            {allergies.length ? `, avoid ${allergies.join(', ')}` : ''}
          </p>
        </div>

        {saveError ? (
          <div className="flex items-center gap-3 rounded-2xl border-3 border-tomato bg-tomato/10 p-4 font-hand text-xl text-tomato">
            <AlertTriangle />
            {saveError}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <ComicButton icon={Save} disabled={saving} onClick={() => persist('recipes')}>
            {saving ? 'Saving' : 'Save Goals'}
          </ComicButton>
          <ComicButton icon={Sparkles} disabled={saving} variant="yellow" onClick={() => persist('recipes')}>
            Generate
          </ComicButton>
        </div>
      </ComicCard>
    </div>
  );
}

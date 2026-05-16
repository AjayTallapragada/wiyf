import { Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import AiChef from '../components/ai/AiChef';
import ComicButton from '../components/ui/ComicButton';
import ComicCard from '../components/ui/ComicCard';
import IngredientBadge from '../components/ui/IngredientBadge';
import { addIngredient, deleteIngredient, getPantry } from '../services/api';
import { categories } from '../utils/categories';

export default function PantryPage({ pantry, setPantry, setPage }) {
  const [form, setForm] = useState({ name: '', quantity: 1, unit: 'item', category: 'other' });

  useEffect(() => {
    getPantry().then(setPantry).catch(() => {});
  }, [setPantry]);

  async function submit(event) {
    event.preventDefault();
    if (!form.name.trim()) return;
    const data = await addIngredient(form);
    setPantry(data);
    setForm({ name: '', quantity: 1, unit: 'item', category: 'other' });
  }

  async function remove(id) {
    setPantry(await deleteIngredient(id));
  }

  const items = pantry?.ingredients ?? [];
  const grouped = categories.reduce((acc, category) => {
    acc[category] = items.filter((item) => item.category === category);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <AiChef message="Your pantry is turning into a recipe map." />
      <ComicCard>
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-[1fr_110px_120px_160px_auto]">
          <input className="rounded-2xl border-3 border-ink bg-paper px-4 py-3 font-hand text-xl" placeholder="Add ingredient" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          <input className="rounded-2xl border-3 border-ink bg-paper px-4 py-3 font-hand text-xl" type="number" min="0" step="0.5" value={form.quantity} onChange={(event) => setForm({ ...form, quantity: Number(event.target.value) })} />
          <input className="rounded-2xl border-3 border-ink bg-paper px-4 py-3 font-hand text-xl" value={form.unit} onChange={(event) => setForm({ ...form, unit: event.target.value })} />
          <select className="rounded-2xl border-3 border-ink bg-paper px-4 py-3 font-hand text-xl" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>
            {categories.map((category) => <option key={category} value={category}>{category === 'other' ? 'auto tag' : category}</option>)}
          </select>
          <ComicButton type="submit" icon={Plus} variant="green" className="min-h-12">Add</ComicButton>
        </form>
      </ComicCard>
      <div className="grid gap-5 md:grid-cols-2">
        {categories.map((category) => (
          <ComicCard key={category} className="min-h-40">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-4xl capitalize text-tomato">{category}</h2>
              <Trash2 size={22} />
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              {(grouped[category] && grouped[category].length) ? grouped[category].map((ingredient) => <IngredientBadge key={ingredient.id} ingredient={ingredient} onRemove={remove} />) : <span className="font-hand text-xl text-cocoa">Empty shelf</span>}
            </div>
          </ComicCard>
        ))}
      </div>
      <ComicButton className="w-full" onClick={() => setPage('preferences')}>Tune Preferences</ComicButton>
    </div>
  );
}

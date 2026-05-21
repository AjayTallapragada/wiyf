import { ChefHat, Loader2, Sparkles, CalendarDays } from 'lucide-react';
import { useState } from 'react';
import { motion } from 'framer-motion';
import AiChef from '../components/ai/AiChef';
import ComicButton from '../components/ui/ComicButton';
import RecipeCard from '../components/recipes/RecipeCard';
import RecipeDetailPage from './RecipeDetailPage';
import { generateRecipes, saveFavorite } from '../services/api';
import { stagger } from '../animations/variants';

export default function RecipeResultsPage({ pantry, preferences, recipes, setRecipes, selectedRecipe, setSelectedRecipe, setPage }) {
  const [loading, setLoading] = useState(false);

  async function createRecipes() {
    setLoading(true);
    try {
      const data = await generateRecipes({ ingredients: pantry.ingredients, preferences });
      setRecipes(data.recipes);
      setSelectedRecipe(null);
    } finally {
      setLoading(false);
    }
  }

  async function favorite(recipe) {
    await saveFavorite(recipe);
  }

  if (selectedRecipe) {
    return <RecipeDetailPage recipe={selectedRecipe} onBack={() => setSelectedRecipe(null)} onFavorite={favorite} />;
  }

  return (
    <div className="space-y-6">
      <AiChef message={recipes.length ? 'Tap a card to open the cooking checklist.' : 'Ready when you are. I will use the pantry first.'} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-6xl text-tomato">Recipe Cards</h1>
        <div className="flex items-center gap-3">
          <ComicButton icon={loading ? Loader2 : Sparkles} onClick={createRecipes}>
            {loading ? 'Cooking Ideas' : 'Generate Recipes'}
          </ComicButton>
          <ComicButton icon={Sparkles} variant="paper" onClick={() => setPage('preferences')}>Prefs</ComicButton>
          <ComicButton icon={CalendarDays} variant="paper" onClick={() => setPage('planner')}>Planner</ComicButton>
        </div>
      </div>
      {!recipes.length && !loading ? (
        <div className="grid place-items-center rounded-[32px] border-3 border-dashed border-ink bg-paper p-10 text-center shadow-sticker">
          <ChefHat size={76} />
          <p className="mt-3 font-hand text-3xl">No recipes yet. Let the AI chef riff on your pantry.</p>
        </div>
      ) : null}
      <motion.div variants={stagger} initial="hidden" animate="show" className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {recipes.map((recipe) => (
          <RecipeCard
            key={recipe.id}
            recipe={recipe}
            pantry={pantry}
            onFavorite={(eventRecipe) => favorite(eventRecipe)}
            onOpen={() => setSelectedRecipe(recipe)}
          />
        ))}
      </motion.div>
    </div>
  );
}

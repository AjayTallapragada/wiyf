import { ChefHat, Loader2, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import AiChef from '../components/ai/AiChef';
import RecipeCard from '../components/swiper/RecipeCard';
import SwipeButtons from '../components/swiper/SwipeButtons';
import ComicButton from '../components/ui/ComicButton';
import { useAppState } from '../context/AppStateContext';
import { generateRecipes, saveFavorite } from '../services/api';

export default function SwiperPage() {
  const navigate = useNavigate();
  const {
    pantry,
    preferences,
    swiperRecipes,
    setSwiperRecipes,
    swiperIndex,
    setSwiperIndex,
    showNotification,
  } = useAppState();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const currentRecipe = swiperRecipes[swiperIndex] || null;
  const pantryCount = pantry?.ingredients?.length || 0;

  const chefMessage = useMemo(() => {
    if (loading) return 'Matching your pantry with swipe-ready recipes.';
    if (error) return 'Recipe fetch hit a snag. Try again in a moment.';
    if (!pantryCount) return 'Add pantry ingredients first so I can build a swipe stack.';
    if (!swiperRecipes.length) return 'Tap generate and I will queue up pantry-based recipe matches.';
    return 'Swipe right for favorites, left to keep browsing.';
  }, [error, loading, pantryCount, swiperRecipes.length]);

  useEffect(() => {
    if (swiperRecipes.length && swiperIndex >= swiperRecipes.length) {
      setSwiperIndex(Math.max(swiperRecipes.length - 1, 0));
    }
  }, [setSwiperIndex, swiperIndex, swiperRecipes.length]);

  async function createStack() {
    if (!pantryCount) return;
    setLoading(true);
    setError('');

    try {
      const data = await generateRecipes({ ingredients: pantry.ingredients, preferences });
      setSwiperRecipes(data.recipes || []);
      setSwiperIndex(0);
    } catch (err) {
      console.error(err);
      setError('Unable to load recipe recommendations right now.');
    } finally {
      setLoading(false);
    }
  }

  async function likeRecipe(recipe) {
    await saveFavorite(recipe);
    showNotification(`${recipe.title} added to favorites.`, 'success');
    setSwiperIndex((index) => index + 1);
  }

  function dislikeRecipe() {
    setSwiperIndex((index) => index + 1);
  }

  function openRecipe(recipe) {
    navigate(`/recipe/${recipe.id}`, { state: { recipe, from: '/swiper' } });
  }

  return (
    <div className="space-y-6">
      <AiChef message={chefMessage} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-5xl text-tomato sm:text-6xl">Swiper</h1>
          <p className="mt-2 font-hand text-2xl text-cocoa">Pantry-based recipe picks in a swipe deck.</p>
        </div>
        <ComicButton icon={loading ? Loader2 : Sparkles} onClick={createStack} disabled={loading || !pantryCount}>
          {loading ? 'Loading Recipes' : 'Generate Stack'}
        </ComicButton>
      </div>

      {error ? (
        <div className="rounded-[28px] border-3 border-tomato bg-tomato/10 p-5 font-hand text-2xl text-tomato shadow-sticker">
          {error}
        </div>
      ) : null}

      {!pantryCount ? (
        <div className="grid place-items-center rounded-[32px] border-3 border-dashed border-ink bg-paper/70 p-10 text-center shadow-sticker backdrop-blur-md">
          <ChefHat size={76} />
          <p className="mt-4 font-hand text-3xl">Your pantry is empty. Add ingredients to unlock recipe swipes.</p>
        </div>
      ) : null}

      {loading ? (
        <div className="grid min-h-[540px] place-items-center rounded-[34px] border-3 border-ink bg-white/35 shadow-sticker backdrop-blur-md">
          <div className="text-center">
            <Loader2 className="mx-auto animate-spin text-tomato" size={52} strokeWidth={2.5} />
            <p className="mt-4 font-hand text-3xl text-cocoa">Cooking up the next stack...</p>
          </div>
        </div>
      ) : null}

      {!loading && pantryCount > 0 && !swiperRecipes.length ? (
        <div className="grid place-items-center rounded-[32px] border-3 border-dashed border-ink bg-paper/70 p-10 text-center shadow-sticker backdrop-blur-md">
          <ChefHat size={76} />
          <p className="mt-4 font-hand text-3xl">No recipes yet. Generate a stack to start swiping.</p>
        </div>
      ) : null}

      {!loading && swiperRecipes.length > 0 && !currentRecipe ? (
        <div className="grid place-items-center rounded-[32px] border-3 border-dashed border-ink bg-paper/70 p-10 text-center shadow-sticker backdrop-blur-md">
          <ChefHat size={76} />
          <p className="mt-4 font-hand text-3xl">You reached the end of the stack. Generate more recipe ideas.</p>
        </div>
      ) : null}

      {!loading && currentRecipe ? (
        <div className="space-y-5">
          <div className="flex items-center justify-center">
            <div className="rounded-full border-3 border-ink bg-paper px-4 py-2 font-doodle text-lg font-bold shadow-sticker">
              Recipe {swiperIndex + 1} of {swiperRecipes.length}
            </div>
          </div>

          <div className="relative min-h-[540px]">
            <AnimatePresence mode="wait">
              <motion.div key={currentRecipe.id} className="absolute inset-0">
                <RecipeCard
                  recipe={currentRecipe}
                  pantry={pantry}
                  onLike={() => likeRecipe(currentRecipe)}
                  onDislike={dislikeRecipe}
                  onOpen={() => openRecipe(currentRecipe)}
                />
              </motion.div>
            </AnimatePresence>
          </div>

          <SwipeButtons onLike={() => likeRecipe(currentRecipe)} onDislike={dislikeRecipe} />
        </div>
      ) : null}
    </div>
  );
}

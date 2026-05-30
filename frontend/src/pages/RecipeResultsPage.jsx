import { ChefHat, Loader2, Sparkles, CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import AiChef from '../components/ai/AiChef';
import ComicButton from '../components/ui/ComicButton';
import RecipeCard from '../components/recipes/RecipeCard';
import RecipeDetailPage from './RecipeDetailPage';
import ComicCard from '../components/ui/ComicCard';
import { generateRecipes, saveFavorite } from '../services/api';
import { stagger } from '../animations/variants';

export default function RecipeResultsPage({ pantry, preferences, recipes, setRecipes, selectedRecipe, setSelectedRecipe, setPage }) {
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [visibleCount, setVisibleCount] = useState(() => Math.min(3, recipes.length));
  const carouselRef = useRef(null);
  const isAppendingRef = useRef(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const chefMessages = useMemo(
    () => recipes.map((recipe) => recipe.ai_message).filter(Boolean),
    [recipes],
  );

  // Sync visibleCount if the recipes list changes from outside (e.g. fresh generation)
  useEffect(() => {
    if (isAppendingRef.current) {
      isAppendingRef.current = false;
    } else {
      setVisibleCount(Math.min(3, recipes.length));
    }
  }, [recipes]);

  const updateScrollButtons = () => {
    if (carouselRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
      setCanScrollLeft(scrollLeft > 5);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 5);
    }
  };

  useEffect(() => {
    const el = carouselRef.current;
    if (el) {
      updateScrollButtons();
      el.addEventListener('scroll', updateScrollButtons);
      window.addEventListener('resize', updateScrollButtons);
      
      const timer = setTimeout(updateScrollButtons, 150);
      return () => {
        el.removeEventListener('scroll', updateScrollButtons);
        window.removeEventListener('resize', updateScrollButtons);
        clearTimeout(timer);
      };
    }
  }, [recipes, visibleCount, loadingMore]);

  const scrollLeft = () => {
    if (carouselRef.current) {
      const firstChild = carouselRef.current.firstElementChild;
      const cardWidth = firstChild ? firstChild.offsetWidth : 300;
      carouselRef.current.scrollBy({ left: -cardWidth - 24, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (carouselRef.current) {
      const firstChild = carouselRef.current.firstElementChild;
      const cardWidth = firstChild ? firstChild.offsetWidth : 300;
      carouselRef.current.scrollBy({ left: cardWidth + 24, behavior: 'smooth' });
    }
  };

  const revealMoreRecipes = () => {
    const nextCount = Math.min(visibleCount + 3, recipes.length);
    setVisibleCount(nextCount);

    // Scroll to reveal the newly rendered cards
    setTimeout(() => {
      if (carouselRef.current) {
        const firstChild = carouselRef.current.firstElementChild;
        const cardWidth = firstChild ? firstChild.offsetWidth : 300;
        carouselRef.current.scrollBy({ left: cardWidth + 24, behavior: 'smooth' });
      }
    }, 100);
  };

  const loadMoreRecipes = async () => {
    if (loadingMore) return;
    setLoadingMore(true);

    // Scroll to the end immediately to show the loading card
    setTimeout(() => {
      if (carouselRef.current) {
        carouselRef.current.scrollTo({
          left: carouselRef.current.scrollWidth,
          behavior: 'smooth',
        });
      }
    }, 50);

    try {
      const exclude_titles = recipes.map((r) => r.title);
      const data = await generateRecipes({ ingredients: pantry.ingredients, preferences, exclude_titles });
      if (data && data.recipes) {
        // Avoid duplicate titles
        const existingTitles = new Set(recipes.map((r) => r.title.toLowerCase()));
        let uniqueNew = data.recipes.filter((r) => !existingTitles.has(r.title.toLowerCase()));

        if (uniqueNew.length === 0) {
          // If all generated recipes are duplicates, append them with a suffix to make them distinct
          uniqueNew = data.recipes.map((r) => ({
            ...r,
            id: crypto.randomUUID ? crypto.randomUUID() : `${r.id}-${Date.now()}-${Math.random()}`,
            title: `${r.title} (Alternative)`,
          }));
        } else {
          uniqueNew = uniqueNew.map((r) => ({
            ...r,
            id: r.id || (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`),
          }));
        }

        const newTotalCount = recipes.length + uniqueNew.length;
        isAppendingRef.current = true;
        setRecipes((prev) => [...prev, ...uniqueNew]);
        setVisibleCount((prev) => Math.min(prev + 3, newTotalCount));

        // Scroll dynamically to reveal the newly generated cards
        setTimeout(() => {
          if (carouselRef.current) {
            const firstChild = carouselRef.current.firstElementChild;
            const cardWidth = firstChild ? firstChild.offsetWidth : 300;
            carouselRef.current.scrollBy({ left: cardWidth + 24, behavior: 'smooth' });
          }
        }, 150);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleNextClick = () => {
    if (canScrollRight) {
      scrollRight();
    } else if (visibleCount < recipes.length) {
      revealMoreRecipes();
    } else {
      loadMoreRecipes();
    }
  };

  async function createRecipes() {
    setLoading(true);
    try {
      const data = await generateRecipes({ ingredients: pantry.ingredients, preferences });
      setRecipes(data.recipes);
      setVisibleCount(Math.min(3, data.recipes.length));
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

  const visibleRecipes = recipes.slice(0, visibleCount);

  return (
    <div className="space-y-6">
      <AiChef
        message={recipes.length ? 'Tap a card to open the cooking checklist.' : 'Ready when you are. I will use the pantry first.'}
        messages={chefMessages}
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-4xl sm:text-6xl text-tomato">Recipe Cards</h1>
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

      {recipes.length > 0 ? (
        <div className="relative group">
          {/* Recipes Carousel */}
          <motion.div
            ref={carouselRef}
            variants={stagger}
            initial="hidden"
            animate="show"
            className="flex gap-6 overflow-x-auto scroll-smooth no-scrollbar snap-x snap-mandatory py-4 px-1"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {visibleRecipes.map((recipe) => (
              <div
                key={recipe.id}
                className="w-full md:w-[calc(50%-12px)] xl:w-[calc(33.333%-16px)] shrink-0 snap-start"
              >
                <RecipeCard
                  recipe={recipe}
                  pantry={pantry}
                  onFavorite={(eventRecipe) => favorite(eventRecipe)}
                  onOpen={() => setSelectedRecipe(recipe)}
                />
              </div>
            ))}
            {loadingMore && (
              <div className="w-full md:w-[calc(50%-12px)] xl:w-[calc(33.333%-16px)] shrink-0 snap-start">
                <ComicCard className="flex h-full flex-col justify-center items-center gap-4 bg-paper min-h-[300px]">
                  <Loader2 className="animate-spin text-tomato" size={48} strokeWidth={3} />
                  <p className="font-hand text-2xl text-cocoa">Cooking more ideas...</p>
                </ComicCard>
              </div>
            )}
          </motion.div>

          {/* Navigation Arrows */}
          <button
            onClick={scrollLeft}
            disabled={!canScrollLeft}
            className={`hidden md:flex absolute left-0 -translate-x-1/2 top-1/2 z-10 -translate-y-1/2 rounded-full border-3 border-ink p-3 shadow-sticker transition-all duration-200 items-center justify-center ${
              canScrollLeft
                ? 'bg-butter text-ink hover:bg-tomato hover:text-white cursor-pointer active:scale-95'
                : 'bg-paper text-ink/30 opacity-50 cursor-not-allowed pointer-events-none'
            }`}
            aria-label="Previous recipes"
          >
            <ChevronLeft size={24} strokeWidth={3} />
          </button>
          <button
            onClick={handleNextClick}
            disabled={loadingMore}
            className={`hidden md:flex absolute right-0 translate-x-1/2 top-1/2 z-10 -translate-y-1/2 rounded-full border-3 border-ink p-3 shadow-sticker transition-all duration-200 items-center justify-center bg-butter text-ink hover:bg-tomato hover:text-white ${
              loadingMore
                ? 'cursor-not-allowed opacity-80'
                : 'cursor-pointer active:scale-95'
            }`}
            aria-label="Next recipes"
          >
            {loadingMore ? (
              <Loader2 className="animate-spin" size={24} strokeWidth={3} />
            ) : (
              <ChevronRight size={24} strokeWidth={3} />
            )}
          </button>
        </div>
      ) : null}
    </div>
  );
}

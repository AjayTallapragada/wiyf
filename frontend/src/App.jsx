import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import PageShell from './components/layout/PageShell';
import WiyfLoadingScreen from './components/ui/WiyfLoadingScreen';
import FavoritesPage from './pages/FavoritesPage';
import LandingPage from './pages/LandingPage';
import MealPlannerPage from './pages/MealPlannerPage';
import PantryPage from './pages/PantryPage';
import PreferencesPage from './pages/PreferencesPage';
import RecipeResultsPage from './pages/RecipeResultsPage';
import ScanFridgePage from './pages/ScanFridgePage';

const BOOT_DURATION_MS = 3000;

export default function App() {
  const [page, setPage] = useState('home');
  const [pantry, setPantry] = useState({ ingredients: [] });
  const [preferences, setPreferences] = useState({
    diet: 'vegetarian',
    high_protein: false,
    low_oil: false,
    low_calorie: false,
    muscle_gain: false,
    weight_loss: false,
    cuisine: 'surprise me',
    cooking_time: 30,
    servings: 2,
    allergies: [],
  });
  const [recipes, setRecipes] = useState([]);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [bootLoaded, setBootLoaded] = useState(false);
  const [bootDelayElapsed, setBootDelayElapsed] = useState(false);
  // Global scan state so progress/result persist across page switches
  const [scanFile, setScanFile] = useState(null);
  const [scanPreview, setScanPreview] = useState('');
  const [scanProgress, setScanProgress] = useState(0);
  const [scanResult, setScanResult] = useState(null);
  const [scanError, setScanError] = useState('');
  const [scanLoading, setScanLoading] = useState(false);

  useEffect(() => {
    const finishLoad = () => setBootLoaded(true);

    if (document.readyState === 'complete') {
      finishLoad();
    } else {
      window.addEventListener('load', finishLoad, { once: true });
    }

    const delayId = window.setTimeout(() => setBootDelayElapsed(true), BOOT_DURATION_MS);

    return () => {
      window.removeEventListener('load', finishLoad);
      window.clearTimeout(delayId);
    };
  }, []);

  // Persist scan UI state to localStorage so it survives reloads and page switches
  useEffect(() => {
    try {
      const raw = localStorage.getItem('wiyf.scanState');
      if (raw) {
        const s = JSON.parse(raw);
        if (typeof s.scanProgress === 'number') setScanProgress(s.scanProgress);
        if (s.scanResult) setScanResult(s.scanResult);
        if (s.scanError) setScanError(s.scanError);
      }
    } catch (err) {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        'wiyf.scanState',
        JSON.stringify({ scanProgress, scanResult, scanError, scanLoading })
      );
    } catch (err) {
      // ignore
    }
  }, [scanProgress, scanResult, scanError, scanLoading]);

  // Parse shared recipe from URL path or query parameter on startup
  useEffect(() => {
    const checkSharedRecipe = async () => {
      // 1. Check path (e.g., /recipe/carrot-halwa-1234)
      const pathname = window.location.pathname;
      if (pathname.startsWith('/recipe/')) {
        const recipeId = pathname.substring(8);
        if (recipeId) {
          try {
            const { getSharedRecipe } = await import('./services/api');
            const recipe = await getSharedRecipe(recipeId);
            setSelectedRecipe(recipe);
            setPage('recipes');
            return;
          } catch (err) {
            console.warn('Failed to fetch shared recipe from backend:', err);
          }
        }
      }

      // 2. Fallback to query parameter
      try {
        const params = new URLSearchParams(window.location.search);
        const recipeParam = params.get('recipe');
        if (recipeParam) {
          const decodedJson = decodeURIComponent(escape(atob(recipeParam)));
          const recipe = JSON.parse(decodedJson);
          setSelectedRecipe(recipe);
          setPage('recipes');
        }
      } catch (err) {
        console.warn('Failed to parse recipe from URL query parameter:', err);
      }
    };

    checkSharedRecipe();
  }, []);

  // Clean up URL path and query parameters when selectedRecipe is cleared
  useEffect(() => {
    if (!selectedRecipe) {
      const pathname = window.location.pathname;
      const params = new URLSearchParams(window.location.search);
      if (pathname.startsWith('/recipe/') || params.has('recipe')) {
        window.history.replaceState({}, document.title, '/');
      }
    }
  }, [selectedRecipe]);

  const showBootScreen = !bootLoaded || !bootDelayElapsed;

  const context = {
    pantry,
    setPantry,
    preferences,
    setPreferences,
    recipes,
    setRecipes,
    selectedRecipe,
    setSelectedRecipe,
    setPage,
    // scan state
    scanFile,
    setScanFile,
    scanPreview,
    setScanPreview,
    scanProgress,
    setScanProgress,
    scanResult,
    setScanResult,
    scanError,
    setScanError,
    scanLoading,
    setScanLoading,
  };
  const pages = {
    home: <LandingPage {...context} />,
    scan: <ScanFridgePage {...context} />,
    pantry: <PantryPage {...context} />,
    preferences: <PreferencesPage {...context} />,
    recipes: <RecipeResultsPage {...context} />,
    favorites: <FavoritesPage {...context} />,
    planner: <MealPlannerPage {...context} />,
  };

  return (
    <>
      {showBootScreen ? (
        <AnimatePresence mode="wait">
          <WiyfLoadingScreen key="boot-screen" />
        </AnimatePresence>
      ) : (
        <PageShell page={page} setPage={setPage}>
          <AnimatePresence mode="wait">
            <motion.div
              key={page}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: 'easeInOut' }}
            >
              {pages[page] || pages.home}
            </motion.div>
          </AnimatePresence>
        </PageShell>
      )}
    </>
  );
}

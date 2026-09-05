import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import PageShell from './components/layout/PageShell';
import ToastStack from './components/ui/ToastStack';
import WiyfLoadingScreen from './components/ui/WiyfLoadingScreen';
import { AppStateContext } from './context/AppStateContext';
import FavoritesPage from './pages/FavoritesPage';
import CommunityPage from './pages/CommunityPage';
import LandingPage from './pages/LandingPage';
import MealPlannerPage from './pages/MealPlannerPage';
import PantryPage from './pages/PantryPage';
import PreferencesPage from './pages/PreferencesPage';
import RecipeDetailRoutePage from './pages/RecipeDetailRoutePage';
import RecipeResultsPage from './pages/RecipeResultsPage';
import ScanFridgePage from './pages/ScanFridgePage';
import SwiperPage from './pages/SwiperPage';
const BOOT_DURATION_MS = 3000;

function AppLayout() {
  const location = useLocation();

  return (
    <PageShell>
      <AnimatePresence mode="wait">
        <Outlet key={location.pathname} />
      </AnimatePresence>
    </PageShell>
  );
}

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
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
  const [swiperRecipes, setSwiperRecipes] = useState([]);
  const [swiperIndex, setSwiperIndex] = useState(0);
  const [bootLoaded, setBootLoaded] = useState(false);
  const [bootDelayElapsed, setBootDelayElapsed] = useState(false);
  const [scanFile, setScanFile] = useState(null);
  const [scanPreview, setScanPreview] = useState('');
  const [scanProgress, setScanProgress] = useState(0);
  const [scanResult, setScanResult] = useState(null);
  const [scanError, setScanError] = useState('');
  const [scanLoading, setScanLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);

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
        JSON.stringify({ scanProgress, scanResult, scanError, scanLoading }),
      );
    } catch (err) {
      // ignore
    }
  }, [scanProgress, scanResult, scanError, scanLoading]);

  useEffect(() => {
    const checkSharedRecipe = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const recipeParam = params.get('recipe');
        if (recipeParam) {
          const decodedJson = decodeURIComponent(escape(atob(recipeParam)));
          const recipe = JSON.parse(decodedJson);
          setSelectedRecipe(recipe);
          navigate(`/recipe/${recipe.id}`, { replace: true });
        }
      } catch (err) {
        console.warn('Failed to parse recipe from URL query parameter:', err);
      }
    };

    checkSharedRecipe();
  }, [location.pathname, navigate]);

  function showNotification(message, tone = 'success') {
    const id = `${Date.now()}-${Math.random()}`;
    setNotifications((current) => [...current, { id, message, tone }]);
    window.setTimeout(() => {
      setNotifications((current) => current.filter((item) => item.id !== id));
    }, 2500);
  }

  function setPage(page) {
    const routes = {
      home: '/',
      scan: '/scan',
      pantry: '/pantry',
      preferences: '/preferences',
      recipes: '/recipes',
      favorites: '/favorites',
      planner: '/planner',
      swiper: '/swiper',
      community: '/community',
    };

    navigate(routes[page] || '/');
  }

  const contextValue = useMemo(
    () => ({
      pantry,
      setPantry,
      preferences,
      setPreferences,
      recipes,
      setRecipes,
      selectedRecipe,
      setSelectedRecipe,
      swiperRecipes,
      setSwiperRecipes,
      swiperIndex,
      setSwiperIndex,
      setPage,
      showNotification,
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
    }),
    [
      pantry,
      preferences,
      recipes,
      selectedRecipe,
      swiperRecipes,
      swiperIndex,
      scanFile,
      scanPreview,
      scanProgress,
      scanResult,
      scanError,
      scanLoading,
    ],
  );

  const showBootScreen = !bootLoaded || !bootDelayElapsed;

  if (showBootScreen) {
    return (
      <AnimatePresence mode="wait">
        <WiyfLoadingScreen key="boot-screen" />
      </AnimatePresence>
    );
  }

  return (
    <AppStateContext.Provider value={contextValue}>
      <ToastStack notifications={notifications} />
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/scan" element={<ScanFridgePage />} />
          <Route path="/pantry" element={<PantryPage />} />
          <Route path="/preferences" element={<PreferencesPage />} />
          <Route path="/recipes" element={<RecipeResultsPage />} />
          <Route path="/favorites" element={<FavoritesPage />} />
          <Route path="/planner" element={<MealPlannerPage />} />
          <Route path="/swiper" element={<SwiperPage />} />
          <Route path="/community" element={<CommunityPage />} />
          <Route path="/recipe/:id" element={<RecipeDetailRoutePage />} />
        </Route>
      </Routes>
    </AppStateContext.Provider>
  );
}

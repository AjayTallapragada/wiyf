import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import AiChef from '../components/ai/AiChef';
import RecipeDetails from '../components/swiper/RecipeDetails';
import { useAppState } from '../context/AppStateContext';
import { getSharedRecipe, saveFavorite } from '../services/api';

export default function RecipeDetailRoutePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { id } = useParams();
  const { pantry, selectedRecipe, setSelectedRecipe, swiperRecipes, showNotification } = useAppState();
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const routeRecipe = location.state?.recipe;
  const stackRecipe = swiperRecipes.find((recipe) => recipe.id === id);
  const recipe = routeRecipe || stackRecipe || (selectedRecipe?.id === id ? selectedRecipe : null);

  useEffect(() => {
    if (recipe || !id) return;

    setLoading(true);
    setNotFound(false);
    getSharedRecipe(id)
      .then((data) => setSelectedRecipe(data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id, recipe, setSelectedRecipe]);

  async function handleFavorite(nextRecipe) {
    await saveFavorite(nextRecipe);
    showNotification(`${nextRecipe.title} added to favorites.`, 'success');
  }

  if (loading || (!recipe && !selectedRecipe && !notFound)) {
    return <AiChef message="Looking for that recipe..." />;
  }

  if (notFound && !recipe && !selectedRecipe) {
    return <AiChef message="That recipe could not be found. Heading back to the swiper works best here." />;
  }

  return (
    <RecipeDetails
      recipe={recipe || selectedRecipe}
      pantry={pantry}
      onFavorite={handleFavorite}
      onBack={() => {
        if (location.state?.from) {
          navigate(location.state.from);
          return;
        }

        navigate('/swiper');
      }}
    />
  );
}

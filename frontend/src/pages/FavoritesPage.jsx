import { Heart, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import AiChef from '../components/ai/AiChef';
import ComicButton from '../components/ui/ComicButton';
import RecipeCard from '../components/recipes/RecipeCard';
import { getFavorites, removeFavorite, saveFavorite } from '../services/api';

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState([]);

  useEffect(() => {
    getFavorites().then(setFavorites).catch(() => {});
  }, []);

  async function remove(id) {
    setFavorites(await removeFavorite(id));
  }

  return (
    <div className="space-y-6">
      <AiChef message="Saved recipes live here for repeat dinner victories." />
      <h1 className="font-display text-6xl text-tomato">Favorites</h1>
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {favorites.map((favorite) => (
          <div key={favorite.recipe.id} className="space-y-3">
            <RecipeCard recipe={favorite.recipe} onFavorite={(recipe) => saveFavorite(recipe)} />
            <ComicButton variant="paper" icon={Trash2} className="w-full" onClick={() => remove(favorite.recipe.id)}>Remove</ComicButton>
          </div>
        ))}
      </div>
      {!favorites.length ? (
        <div className="rounded-[28px] border-3 border-dashed border-ink bg-paper p-8 text-center font-hand text-3xl">
          <Heart className="mx-auto mb-3" size={58} />
          No favorites yet.
        </div>
      ) : null}
    </div>
  );
}

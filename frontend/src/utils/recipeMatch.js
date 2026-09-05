function normalizeIngredient(name = '') {
  return name.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

export function getRecipeIngredients(recipe) {
  if (!recipe) return [];
  if (recipe.ingredients?.length) {
    return recipe.ingredients.map((item) => item.name);
  }

  return recipe.ingredients_used || [];
}

export function getRecipeMatch(recipe, pantry) {
  if (!recipe) {
    return {
      percentage: 0,
      available: [],
      missing: [],
      total: 0,
    };
  }
  const pantryNames = (pantry?.ingredients || []).map((item) => normalizeIngredient(item.name)).filter(Boolean);
  const recipeNames = [...new Set(getRecipeIngredients(recipe).map(normalizeIngredient).filter(Boolean))];
  const explicitMissing = [...new Set((recipe.missing_ingredients || []).map(normalizeIngredient).filter(Boolean))];
  const available = recipeNames.filter((name) => pantryNames.some((pantryName) => pantryName.includes(name) || name.includes(pantryName)));
  const missing = explicitMissing.length ? explicitMissing : recipeNames.filter((name) => !available.includes(name));
  const total = Math.max(recipeNames.length, available.length + missing.length);
  const percentage = total ? Math.round((available.length / total) * 100) : 0;

  return {
    percentage,
    available,
    missing,
    total,
  };
}

export function formatIngredientLabel(value = '') {
  return value
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

import { Clock, Flame, Heart, Salad, Share2, Sparkles, Copy, Mail, MessageCircle, Send } from 'lucide-react';
import { motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import ComicButton from '../ui/ComicButton';
import ComicCard from '../ui/ComicCard';

function normalizeIngredient(name = '') {
  return name.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function getMatchSummary(recipe, pantry) {
  const pantryNames = new Set((pantry?.ingredients || []).map((item) => normalizeIngredient(item.name)).filter(Boolean));
  const recipeNames = (recipe.ingredients?.length ? recipe.ingredients.map((item) => item.name) : recipe.ingredients_used || [])
    .map(normalizeIngredient)
    .filter(Boolean);
  const uniqueRecipeNames = [...new Set(recipeNames)];
  const missingNames = [...new Set((recipe.missing_ingredients || []).map(normalizeIngredient).filter(Boolean))];
  const matchedNames = uniqueRecipeNames.filter((name) => (
    pantryNames.has(name) || [...pantryNames].some((pantryName) => pantryName.includes(name) || name.includes(pantryName))
  ));
  const total = Math.max(uniqueRecipeNames.length, matchedNames.length + missingNames.length);
  const needed = missingNames.length ? missingNames : uniqueRecipeNames.filter((name) => !matchedNames.includes(name));

  return {
    matched: matchedNames.length,
    total,
    needed: needed.slice(0, 4),
  };
}

export default function RecipeCard({ recipe, pantry, onFavorite, onOpen }) {
  const [shareOpen, setShareOpen] = useState(false);
  const [showSteps, setShowSteps] = useState(false);
  const [copyState, setCopyState] = useState('Copy URL');
  const shareUrl = window.location.href;
  const match = useMemo(() => getMatchSummary(recipe, pantry), [recipe, pantry]);
  const aiMessage = (recipe.ai_message || '').toString();
  const visibleAiMessage = (aiMessage && !/mealdb/i.test(aiMessage) && !/fetched/i.test(aiMessage)) ? aiMessage : '';

  const shareTargets = useMemo(() => ([
    {
      label: 'WhatsApp',
      icon: MessageCircle,
      href: `https://wa.me/?text=${encodeURIComponent(shareUrl)}`,
    },
    {
      label: 'Telegram',
      icon: Send,
      href: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}`,
    },
    {
      label: 'SMS',
      icon: MessageCircle,
      href: `sms:?&body=${encodeURIComponent(shareUrl)}`,
    },
    {
      label: 'Email',
      icon: Mail,
      href: `mailto:?subject=${encodeURIComponent(`Recipe: ${recipe.title}`)}&body=${encodeURIComponent(shareUrl)}`,
    },
  ]), [recipe.title, shareUrl]);

  async function copyShareUrl(event) {
    event.stopPropagation();
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopyState('Copied');
      window.setTimeout(() => setCopyState('Copy URL'), 1800);
    } catch (error) {
      setCopyState('Copy failed');
      window.setTimeout(() => setCopyState('Copy URL'), 1800);
    }
  }
  return (
    <ComicCard
      className={`flex h-full flex-col gap-4 bg-paper ${onOpen ? 'cursor-pointer' : ''}`}
      as={motion.article}
      onClick={(event) => {
        setShowSteps((s) => !s);
        if (onOpen) onOpen(event);
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-4xl leading-none tracking-normal text-tomato">{recipe.title}</h3>
          <p className="mt-2 font-hand text-xl leading-snug">{recipe.description}</p>
        </div>
        <motion.div animate={{ rotate: [0, 8, -8, 0] }} transition={{ repeat: Infinity, duration: 4 }} className="rounded-full border-2 border-ink bg-butter p-2">
          <Sparkles size={22} />
        </motion.div>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center font-doodle">
        <span className="rounded-xl border-2 border-ink bg-cream p-2"><Clock className="mx-auto" size={18} />{recipe.cooking_time}m</span>
        <span className="rounded-xl border-2 border-ink bg-cream p-2"><Flame className="mx-auto" size={18} />{recipe.calories}</span>
        <span className="rounded-xl border-2 border-ink bg-cream p-2"><Salad className="mx-auto" size={18} />{recipe.protein}g</span>
      </div>
      {match.total ? (
        <div className="rounded-2xl border-3 border-ink bg-butter/70 p-3 shadow-sticker">
          <p className="font-doodle text-lg font-bold text-cocoa">You have {match.matched}/{match.total} ingredients</p>
          <p className="font-hand text-xl leading-snug text-ink">
            {match.needed.length ? `Need only ${match.needed.join(', ')}` : 'Ready from your pantry'}
          </p>
        </div>
      ) : null}
      <div>
        <p className="font-doodle text-lg font-bold">Uses</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {recipe.ingredients_used.map((item) => (
            <span key={item} className="rounded-full border-2 border-leaf bg-leaf/10 px-3 py-1 font-hand text-lg text-leaf">{item}</span>
          ))}
        </div>
      </div>
      {recipe.missing_ingredients.length ? (
        <div>
          <p className="font-doodle text-lg font-bold">Missing</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {recipe.missing_ingredients.map((item) => (
              <span key={item} className="rounded-full border-2 border-tomato bg-tomato/10 px-3 py-1 font-hand text-lg text-tomato">{item}</span>
            ))}
          </div>
        </div>
      ) : null}
      {showSteps ? (
        <ol className="space-y-2 font-body text-sm leading-relaxed">
          {recipe.instructions.map((step, index) => (
            <li key={step} className="flex gap-2">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 border-ink bg-butter font-bold">{index + 1}</span>
              {step}
            </li>
          ))}
        </ol>
      ) : null}
      <div className="mt-auto flex flex-col gap-3">
        <div className="flex items-center justify-end gap-2">
          <ComicButton
            variant={shareOpen ? 'yellow' : 'paper'}
            icon={Share2}
            onClick={(event) => {
              event.stopPropagation();
              setShareOpen((open) => !open);
            }}
            className="min-h-10 px-3 py-2 text-base"
          >
            {shareOpen ? 'Close' : 'Share'}
          </ComicButton>
          <ComicButton
            variant="yellow"
            icon={Heart}
            onClick={(event) => {
              event.stopPropagation();
              onFavorite(recipe);
            }}
            className="min-h-10 px-3 py-2 text-base"
          >
            Save
          </ComicButton>
        </div>

        {shareOpen ? (
          <div
            className="rounded-2xl border-3 border-ink bg-cream p-3 shadow-sticker flex flex-col gap-2 mt-2"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <span className="font-doodle text-base font-bold text-cocoa">Share to</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {shareTargets.map((target) => {
                const Icon = target.icon;
                return (
                  <a
                    key={target.label}
                    href={target.href}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 rounded-xl border-2 border-ink bg-paper px-2 py-1.5 font-hand text-lg shadow-sticker transition hover:-translate-y-0.5 hover:bg-butter"
                  >
                    <Icon size={18} />
                    {target.label}
                  </a>
                );
              })}
              <button
                type="button"
                onClick={copyShareUrl}
                className="col-span-2 flex items-center justify-center gap-2 rounded-xl border-2 border-ink bg-butter px-3 py-1.5 font-hand text-lg shadow-sticker transition hover:-translate-y-0.5 hover:bg-tomato hover:text-white"
              >
                <Copy size={18} />
                {copyState}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </ComicCard>
  );
}

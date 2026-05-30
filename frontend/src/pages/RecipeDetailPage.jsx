import { ArrowLeft, CheckCircle2, ChevronLeft, ChevronRight, Heart, ListChecks, Pause, Play, RotateCcw, Timer, Mail, MessageCircle, Copy, Share2, Send } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import ComicButton from '../components/ui/ComicButton';
import ComicCard from '../components/ui/ComicCard';
import AiChef from '../components/ai/AiChef';

export default function RecipeDetailPage({ recipe, onBack, onFavorite }) {
  const [shareOpen, setShareOpen] = useState(false);
  const [copyState, setCopyState] = useState('Copy URL');
  const checklist = useMemo(() => {
    const fromFullList = recipe.ingredients?.map((item) => ({
      key: `${item.name}-${item.quantity}`,
      label: item.quantity ? `${item.quantity} ${item.name}` : item.name,
    })) || [];
    if (fromFullList.length) return fromFullList;
    return recipe.ingredients_used.map((name) => ({ key: name, label: name }));
  }, [recipe]);
  const [checked, setChecked] = useState({});
  const [currentStep, setCurrentStep] = useState(0);
  const [timerSeconds, setTimerSeconds] = useState(() => (recipe.cooking_time || 0) * 60);
  const [timerRunning, setTimerRunning] = useState(false);
  const [customMinutes, setCustomMinutes] = useState('');
  const completed = checklist.filter((item) => checked[item.key]).length;
  const totalSteps = recipe.instructions.length;
  const activeInstruction = recipe.instructions[currentStep] || 'Review the recipe, prep your ingredients, then start cooking.';
  const timerLabel = `${String(Math.floor(timerSeconds / 60)).padStart(2, '0')}:${String(timerSeconds % 60).padStart(2, '0')}`;

  useEffect(() => {
    if (!timerRunning || timerSeconds <= 0) return undefined;
    const id = window.setInterval(() => {
      setTimerSeconds((seconds) => {
        if (seconds <= 1) {
          setTimerRunning(false);
          return 0;
        }
        return seconds - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [timerRunning, timerSeconds]);

  function addTimer(minutes) {
    if (!minutes || minutes <= 0) return;
    setTimerSeconds((seconds) => seconds + Math.round(minutes * 60));
    setTimerRunning(true);
  }

  function addCustomTimer() {
    const minutes = Number(customMinutes);
    addTimer(minutes);
    if (minutes > 0) setCustomMinutes('');
  }

  const [sharedId, setSharedId] = useState(null);

  useEffect(() => {
    import('../services/api').then(({ shareRecipe }) => {
      shareRecipe(recipe)
        .then((res) => setSharedId(res.id))
        .catch((err) => console.warn('Failed to pre-register recipe for sharing:', err));
    });
  }, [recipe]);

  const shareUrl = useMemo(() => {
    if (sharedId) {
      return `${window.location.origin}/recipe/${sharedId}`;
    }
    try {
      const recipeJson = JSON.stringify(recipe);
      const encoded = btoa(unescape(encodeURIComponent(recipeJson)));
      return `${window.location.origin}/?recipe=${encoded}`;
    } catch (e) {
      return window.location.href;
    }
  }, [recipe, sharedId]);

  const shareTargets = [
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
  ];

  async function copyShareUrl() {
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
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ComicButton variant="paper" icon={ArrowLeft} onClick={onBack}>Back</ComicButton>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <ComicButton variant="paper" icon={Share2} onClick={() => setShareOpen((open) => !open)}>
              Share
            </ComicButton>
            {shareOpen ? (
              <div className="absolute right-0 top-full z-20 mt-3 w-72 rounded-[1.5rem] border-3 border-ink bg-paper p-3 shadow-sticker">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="font-doodle text-lg font-bold text-cocoa">Share this recipe</p>
                  <button
                    type="button"
                    onClick={() => setShareOpen(false)}
                    className="rounded-full border-2 border-ink bg-cream px-2 py-1 font-doodle text-sm font-bold"
                  >
                    Close
                  </button>
                </div>
                <div className="grid gap-2">
                  {shareTargets.map((target) => {
                    const Icon = target.icon;
                    return (
                      <a
                        key={target.label}
                        href={target.href}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-3 rounded-2xl border-2 border-ink bg-cream px-3 py-2 font-hand text-lg shadow-sticker transition hover:-translate-y-0.5"
                      >
                        <Icon size={20} />
                        {target.label}
                      </a>
                    );
                  })}
                  <button
                    type="button"
                    onClick={copyShareUrl}
                    className="flex items-center gap-3 rounded-2xl border-2 border-ink bg-butter px-3 py-2 font-hand text-lg shadow-sticker transition hover:-translate-y-0.5"
                  >
                    <Copy size={20} />
                    {copyState}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
          <ComicButton variant="yellow" icon={Heart} onClick={() => onFavorite(recipe)}>Save</ComicButton>
        </div>
      </div>
      <AiChef message={completed === checklist.length ? 'Cook mode is ready. Move step by step and use timers as needed.' : 'Check ingredients as you prep, then cook one step at a time.'} />
      <ComicCard className="bg-cream">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl sm:text-6xl leading-none text-tomato">{recipe.title}</h1>
            <p className="mt-2 max-w-2xl font-hand text-2xl text-cocoa">{recipe.description}</p>
          </div>
          <div className="rounded-2xl border-3 border-ink bg-paper px-4 py-3 text-center font-doodle shadow-sticker">
            <div className="text-2xl font-bold">{recipe.cooking_time} min</div>
            <div>{recipe.calories} cal | {recipe.protein}g protein</div>
          </div>
        </div>
      </ComicCard>
      <div className="grid gap-6 lg:grid-cols-[.85fr_1.15fr]">
        <ComicCard>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-display text-4xl sm:text-5xl text-leaf">Checklist</h2>
            <span className="rounded-full border-2 border-ink bg-butter px-3 py-1 font-doodle font-bold">{completed}/{checklist.length}</span>
          </div>
          <div className="space-y-3">
            {checklist.map((item) => (
              <label key={item.key} className={`flex cursor-pointer items-center gap-3 rounded-2xl border-3 border-ink px-4 py-3 font-hand text-xl sm:text-2xl shadow-sticker transition ${checked[item.key] ? 'bg-leaf/20 text-cocoa' : 'bg-paper'}`}>
                <input
                  type="checkbox"
                  className="h-6 w-6 accent-leaf"
                  checked={Boolean(checked[item.key])}
                  onChange={(event) => setChecked({ ...checked, [item.key]: event.target.checked })}
                />
                <span className={checked[item.key] ? 'line-through decoration-4 decoration-tomato' : ''}>{item.label}</span>
              </label>
            ))}
          </div>
          {recipe.missing_ingredients?.length ? (
            <div className="mt-5 rounded-2xl border-3 border-tomato bg-tomato/10 p-4">
              <p className="font-doodle text-lg font-bold text-tomato">Missing ingredients</p>
              <p className="font-hand text-xl">{recipe.missing_ingredients.join(', ')}</p>
            </div>
          ) : null}
        </ComicCard>
        <ComicCard>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
            <ListChecks size={34} />
              <h2 className="font-display text-4xl sm:text-5xl text-tomato">Cook Mode</h2>
            </div>
            <span className="rounded-full border-2 border-ink bg-butter px-3 py-1 font-doodle font-bold">Step {Math.min(currentStep + 1, totalSteps)}/{totalSteps}</span>
          </div>
          <div className="rounded-3xl border-3 border-ink bg-paper p-5 shadow-sticker">
            <p className="font-doodle text-lg font-bold uppercase text-cocoa">Current step</p>
            <p className="mt-2 font-hand text-2xl sm:text-3xl leading-snug">{activeInstruction}</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <ComicButton
                variant="paper"
                icon={ChevronLeft}
                disabled={currentStep === 0}
                onClick={() => setCurrentStep((step) => Math.max(0, step - 1))}
              >
                Previous
              </ComicButton>
              <ComicButton
                icon={ChevronRight}
                disabled={currentStep >= totalSteps - 1}
                onClick={() => setCurrentStep((step) => Math.min(totalSteps - 1, step + 1))}
              >
                Next Step
              </ComicButton>
            </div>
          </div>

          <div className="mt-5 rounded-3xl border-3 border-ink bg-cream p-5 shadow-sticker">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Timer size={28} />
                <h3 className="font-display text-4xl text-leaf">Timer</h3>
              </div>
              <span className="rounded-2xl border-3 border-ink bg-paper px-4 py-2 font-doodle text-3xl font-bold">{timerLabel}</span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {[5, 10, 15].map((minutes) => (
                <ComicButton key={minutes} variant="yellow" className="min-h-11 px-3 py-2 text-base" onClick={() => addTimer(minutes)}>
                  {minutes} min
                </ComicButton>
              ))}
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
              <label className="flex items-center gap-2 rounded-2xl border-3 border-ink bg-paper px-3 py-2 shadow-sticker">
                <span className="font-doodle text-base font-bold text-cocoa">Custom</span>
                <input
                  type="number"
                  min="1"
                  max="180"
                  step="1"
                  value={customMinutes}
                  onChange={(event) => setCustomMinutes(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') addCustomTimer();
                  }}
                  className="min-w-0 flex-1 bg-transparent text-right font-doodle text-2xl font-bold outline-none"
                  placeholder="min"
                />
              </label>
              <ComicButton variant="yellow" className="min-h-11 px-3 py-2 text-base" onClick={addCustomTimer}>
                Add Time
              </ComicButton>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <ComicButton
                variant="green"
                icon={timerRunning ? Pause : Play}
                disabled={timerSeconds === 0}
                className="min-h-11 px-3 py-2 text-base"
                onClick={() => setTimerRunning((running) => !running)}
              >
                {timerRunning ? 'Pause' : 'Start'}
              </ComicButton>
              <ComicButton
                variant="paper"
                icon={RotateCcw}
                className="min-h-11 px-3 py-2 text-base"
                onClick={() => {
                  setTimerRunning(false);
                  setTimerSeconds(0);
                }}
              >
                Reset
              </ComicButton>
            </div>
          </div>

          <ol className="mt-5 space-y-4">
            {recipe.instructions.map((step, index) => (
              <li key={`${index}-${step}`} className={`flex gap-4 rounded-2xl border-3 border-ink p-4 shadow-sticker transition ${index === currentStep ? 'bg-butter' : 'bg-paper'}`}>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-3 border-ink bg-butter font-display text-3xl">{index + 1}</span>
                <span className="font-hand text-xl sm:text-2xl leading-snug">{step}</span>
              </li>
            ))}
          </ol>
          {completed === checklist.length ? (
            <div className="mt-5 flex items-center gap-3 rounded-2xl border-3 border-leaf bg-leaf/15 p-4 font-hand text-2xl text-leaf">
              <CheckCircle2 />
              Ready to cook.
            </div>
          ) : null}
        </ComicCard>
      </div>
    </div>
  );
}

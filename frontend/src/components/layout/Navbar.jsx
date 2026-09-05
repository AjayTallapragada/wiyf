import { CalendarDays, Camera, Heart, Home, ListChecks, MessageCircle, Sparkles, Utensils } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useAppState } from '../../context/AppStateContext';

const links = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'scan', label: 'Scan', icon: Camera },
  { id: 'pantry', label: 'Pantry', icon: ListChecks },
  { id: 'recipes', label: 'Recipes', icon: Utensils },
  { id: 'swiper', label: 'Swiper', icon: Sparkles },
  { id: 'favorites', label: 'Faves', icon: Heart },
  { id: 'planner', label: 'Planner', icon: CalendarDays },
  { id: 'community', label: 'Community', icon: MessageCircle },
];

export default function Navbar() {
  const location = useLocation();
  const { setPage } = useAppState();
  const pathToPage = {
    '/': 'home',
    '/scan': 'scan',
    '/pantry': 'pantry',
    '/preferences': 'preferences',
    '/recipes': 'recipes',
    '/favorites': 'favorites',
    '/planner': 'planner',
    '/swiper': 'swiper',
    '/community': 'community',
  };
  const page = location.pathname.startsWith('/recipe/') ? 'swiper' : (pathToPage[location.pathname] || 'home');

  return (
    <nav className="sticky top-0 z-30 border-b-3 border-ink bg-cream/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <button className="flex items-center gap-2 text-left" onClick={() => setPage('home')}>
          <span className="rounded-full border-3 border-ink bg-butter px-3 py-1 font-display text-3xl shadow-sticker">WIYF?</span>
        </button>
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
          {links.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setPage(id)}
              className={`flex min-w-12 items-center justify-center gap-2 rounded-full border-2 border-ink px-3 py-2 font-hand text-lg transition ${
                page === id ? 'bg-tomato text-white shadow-sticker' : 'bg-paper'
              }`}
              aria-label={label}
              title={label}
            >
              <Icon size={18} strokeWidth={3} />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}

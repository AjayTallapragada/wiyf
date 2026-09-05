import { ThumbsDown, ThumbsUp } from 'lucide-react';
import ComicButton from '../ui/ComicButton';

export default function SwipeButtons({ disabled, onDislike, onLike }) {
  return (
    <div className="flex items-center justify-center gap-3">
      <ComicButton variant="paper" icon={ThumbsDown} disabled={disabled} className="min-w-36" onClick={onDislike}>
        Dislike
      </ComicButton>
      <ComicButton variant="green" icon={ThumbsUp} disabled={disabled} className="min-w-36" onClick={onLike}>
        Like
      </ComicButton>
    </div>
  );
}

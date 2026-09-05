import { CheckCircle2, Info, TriangleAlert } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

const toneClasses = {
  success: 'border-leaf/40 bg-leaf text-white',
  info: 'border-butter/40 bg-butter text-ink',
  error: 'border-tomato/40 bg-tomato text-white',
};

const toneIcons = {
  success: CheckCircle2,
  info: Info,
  error: TriangleAlert,
};

export default function ToastStack({ notifications }) {
  return (
    <div className="pointer-events-none fixed right-4 top-20 z-50 flex w-[min(92vw,360px)] flex-col gap-3">
      <AnimatePresence>
        {notifications.map((notification) => {
          const Icon = toneIcons[notification.tone] || Info;

          return (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, x: 40, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.95 }}
              className={`pointer-events-auto rounded-[24px] border-3 border-ink p-4 shadow-sticker backdrop-blur ${toneClasses[notification.tone] || toneClasses.info}`}
            >
              <div className="flex items-start gap-3">
                <Icon size={22} strokeWidth={2.5} className="mt-0.5 shrink-0" />
                <p className="font-doodle text-base font-bold">{notification.message}</p>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

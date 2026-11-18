import { AnimatePresence, motion } from 'framer-motion';
import { UserPlus, UserMinus } from 'lucide-react';

export default function Toasts({ items }) {
  return (
    // This container is always on the page, so screen readers announce what appears inside it.
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-16 z-30 flex flex-col items-center gap-2 px-4"
    >
      <AnimatePresence>
        {items.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="flex items-center gap-2 rounded-xl border border-line bg-raised px-4 py-2 text-sm shadow-lg"
          >
            {t.kind === 'join' ? (
              <UserPlus size={16} className="text-accent" />
            ) : (
              <UserMinus size={16} className="text-muted" />
            )}
            {t.text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
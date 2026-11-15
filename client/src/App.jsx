import { motion } from 'framer-motion';

export default function App() {
  return (
    <main className="grid h-full place-items-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="rounded-2xl border border-line bg-panel p-8 text-center"
      >
        <h1 className="font-display text-3xl font-semibold">Collab Meet</h1>
        <p className="mt-2 text-muted">Tailwind and animations are working.</p>
        <button className="mt-6 rounded-xl bg-accent px-5 py-2.5 font-medium text-accent-ink transition hover:brightness-110 active:scale-95">
          Looks good
        </button>
      </motion.div>
    </main>
  );
}
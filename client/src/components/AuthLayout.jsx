import { motion } from 'framer-motion';

export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <main className="grid min-h-full place-items-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md rounded-2xl border border-line bg-panel p-8"
      >
        <div className="mb-3 flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-accent" />
          <span className="font-display text-sm text-muted">Collab Meet</span>
        </div>
        <h1 className="font-display text-2xl font-semibold">{title}</h1>
        <p className="mb-6 mt-1 text-muted">{subtitle}</p>
        {children}
        <p className="mt-6 text-center text-sm text-muted">{footer}</p>
      </motion.div>
    </main>
  );
}
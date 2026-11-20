import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Logo from './Logo';

const POINTS = [
  ['#5cc8ff', 'Up to six people on one call'],
  ['#ff9f43', 'A whiteboard everyone can draw on'],
  ['#4fe0c0', 'Screen sharing, chat and files'],
];

export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="paper grid min-h-full lg:grid-cols-[1fr_1.1fr]">
      <aside className="night hidden flex-col justify-between p-10 lg:flex">
        <Link to="/" aria-label="Collab Meet home"><Logo /></Link>
        <div>
          <h2 className="max-w-sm font-display text-4xl font-bold leading-[1.05] tracking-tight">
            Meetings with a whiteboard built in.
          </h2>
          <ul className="mt-8 space-y-3">
            {POINTS.map(([color, text]) => (
              <li key={text} className="flex items-center gap-3">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
                {text}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-sm text-muted">Video and audio are encrypted in transit.</p>
      </aside>

      <main className="grid place-items-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-sm"
        >
          <Link to="/" aria-label="Collab Meet home" className="mb-10 inline-block lg:hidden">
            <Logo />
          </Link>
          <h1 className="font-display text-3xl font-bold tracking-tight">{title}</h1>
          <p className="mb-8 mt-2 text-muted">{subtitle}</p>
          {children}
          <p className="mt-8 text-sm text-muted [&_a]:font-medium [&_a]:text-fg [&_a]:underline [&_a]:underline-offset-4">
            {footer}
          </p>
        </motion.div>
      </main>
    </div>
  );
}
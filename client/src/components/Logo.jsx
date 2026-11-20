export default function Logo({ size = 28, text = true, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
        <circle cx="11" cy="12" r="8" fill="#5cc8ff" />
        <circle cx="21" cy="12" r="8" fill="#ff8fd0" fillOpacity="0.85" />
        <circle cx="16" cy="21" r="8" fill="#ffd23f" fillOpacity="0.85" />
      </svg>
      {text && <span className="font-display text-lg font-bold tracking-tight">Collab Meet</span>}
    </span>
  );
}
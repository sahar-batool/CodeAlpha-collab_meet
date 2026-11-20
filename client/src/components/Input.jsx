export default function Input({ label, error, id, ...props }) {
  const inputId = id || props.name;
  return (
    <div className="space-y-1.5">
      <label htmlFor={inputId} className="text-sm font-medium">{label}</label>
      <input
        id={inputId}
        {...props}
        className={`w-full rounded-xl border bg-panel px-4 py-3 text-fg transition placeholder:text-muted/60 focus:border-fg focus:ring-4 focus:ring-fg/10 ${error ? 'border-danger' : 'border-line'}`}
      />
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
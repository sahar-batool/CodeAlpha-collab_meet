export default function Input({ label, error, id, ...props }) {
  const inputId = id || props.name;
  return (
    <div className="space-y-1.5">
      <label htmlFor={inputId} className="text-sm text-muted">{label}</label>
      <input
        id={inputId}
        {...props}
        className={`w-full rounded-xl border bg-raised px-3.5 py-2.5 text-fg placeholder:text-muted/60 transition focus:border-accent ${error ? 'border-danger' : 'border-line'}`}
      />
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
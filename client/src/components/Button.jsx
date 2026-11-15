const styles = {
  primary: 'bg-accent text-accent-ink hover:brightness-110',
  ghost: 'border border-line text-fg hover:bg-raised',
};

export default function Button({ children, loading = false, variant = 'primary', className = '', ...props }) {
  return (
    <button
      {...props}
      disabled={loading || props.disabled}
      className={`rounded-xl px-5 py-2.5 font-medium transition active:scale-95 disabled:opacity-60 disabled:active:scale-100 ${styles[variant]} ${className}`}
    >
      {loading ? 'Please wait…' : children}
    </button>
  );
}
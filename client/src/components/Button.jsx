import { Link } from 'react-router-dom';

const variants = {
  primary: 'bg-accent text-accent-ink hover:brightness-110',
  ghost: 'border border-line text-fg hover:bg-raised',
};
const sizes = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-5 py-2.5',
  lg: 'px-7 py-3.5 text-base',
};

// Pass `to` to get a link that looks like a button.
export default function Button({
  children, loading = false, variant = 'primary', size = 'md', className = '', to, ...props
}) {
  const cls = `inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium transition active:scale-95 disabled:opacity-60 disabled:active:scale-100 ${variants[variant]} ${sizes[size]} ${className}`;
  if (to) {
    return (
      <Link to={to} className={cls} {...props}>
        {children}
      </Link>
    );
  }
  return (
    <button {...props} disabled={loading || props.disabled} className={cls}>
      {loading ? 'Please wait…' : children}
    </button>
  );
}
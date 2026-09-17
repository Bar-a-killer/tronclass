export default function Field({ id, label, hint, error, suffix, trailing, className = '', ...inputProps }) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-slate-400">
        {label}
      </label>
      <div
        className={`flex items-center rounded-lg border bg-slate-950/60 transition focus-within:ring-2 ${
          error
            ? 'border-rose-500/60 focus-within:ring-rose-500/30'
            : 'border-slate-700 focus-within:border-sky-500 focus-within:ring-sky-500/20'
        }`}
      >
        <input
          id={id}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none"
          {...inputProps}
        />
        {suffix && <span className="pr-3 text-xs text-slate-500">{suffix}</span>}
        {trailing}
      </div>
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-xs text-rose-400">{error}</p>
      ) : (
        hint && <p id={`${id}-hint`} className="mt-1 text-xs text-slate-500">{hint}</p>
      )}
    </div>
  );
}

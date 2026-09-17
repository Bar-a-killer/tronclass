export default function Card({ title, icon: Icon, actions, children, className = '' }) {
  return (
    <section className={`rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl shadow-black/20 ${className}`}>
      <header className="flex items-center justify-between gap-3 border-b border-slate-800 px-5 py-3.5">
        <h2 className="flex items-center gap-2 text-sm font-semibold tracking-wide text-slate-200">
          {Icon && <Icon className="h-4 w-4 text-sky-400" />}
          {title}
        </h2>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </header>
      {children}
    </section>
  );
}

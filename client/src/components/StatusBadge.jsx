import { STATUS_STYLES } from '../utils/status.js';

export default function StatusBadge({ status, label }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.unknown;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${style.ring} ${style.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot} ${status === 'online' ? 'animate-pulse' : ''}`} />
      {label || style.label}
    </span>
  );
}

import { useEffect, useRef } from 'react';
import { Eraser, TerminalSquare } from 'lucide-react';
import Card from './Card.jsx';

const TYPE_STYLES = {
  error: 'text-rose-300',
  success: 'text-emerald-300',
  info: 'text-sky-300',
  default: 'text-slate-300',
};

const TYPE_MARKERS = {
  error: '✕',
  success: '✓',
  info: '›',
  default: ' ',
};

export default function ConsolePanel({ logs, onClear }) {
  const scrollRef = useRef(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [logs]);

  return (
    <Card
      title="活動紀錄"
      icon={TerminalSquare}
      actions={
        <button
          type="button"
          onClick={onClear}
          disabled={logs.length === 0}
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-slate-400 transition hover:bg-slate-800 hover:text-slate-200 disabled:opacity-40"
        >
          <Eraser className="h-3.5 w-3.5" />
          清除
        </button>
      }
    >
      <div
        ref={scrollRef}
        className="h-72 overflow-y-auto rounded-b-2xl bg-slate-950/80 px-4 py-3 font-mono text-xs leading-relaxed"
      >
        {logs.length === 0 ? (
          <p className="text-slate-600">尚無紀錄。操作程序或儲存設定後會顯示在這裡。</p>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="flex gap-3">
              <span className="shrink-0 text-slate-600">{log.time}</span>
              <span className={`shrink-0 ${TYPE_STYLES[log.type] || TYPE_STYLES.default}`}>
                {TYPE_MARKERS[log.type] || TYPE_MARKERS.default}
              </span>
              <pre className={`min-w-0 whitespace-pre-wrap break-words ${TYPE_STYLES[log.type] || TYPE_STYLES.default}`}>
                {log.message}
              </pre>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}

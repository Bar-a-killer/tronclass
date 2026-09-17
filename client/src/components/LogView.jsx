import { useEffect, useRef } from 'react';

// pm2 以 `time: true` 啟動,每行開頭是 ISO 時間戳
const TIMESTAMP = /^(\d{4}-\d{2}-\d{2}T[\d:.]+(?:Z|[+-]\d{2}:?\d{2})?):?\s?/;

function lineStyle(line) {
  if (/error|fail|失敗|錯誤|❌/i.test(line)) return 'text-rose-300';
  if (/warn|⚠️|異常/i.test(line)) return 'text-amber-300';
  if (/success|succeeded|成功|🎯/i.test(line)) return 'text-emerald-300';
  return 'text-slate-300';
}

export default function LogView({ text, emptyText = '尚無 log。', className = 'h-72', filter = '' }) {
  const scrollRef = useRef(null);
  const stickRef = useRef(true);

  useEffect(() => {
    const el = scrollRef.current;
    if (el && stickRef.current) el.scrollTop = el.scrollHeight;
  }, [text, filter]);

  const onScroll = () => {
    const el = scrollRef.current;
    stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
  };

  const needle = filter.trim().toLowerCase();
  const lines = text
    .split('\n')
    .filter((line) => line.trim() && (!needle || line.toLowerCase().includes(needle)))
    .slice(-2000);

  return (
    <div
      ref={scrollRef}
      onScroll={onScroll}
      className={`overflow-y-auto bg-slate-950/80 px-4 py-3 font-mono text-xs leading-relaxed ${className}`}
    >
      {lines.length === 0 ? (
        <p className="text-slate-600">{needle ? '沒有符合篩選的內容。' : emptyText}</p>
      ) : (
        lines.map((line, i) => {
          const match = line.match(TIMESTAMP);
          const time = match ? new Date(match[1]) : null;
          const body = match ? line.slice(match[0].length) : line;
          return (
            <div key={i} className="flex gap-3">
              {time && !Number.isNaN(time.getTime()) && (
                <span className="shrink-0 text-slate-600" title={time.toLocaleString('zh-TW', { hour12: false })}>
                  {time.toLocaleTimeString('zh-TW', { hour12: false })}
                </span>
              )}
              <pre className={`min-w-0 whitespace-pre-wrap break-words ${lineStyle(body)}`}>{body}</pre>
            </div>
          );
        })
      )}
    </div>
  );
}

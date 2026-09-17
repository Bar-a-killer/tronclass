import { isHourActive } from '../../utils/config.js';

const HOURS = Array.from({ length: 24 }, (_, h) => h);

export default function ScheduleBar({ start, stop }) {
  const valid = start !== stop;
  const activeHours = valid ? HOURS.filter((h) => isHourActive(h, start, stop)).length : 0;

  return (
    <div>
      <div className="flex gap-0.5" aria-hidden="true">
        {HOURS.map((h) => (
          <div
            key={h}
            title={`${h}:00`}
            className={`h-6 flex-1 first:rounded-l-md last:rounded-r-md ${
              valid && isHourActive(h, start, stop) ? 'bg-sky-500/80' : 'bg-slate-800'
            }`}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between font-mono text-[10px] text-slate-600">
        <span>0</span>
        <span>6</span>
        <span>12</span>
        <span>18</span>
        <span>24</span>
      </div>
      <p className="mt-2 text-xs text-slate-400">
        {valid
          ? `平日 ${start}:00 – ${stop}:00${start > stop ? '(跨夜)' : ''},每天運行 ${activeHours} 小時;週末自動暫停。`
          : '尚未設定有效的時段。'}
      </p>
    </div>
  );
}

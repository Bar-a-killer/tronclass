import { Radar } from 'lucide-react';
import StatusBadge from './StatusBadge.jsx';

const OVERALL_LABELS = {
  online: '機器人運行中',
  stopped: '機器人已暫停',
  errored: '程序發生錯誤',
  partial: '部分程序運行中',
  busy: '狀態切換中',
  missing: '機器人未啟動',
  unknown: '檢查狀態中',
};

export default function TopBar({ overall }) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-indigo-500 shadow-lg shadow-sky-500/20">
            <Radar className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-slate-100 sm:text-base">Tronclass 自動點名</h1>
            <p className="text-xs text-slate-500">控制面板</p>
          </div>
        </div>
        <StatusBadge status={overall} label={OVERALL_LABELS[overall]} />
      </div>
    </header>
  );
}

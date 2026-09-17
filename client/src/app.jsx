import { useMemo } from 'react';
import TopBar from './components/TopBar.jsx';
import ProcessPanel from './components/ProcessPanel.jsx';
import ConsolePanel from './components/ConsolePanel.jsx';
import ConfigEditor from './components/config/ConfigEditor.jsx';
import { useLogConsole } from './hooks/useLogConsole.js';
import { useAppConfig } from './hooks/useAppConfig.js';
import { useProcessControl } from './hooks/useProcessControl.js';
import { summarize } from './utils/status.js';

function App() {
  const { logs, addLog, clearLogs } = useLogConsole();
  const config = useAppConfig(addLog);
  const { pending, processes, checkedAt, run } = useProcessControl(addLog);
  const { overall, rows } = useMemo(() => summarize(processes), [processes]);

  return (
    <div className="min-h-screen bg-slate-950 bg-[radial-gradient(ellipse_at_top,rgba(56,189,248,0.08),transparent_60%)] text-slate-200 antialiased">
      <TopBar overall={overall} />
      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start">
        <div className="space-y-6 lg:sticky lg:top-20">
          <ProcessPanel
            pending={pending}
            rows={rows}
            known={processes !== null}
            checkedAt={checkedAt}
            onRun={run}
          />
          <ConsolePanel logs={logs} onClear={clearLogs} />
        </div>
        <ConfigEditor config={config} />
      </main>
    </div>
  );
}

export default App;

import BotPanel from '../components/BotPanel.jsx';
import ConsolePanel from '../components/ConsolePanel.jsx';
import ConfigEditor from '../components/config/ConfigEditor.jsx';

export default function Dashboard({ bot, statusKey, logConsole, config }) {
  return (
    <main className="mx-auto grid max-w-6xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start">
      <div className="space-y-6 lg:sticky lg:top-20">
        <BotPanel bot={bot.bot} statusKey={statusKey} pending={bot.pending} checkedAt={bot.checkedAt} onRun={bot.run} />
        <ConsolePanel logs={logConsole.logs} onClear={logConsole.clearLogs} />
      </div>
      <ConfigEditor config={config} />
    </main>
  );
}

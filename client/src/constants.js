export const PROCESSES = [
  { name: 'tronclass', label: '點名主程式' },
  { name: 'tronclass-scheduler', label: '排程器' },
];

export const NUMERIC_FIELDS = {
  tron: ['TRON_INTERVAL'],
  scheduler: ['START_HOUR', 'STOP_HOUR', 'CHECK_INTERVAL'],
};

export const EMPTY_CONFIG = {
  tron: { TRON_USER: '', TRON_PASS: '', TRON_BASE_URL: '', TRON_INTERVAL: 5000 },
  scheduler: { START_HOUR: 8, STOP_HOUR: 18, CHECK_INTERVAL: 15 },
  webhook: { webhook_url: '' },
};

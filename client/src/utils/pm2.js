const ANSI_PATTERN = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g');

export function stripAnsi(text) {
  return text.replace(ANSI_PATTERN, '');
}

// 解析 `pm2 list` 的表格輸出;格式無法辨識時回傳 null
export function parsePm2List(output) {
  const rows = stripAnsi(output)
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('│'));
  if (rows.length === 0) return null;

  const cells = (line) => line.split('│').slice(1, -1).map((cell) => cell.trim());
  const header = cells(rows[0]);
  const col = (key) => header.indexOf(key);
  const nameIdx = col('name');
  const statusIdx = col('status');
  if (nameIdx < 0 || statusIdx < 0) return null;

  return rows.slice(1).map((line) => {
    const c = cells(line);
    return {
      name: c[nameIdx],
      status: c[statusIdx],
      uptime: c[col('uptime')],
      restarts: c[col('↺')],
      cpu: c[col('cpu')],
      memory: c[col('mem')],
    };
  });
}

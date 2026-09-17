import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const MAINCODE_DIR = join(__dirname, '..');
export const ROOT_DIR = join(MAINCODE_DIR, '..');
export const CONFIG_FILE_PATH = join(MAINCODE_DIR, 'yamls', 'config.yaml');
export const DATA_DIR = process.env.TRONCLASS_DATA_DIR || join(MAINCODE_DIR, 'data');
export const USERS_FILE = join(DATA_DIR, 'users.json');
export const SECRET_FILE = join(DATA_DIR, 'secret.key');
export const AUDIT_FILE = join(DATA_DIR, 'audit.log');
export const BOT_SCRIPT = join(MAINCODE_DIR, 'bot.js');

// 每位使用者的點名程式都以自己的資料夾為工作目錄，log 與狀態檔互不干擾
export const userDir = (username) => join(DATA_DIR, 'users', username);
export const userLogFile = (username) => join(userDir(username), 'bot.log');
export const userStatusFile = (username) => join(userDir(username), 'status.json');

export const USERNAME_PATTERN = /^[a-z0-9_-]{3,32}$/;

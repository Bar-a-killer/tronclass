import React, { useState, useEffect, useCallback, memo, useRef } from 'react';
import { LogOut, Play, List, Trash2, Zap, Clock, Info, User, Settings, Globe, Code, ChevronDown, ChevronUp } from 'lucide-react'; 

// --- API 服務設定 ---
// ⚠️ 如果您在本地運行，請確保這個 URL 與您的 server.js 監聽的位址一致
const API_BASE_URL = 'http://localhost:3000'; 
// --- 全域變數定義 ---
const appId = 'local-app'; 

// PM2 腳本定義
const NPM_SCRIPTS = [
  { name: 'start', icon: Play, color: 'bg-green-500', command: 'npm run start' },
  { name: 'list', icon: List, color: 'bg-blue-500', command: 'npm run list' },
  { name: 'stop', icon: Clock, color: 'bg-yellow-500', command: 'npm run stop' },
  { name: 'delete', icon: Trash2, color: 'bg-red-500', command: 'npm run delete' },
];

// 預設的 YAML 設定 (已更新為巢狀 webhook 結構)
const DEFAULT_CONFIG = {
  tron: {
    TRON_USER: 'account123',
    TRON_PASS: '', 
    TRON_BASE_URL: 'https://tronclass.ntou.edu.tw',
    TRON_INTERVAL: 5000,
  },
  scheduler: {
    START_HOUR: 5,
    STOP_HOUR: 18,
    CHECK_INTERVAL: 15,
  },
  webhook: { // 修正為巢狀物件
        webhook_url: 'https://discordapp.com/api/webhooks/1111111111/AAAA',
    }
};

// ----------------------------------------

// ConfigInput 保持 memo 以優化渲染，但改用 defaultValue
const ConfigInput = memo(({ label, name, defaultValue, type = 'text', section, min, max, placeholder, isPassword = false }) => (
    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
      <label htmlFor={name} className="block text-sm font-medium text-gray-700">{label}</label>
      <input
        type={isPassword ? 'password' : type}
        id={name}
        // 關鍵：使用 name 屬性來構建 FormData API 可識別的鍵 (section-name 格式)
        name={`${section}-${name}`} 
        data-section={section}
        // 關鍵：使用 defaultValue 替代 value，切換為非受控元件
        defaultValue={defaultValue === "" && type === 'number' ? "" : defaultValue}
        min={min}
        max={max}
        placeholder={placeholder}
        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2"
      />
    </div>
));
ConfigInput.displayName = 'ConfigInput';


function App() {
  // 移除 Firebase 狀態
  const [loading, setLoading] = useState(true);
  const [appConfig, setAppConfig] = useState(DEFAULT_CONFIG); // 用於儲存後端載入的狀態
  const [logOutput, setLogOutput] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isConfigExpanded, setIsConfigExpanded] = useState(true); 
  
  // 關鍵：用於引用設定表單的 Ref
  const formRef = useRef(null); 
  
  // YAML 預覽狀態，現在只在儲存後更新
  const [yamlPreview, setYamlPreview] = useState(() => DEFAULT_CONFIG);

  const addLog = useCallback((message, type = 'default') => {
    setLogOutput(prev => {
      const timestamp = new Date().toLocaleTimeString();
      const newLog = { timestamp, message, type };
      return [newLog, ...prev].slice(0, 50); 
    });
  }, []);

  // 修正後的 jsonToYaml，強制使用單引號
  const jsonToYaml = useCallback((obj, indent = 0) => {
    let yamlString = '';
    const spacing = '  '.repeat(indent); 

    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];
        
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          yamlString += `${spacing}${key}:\n`;
          yamlString += jsonToYaml(value, indent + 1);
        } else {
          // 處理基本值 (字串或數字)
          let formattedValue = value;
          
          if (typeof value === 'string') {
            // 🚨 關鍵修正：對所有字串強制使用單引號
            formattedValue = `'${value}'`;
          }
          
          yamlString += `${spacing}${key}: ${formattedValue}\n`;
        }
      }
    }
    return yamlString;
  }, []);

  // 1. 初始載入設定檔 (從後端 API)
  const fetchConfig = useCallback(async () => {
    setLoading(true);
    addLog(`[System] 正在從後端 (${API_BASE_URL}) 載入設定檔...`, 'info');
    try {
        const response = await fetch(`${API_BASE_URL}/api/get-config`);
        if (!response.ok) throw new Error('API request failed');

        const result = await response.json();
        
        // 🚨 修正：確保 webhook 作為物件被載入
        const loadedConfig = {
          tron: { ...DEFAULT_CONFIG.tron, ...(result.data.tron || {}) },
          scheduler: { ...DEFAULT_CONFIG.scheduler, ...(result.data.scheduler || {}) },
          webhook: { ...DEFAULT_CONFIG.webhook, ...(result.data.webhook || {}) }, 
        };
        
        setAppConfig(loadedConfig); 
        setYamlPreview(loadedConfig);
        addLog(`[Config] 設定檔已從後端服務載入。`, 'success');

    } catch (error) {
        console.error("Fetch Config Error:", error);
        addLog(`[Error] 載入設定檔失敗: 請確認後端服務是否運行於 ${API_BASE_URL}。`, 'error');
        // 如果失敗，使用預設配置
        setAppConfig(DEFAULT_CONFIG);
        setYamlPreview(DEFAULT_CONFIG);
    } finally {
        setLoading(false);
    }
  }, [addLog]);

  useEffect(() => {
    fetchConfig(); 
  }, [fetchConfig]);


  // 4. 儲存設定到後端 API (取代 Firestore 邏輯)
  const saveConfigToBackend = useCallback(async (dataToSave, action) => {
    setIsSaving(true);
    addLog(`[System] 正在向後端發送儲存請求...`, 'info');
    try {
        const response = await fetch(`${API_BASE_URL}/api/save-config`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ config: dataToSave })
        });
        
        const result = await response.json();

        if (!response.ok) throw new Error(result.message || '儲存 API 錯誤');
        
        setAppConfig(dataToSave); 
        setYamlPreview(dataToSave); // 儲存成功後更新 YAML 預覽
        addLog(`[Config] ${action} - 儲存成功: ${result.message}`, 'success');
        return true;
    } catch (error) {
        console.error("Save Config Error:", error);
        addLog(`[Error] 儲存設定檔失敗: ${error.message}。請檢查後端日誌。`, 'error');
        return false;
    } finally {
      setIsSaving(false);
    }
  }, [addLog]); 

  
  // 5. 處理表單儲存 (取代動態輸入)
  const handleSaveConfig = useCallback(async (e) => {
    e.preventDefault();
    if (!formRef.current) return;

    const formData = new FormData(formRef.current);
    // 🚨 修正：初始化結構完全匹配 DEFAULT_CONFIG
    const newConfig = {
      tron: {},
      scheduler: {},
      webhook: {},
    };

    // 處理所有巢狀欄位
    for (const [key, value] of formData.entries()) {
        
        const parts = key.split('-');
        if (parts.length === 2) {
            const [section, name] = parts;
            
            let finalValue = value;
            
            // 嘗試將數字型欄位轉換回數字
            if (['TRON_INTERVAL', 'START_HOUR', 'STOP_HOUR', 'CHECK_INTERVAL'].includes(name)) {
              const parsed = parseInt(value, 10);
              // 如果是空白，則保留空白字串，否則使用解析後的數字
              finalValue = value === "" ? "" : parsed; 
            }
            
            // 確保巢狀物件存在並賦值
            newConfig[section][name] = finalValue;
        }
    }
    
    // 呼叫後端儲存函數
    await saveConfigToBackend(newConfig, '用戶點擊儲存');
  }, [saveConfigToBackend]);


  // 6. 處理 NPM 腳本執行 (從後端 API 獲取實際輸出)
  const handleRunScript = useCallback(async (script) => {
    addLog(`[NPM] 正在執行腳本: npm run ${script.name} (${script.command}) ...`, 'info');
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/run-script`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ scriptName: script.name })
        });
        
        const result = await response.json();
        const output = result.output || (result.message ? `[Error] ${result.message}` : '無輸出');

        if (result.status === 'error') {
            addLog(`[Error] ${script.name} 執行失敗:\n${output}`, 'error');
        } else {
            addLog(`[PM2] ${script.name} 腳本執行成功！`, 'success');
            addLog(output, 'default');
        }
        
    } catch (error) {
        console.error("Run Script Error:", error);
        addLog(`[Error] 無法連接後端服務或 API 錯誤: ${error.message}`, 'error');
    }
  }, [addLog]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        <p className="ml-4 text-indigo-600">應用程式載入中 (正在連接後端服務)...</p>
        </div>
    );
  }

  // ----------------------------------------------------
  //  通用可收合區塊元件
  // ----------------------------------------------------

  const CollapsibleSection = ({ title, icon: Icon, children }) => {
    
    const toggleCollapse = () => {
        setIsConfigExpanded(prev => !prev);
    };
    
    // 修正: 展開時才添加 padding
    return (
        <div className="border border-gray-200 rounded-lg overflow-hidden shadow-lg bg-white">
            <button 
                onClick={toggleCollapse}
                type="button" // 設置 type="button" 防止觸發表單提交
                className="w-full flex justify-between items-center p-4 bg-indigo-50 hover:bg-indigo-100 transition duration-150 focus:outline-none"
            >
                <h3 className="text-xl font-bold text-indigo-700 flex items-center">
                    {Icon && <Icon className="w-6 h-6 mr-3"/>}
                    {title}
                </h3>
                {isConfigExpanded ? 
                    <ChevronUp className="w-6 h-6 text-indigo-500" /> : 
                    <ChevronDown className="w-6 h-6 text-indigo-500" />
                }
            </button>
            {/* 展開時才添加 padding */}
            <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isConfigExpanded ? 'max-h-[1500px] p-6' : 'max-h-0'}`}>
                <div className="space-y-6">{children}</div>
            </div>
        </div>
    );
  };

  // 渲染所有設定的單一區塊
  const renderAllConfig = () => (
    // 關鍵：將所有設定包裝在 <form> 中，並添加 ref
    <form ref={formRef} onSubmit={handleSaveConfig} className="w-full">
        <CollapsibleSection 
            title="應用程式設定總覽" 
            icon={Settings} 
        >
            {/* Tronclass 帳戶設定 */}
            <div>
            <h3 className="text-lg font-semibold text-indigo-600 flex items-center border-b border-indigo-200 pb-2 mb-4">
                <User className="w-4 h-4 mr-2"/> 1. Tronclass 帳戶
            </h3>
            <div className="space-y-4">
                <ConfigInput 
                    label="帳號 (TRON_USER)" 
                    name="TRON_USER" 
                    section="tron" 
                    defaultValue={appConfig.tron.TRON_USER} 
                    placeholder="account123"
                />
                <ConfigInput 
                    label="密碼 (TRON_PASS)" 
                    name="TRON_PASS" 
                    section="tron" 
                    defaultValue={appConfig.tron.TRON_PASS} 
                    isPassword={true} 
                    placeholder="******"
                />
                <ConfigInput 
                    label="基礎 URL (TRON_BASE_URL)" 
                    name="TRON_BASE_URL" 
                    section="tron" 
                    defaultValue={appConfig.tron.TRON_BASE_URL} 
                    placeholder="https://tronclass.example.edu"
                />
                <ConfigInput 
                    label="輪詢間隔 (TRON_INTERVAL) ms" 
                    name="TRON_INTERVAL" 
                    section="tron" 
                    type="number" 
                    min="1000"
                    defaultValue={appConfig.tron.TRON_INTERVAL} 
                />
            </div>
            </div>

            {/* 排程時間設定 */}
            <div className="pt-6 mt-6 border-t border-gray-100">
            <h3 className="text-lg font-semibold text-indigo-600 flex items-center border-b border-indigo-200 pb-2 mb-4">
                <Clock className="w-4 h-4 mr-2"/> 2. 排程時間
            </h3>
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <ConfigInput 
                        label="開始時間 (START_HOUR)" 
                        name="START_HOUR" 
                        section="scheduler" 
                        type="number" 
                        min="0" max="23" 
                        defaultValue={appConfig.scheduler.START_HOUR} 
                    />
                    <ConfigInput 
                        label="停止時間 (STOP_HOUR)" 
                        name="STOP_HOUR" 
                        section="scheduler" 
                        type="number" 
                        min="0" max="23" 
                        defaultValue={appConfig.scheduler.STOP_HOUR} 
                    />
                </div>
                <ConfigInput 
                    label="檢查間隔 (CHECK_INTERVAL) 分鐘" 
                    name="CHECK_INTERVAL" 
                    section="scheduler" 
                    type="number" 
                    min="1" 
                    defaultValue={appConfig.scheduler.CHECK_INTERVAL} 
                />
            </div>
            </div>

            {/* Webhook 通知 */}
            <div className="pt-6 mt-6 border-t border-gray-100">
            <h3 className="text-lg font-semibold text-indigo-600 flex items-center border-b border-indigo-200 pb-2 mb-4">
                <Globe className="w-4 h-4 mr-2"/> 3. Webhook 通知
            </h3>
            <ConfigInput 
                label="通知 Webhook URL" 
                name="webhook_url" // 修正：與新的巢狀結構匹配
                section="webhook" // 修正：與新的巢狀結構匹配
                defaultValue={appConfig.webhook.webhook_url} 
                placeholder="https://discordapp.com/api/webhooks/..."
            />
            </div>
            
            {/* 關鍵：儲存按鈕 (type="submit" 會觸發 handleSaveConfig) */}
            <button
                type="submit"
                disabled={isSaving}
                className={`w-full mt-4 py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white transition duration-150 ${
                isSaving
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
                }`}
            >
                {isSaving ? '儲存中...' : '儲存所有設定到 config.yaml'}
            </button>
        </CollapsibleSection>
    </form>
  );


  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8 font-sans">
      <header className="mb-8 border-b pb-4 border-indigo-200">
        <h1 className="text-3xl font-extrabold text-indigo-700 tracking-tight flex items-center">
          <Zap className="w-8 h-8 mr-2" />
          Tronclass 服務管理面板
        </h1>
        <p className="text-sm text-gray-500 mt-1 flex items-center">
          <Info className="w-3 h-3 mr-1"/>
          本地模式 - 設定檔透過後端 API 存取
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* NPM 腳本控制區 (左上 - 佔 2/3 寬度) */}
        <div className="lg:col-span-2">
          {/* NPM 腳本控制區 */}
          <div className="bg-white p-6 rounded-xl shadow-lg mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2 flex items-center">
              <Zap className="w-5 h-5 mr-2 text-indigo-500" />
              NPM 腳本執行 (PM2 控制)
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              點擊按鈕將呼叫後端 API，執行 `package.json` 中對應的腳本命令。
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {NPM_SCRIPTS.map(script => (
                <button
                  key={script.name}
                  onClick={() => handleRunScript(script)}
                  className={`flex flex-col items-center justify-center p-4 rounded-xl text-white font-semibold shadow-md transition transform hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-4 focus:ring-opacity-50 ${script.color} focus:ring-${script.color.split('-')[1]}-400`}
                >
                  <script.icon className="w-6 h-6 mb-1"/>
                  <span className="text-xs">npm run {script.name}</span>
                </button>
              ))}
            </div>
          </div>
          
          {/* 日誌輸出控制台 (左下 - 佔 2/3 寬度) */}
          <div className="bg-gray-800 p-6 rounded-xl shadow-xl">
            <h2 className="text-xl font-bold text-gray-100 mb-4 flex items-center">
              <List className="w-5 h-5 mr-2 text-yellow-400" />
              控制台日誌輸出
            </h2>
            <div className="h-64 overflow-y-scroll bg-black text-xs p-3 rounded-lg border border-gray-700 font-mono space-y-1">
              {logOutput.length === 0 ? (
                <p className="text-gray-500">等待腳本執行或系統訊息...</p>
              ) : (
                logOutput.map((log, index) => (
                  <p key={index} className={
                    log.type === 'error' ? 'text-red-400' :
                    log.type === 'success' ? 'text-green-400' :
                    log.type === 'info' ? 'text-blue-300' :
                    'text-gray-300'
                  }>
                    <span className="text-gray-500">[{log.timestamp}]</span> {log.message}
                  </p>
                ))
              )}
            </div>
          </div>
        </div>

        {/* YAML 預覽區 (右上 - 佔 1/3 寬度) */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-xl shadow-lg h-fit">
            <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2 flex items-center">
              <Code className="w-5 h-5 mr-2 text-indigo-500" />
              YAML 輸出預覽
            </h2>
            <p className="text-sm text-gray-500 mb-4">
                這是最後一次**儲存**後生成的 YAML 內容。
            </p>
            <div className="p-4 bg-gray-100 rounded-lg overflow-x-auto text-sm">
                <pre className="font-mono whitespace-pre-wrap">
                    {jsonToYaml(yamlPreview)}
                </pre>
            </div>
          </div>
        </div>
        
        {/* YAML 配置編輯區 (最下方 - 佔滿 3/3 寬度) */}
        <div className="lg:col-span-3 mt-4">
           {renderAllConfig()}
        </div>
      </div>
    </div>
  );
}

export default App;
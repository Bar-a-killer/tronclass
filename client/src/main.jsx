import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app.jsx';
import './index.css'; // 確保 Tailwind CSS 被引入

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
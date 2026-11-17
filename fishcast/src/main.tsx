import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './app/App';
import './styles-font-faces.css';
import './styles.css';
import './styles-map.css';
import './styles-editorial.css';
import './styles-journal.css';
import './styles-agent.css';
import './styles-detail.css';
import './styles-weather-reply.css';
import './styles-pages-editorial.css';
import './styles-map-editorial.css';
import './styles-planner-editorial.css';
import './styles-places-editorial.css';
import './styles-typography.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>,
);

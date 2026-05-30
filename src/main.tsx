/**
 * Main Entry Point
 * 
 * Application entry point with React 18 root.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { errorTracker } from '@/lib/errorTracking';
import { captureAttribution } from '@/lib/attribution';
import { emitEvent } from '@/lib/track';

// Install global error handlers for uncaught errors and unhandled promise rejections
errorTracker.install();

// Capture first-touch attribution (UTM + referrer) before the app renders, then
// emit a best-effort "landed" event. Both are wrapped and never block startup.
captureAttribution();
emitEvent('landed');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

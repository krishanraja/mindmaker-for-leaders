import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { ThemeProvider } from '@/components/ui/theme-provider'
import ErrorBoundary from '@/components/ErrorBoundary'

const root = document.getElementById("root");
if (!root) throw new Error("Root element not found");

createRoot(root).render(
  <ErrorBoundary>
    <ThemeProvider defaultTheme="light" storageKey="mindmaker-theme">
      <App />
    </ThemeProvider>
  </ErrorBoundary>
);

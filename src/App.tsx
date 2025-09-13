import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import ChatAssessment from "./pages/ChatAssessment";
import NotFound from "./pages/NotFound";
import { testGoogleSheetsSync, testMainSyncFunction } from "./utils/testGoogleSheetsSync";
import { processPendingSyncs } from "./utils/processPendingSyncs";

// Temporarily expose test functions to global scope for debugging
(window as any).testGoogleSheetsSync = testGoogleSheetsSync;
(window as any).testMainSyncFunction = testMainSyncFunction;
(window as any).processPendingSyncs = processPendingSyncs;

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/chat-assessment" element={<ChatAssessment />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

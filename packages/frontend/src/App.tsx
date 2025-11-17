import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Route, Routes } from "react-router-dom";

import { Layout } from "./components/Layout";
import { Toaster } from "./components/ui/sonner";
import { ExecutePromptPage } from "./pages/ExecutePromptPage";
import { SettingsPage } from "./pages/SettingsPage";
import { ToolsPage } from "./pages/ToolsPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 3,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Layout>
        <Routes>
          <Route path="/" element={<ExecutePromptPage />} />
          <Route path="/execute" element={<ExecutePromptPage />} />
          <Route path="/tools" element={<ToolsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
        <Toaster expand={true} visibleToasts={5} richColors />
      </Layout>
    </QueryClientProvider>
  );
}

export default App;

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AdminDashboard from "./pages/AdminDashboard.tsx";
import Auth from "./pages/Auth.tsx";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import { getCurrentUser, isAdminSession } from "./utils/authStorage";

const queryClient = new QueryClient();

const HomeToQuote = () => {
  const { search, hash } = useLocation();
  return <Navigate to={{ pathname: "/quote", search, hash }} replace />;
};

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const user = getCurrentUser();
  const { search, hash } = useLocation();
  if (!user) return <Navigate to={{ pathname: "/auth", search, hash }} replace />;
  return children;
};

const QuoteOnlyRoute = ({ children }: { children: JSX.Element }) => {
  const user = getCurrentUser();
  if (!user) return <Navigate to="/auth" replace />;
  if (isAdminSession(user)) return <Navigate to="/admin" replace />;
  return children;
};

const AdminOnlyRoute = ({ children }: { children: JSX.Element }) => {
  const user = getCurrentUser();
  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdminSession(user)) return <Navigate to="/quote" replace />;
  return children;
};

const PublicOnlyRoute = ({ children }: { children: JSX.Element }) => {
  const user = getCurrentUser();
  if (user) {
    return <Navigate to={isAdminSession(user) ? "/admin" : "/quote"} replace />;
  }
  return children;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <HomeToQuote />
              </ProtectedRoute>
            }
          />
          <Route
            path="/quote"
            element={
              <QuoteOnlyRoute>
                <Index />
              </QuoteOnlyRoute>
            }
          />
          <Route
            path="/history"
            element={
              <QuoteOnlyRoute>
                <Index />
              </QuoteOnlyRoute>
            }
          />
          <Route
            path="/products"
            element={
              <QuoteOnlyRoute>
                <Index />
              </QuoteOnlyRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <AdminOnlyRoute>
                <AdminDashboard />
              </AdminOnlyRoute>
            }
          />
          <Route
            path="/auth"
            element={
              <PublicOnlyRoute>
                <Auth />
              </PublicOnlyRoute>
            }
          />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

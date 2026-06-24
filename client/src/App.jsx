import { RouterProvider } from 'react-router-dom';
import { useEffect } from 'react';
import { router } from './routes/AppRoutes';
import { AuthProvider } from './hooks/useAuth';
import { ToastProvider } from './context/ToastContext';
import { SocketProvider } from './context/SocketContext';
import GlobalErrorBoundary from './components/GlobalErrorBoundary';

const App = () => {
  useEffect(() => {
    // Initialize theme on app load - force dark theme
    const htmlElement = document.documentElement;
    htmlElement.classList.remove('light-theme');
    localStorage.setItem('souldex-theme', 'dark');
  }, []);

  return (
    <GlobalErrorBoundary>
      <AuthProvider>
        <SocketProvider>
          <ToastProvider>
            <RouterProvider router={router} />
          </ToastProvider>
        </SocketProvider>
      </AuthProvider>
    </GlobalErrorBoundary>
  );
};

export default App;

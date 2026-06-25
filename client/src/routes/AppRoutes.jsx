import { createBrowserRouter, Navigate } from 'react-router-dom';
import Landing from '../pages/Landing';
import Login from '../pages/Login';
import Profile from '../pages/Profile';
import PublicProfile from '../pages/PublicProfile';
import Register from '../pages/Register';
import Characters from '../pages/Characters';
import CharacterDetails from '../pages/CharacterDetails';
import Explore from '../pages/Explore';
import Chat from '../pages/Chat';
import Creations from '../pages/Creations';
import ForgotPassword from '../pages/ForgotPassword';
import ResetPassword from '../pages/ResetPassword';
import VerifyEmail from '../pages/VerifyEmail';
import ProtectedRoute from '../components/layout/ProtectedRoute';
import NotFound from '../pages/NotFound';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Landing />,
  },
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/forgot-password',
    element: <ForgotPassword />,
  },
  {
    path: '/reset-password',
    element: <ResetPassword />,
  },
  {
    path: '/verify-email',
    element: <VerifyEmail />,
  },
  {
    path: '/register',
    element: <Register />,
  },
  {
    path: '/characters',
    element: (
      <ProtectedRoute>
        <Characters />
      </ProtectedRoute>
    ),
  },
  {
    path: '/characters/:id',
    element: (
      <ProtectedRoute>
        <CharacterDetails />
      </ProtectedRoute>
    ),
  },
  {
    path: '/profile',
    element: (
      <ProtectedRoute>
        <Profile />
      </ProtectedRoute>
    ),
  },
  {
    path: '/profile/:id',
    element: (
      <ProtectedRoute>
        <PublicProfile />
      </ProtectedRoute>
    ),
  },
  {
    // Legacy redirect: /social → /explore
    path: '/social',
    element: <Navigate to="/explore" replace />,
  },
  {
    path: '/explore',
    element: (
      <ProtectedRoute>
        <Explore />
      </ProtectedRoute>
    ),
  },
  {
    path: '/chat',
    element: (
      <ProtectedRoute>
        <Chat />
      </ProtectedRoute>
    ),
  },
  {
    path: '/creations',
    element: (
      <ProtectedRoute>
        <Creations />
      </ProtectedRoute>
    ),
  },
  {
    path: '*',
    element: <NotFound />,
  },
]);

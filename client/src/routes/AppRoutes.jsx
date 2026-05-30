import { createBrowserRouter } from 'react-router-dom';
import Landing from '../pages/Landing';
import Login from '../pages/Login';
import Profile from '../pages/Profile';
import Register from '../pages/Register';
import Characters from '../pages/Characters';
import CharacterDetails from '../pages/CharacterDetails';
import Social from '../pages/Social';

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
    path: '/register',
    element: <Register />,
  },
  {
    path: '/characters',
    element: <Characters />,
  },
  {
    path: '/characters/:id',
    element: <CharacterDetails />,
  },
  {
    path: '/profile',
    element: <Profile />,
  },
  {
    path: '/social',
    element: <Social />,
  },
]);

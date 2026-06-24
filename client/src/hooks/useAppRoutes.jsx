import { useNavigate } from 'react-router-dom';

function useAppRoutes() {
  const navigate = useNavigate();

  return {
    goToHome: () => navigate('/'),
    goToLogin: () => navigate('/login'),
    goToRegister: () => navigate('/register'),
    goToForgotPassword: () => navigate('/forgot-password'),
    goToResetPassword: (token) =>
      navigate(`/reset-password?token=${encodeURIComponent(token)}`),
    goToCharacters: () => navigate('/characters'),
    goToCharacterDetails: (id) => navigate(`/characters/${id}`),
    goToUserProfile: (id) => navigate(`/profile/${id}`),
    goToExplore: () => navigate('/explore'),
    goToChat: (userId) => navigate('/chat', userId ? { state: { userId } } : {}),
    goBack: () => navigate(-1),
    goForward: () => navigate(1),
  };
}

export default useAppRoutes;

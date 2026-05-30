import { useNavigate } from "react-router-dom";

function useAppRoutes() {
  const navigate = useNavigate();

  return {
    goToHome: () => navigate('/'),
    goToLogin: () => navigate('/login'),
    goToRegister: () => navigate('/register'),
    goToCharacters: () => navigate('/characters'),
    goBack: () => navigate(-1),
    goForward: () => navigate(1),
  };
}

export default useAppRoutes;
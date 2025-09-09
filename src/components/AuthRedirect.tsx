import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, useLocation } from "react-router-dom";

const AuthRedirect = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading) {
      if (user && location.pathname === '/auth') {
        // If user is logged in and on auth page, redirect to dashboard
        navigate('/dashboard', { replace: true });
      } else if (!user && location.pathname !== '/' && location.pathname !== '/auth') {
        // If user is not logged in and trying to access protected route, redirect to auth
        navigate('/auth', { replace: true });
      }
    }
  }, [user, loading, location.pathname, navigate]);

  return null;
};

export default AuthRedirect;
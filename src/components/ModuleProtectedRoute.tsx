import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

interface ModuleProtectedRouteProps {
  requiredModule: string;
  children: React.ReactNode;
}

export const ModuleProtectedRoute = ({
  requiredModule,
  children,
}: ModuleProtectedRouteProps) => {
  const { hasModuleAccess, isLoading } = useAuth();
  const navigate = useNavigate();
  const hasAccess = hasModuleAccess(requiredModule);

  useEffect(() => {
    if (!isLoading && !hasAccess) {
      navigate("/", { replace: true });
    }
  }, [hasAccess, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!hasAccess) {
    return null;
  }

  return <>{children}</>;
};

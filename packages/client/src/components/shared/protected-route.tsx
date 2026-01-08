import { useEffect, type ReactNode } from 'react';
import { useAuth } from '@/hooks/use-auth';

interface ProtectedRouteProps {
   children: ReactNode;
   redirectTo?: string;
}

export function ProtectedRoute({
   children,
   redirectTo = '/login',
}: ProtectedRouteProps) {
   const { isAuthenticated, isLoading, user } = useAuth();

   useEffect(() => {
      console.log(
         'ProtectedRoute - isLoading:',
         isLoading,
         'isAuthenticated:',
         isAuthenticated,
         'user:',
         user
      );

      // Only redirect if we're sure there's no authentication
      // Don't redirect while loading
      if (!isLoading && !isAuthenticated && !user) {
         window.location.href = redirectTo;
      }
   }, [isAuthenticated, isLoading, user, redirectTo]);

   // Show loading while checking authentication
   if (isLoading) {
      return (
         <div className="flex min-h-screen items-center justify-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
         </div>
      );
   }

   // Show loading if user is not yet loaded but we're not in loading state
   // This can happen during initial hydration
   if (!user) {
      return (
         <div className="flex min-h-screen items-center justify-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
         </div>
      );
   }

   return <>{children}</>;
}

import { useEffect, useState, type ReactNode } from 'react';
import { useAuth } from '@/hooks/use-auth';

interface AuthProviderProps {
   children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
   const { fetchCurrentUser, user } = useAuth();
   const [hasChecked, setHasChecked] = useState(false);

   useEffect(() => {
      // If user is already in store (from localStorage), we're good
      if (user) {
         setHasChecked(true);
         return;
      }

      // If no user in store, try to fetch from API (cookie might exist)
      console.log('No user in store, trying to fetch from API...');
      fetchCurrentUser()
         .then((user) => {
            console.log('User fetched from API:', user);
         })
         .catch((error) => {
            console.log(
               'Failed to fetch user (user not authenticated):',
               error
            );
         })
         .finally(() => {
            setHasChecked(true);
         });
   }, []); // Only run once on mount

   // Wait for initial check to complete
   if (!hasChecked) {
      return (
         <div className="flex min-h-screen items-center justify-center bg-background">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
         </div>
      );
   }

   return <>{children}</>;
}

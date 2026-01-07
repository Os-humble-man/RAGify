import { LoginForm } from '../components/login-form';

const LoginPage = () => {
   return (
      <div className="bg-muted flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
         <div className="w-full max-w-sm md:max-w-md">
            <div className="mb-8 flex flex-col items-center gap-2">
               <img src="/ragify.svg" alt="RAGify Logo" className="h-20 w-20" />
               <h1 className="text-4xl font-bold tracking-tight">RAGify</h1>
               <p className="text-muted-foreground text-sm">
                  Bienvenue sur votre assistant IA intelligent
               </p>
            </div>
            <LoginForm />
         </div>
      </div>
   );
};

export default LoginPage;

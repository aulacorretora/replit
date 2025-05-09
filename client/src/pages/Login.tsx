import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useLanguage } from '@/hooks/use-language';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { MessageSquare, CheckCircle2, Globe, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LANGUAGES } from '@/lib/constants';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  rememberMe: z.boolean().optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login() {
  const { login } = useAuth();
  const { t, language, changeLanguage, languages } = useLanguage();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [forgotPasswordMode, setForgotPasswordMode] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  });

  const handleSubmit = async (data: LoginFormValues) => {
    try {
      setError(null);
      setIsLoading(true);
      await login(data.email, data.password);
    } catch (err) {
      console.error('Login error:', err);
      setError(t('login.invalidCredentials'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    try {
      const email = form.getValues('email');
      if (!email) {
        setError(t('login.emailRequired'));
        return;
      }
      
      setIsLoading(true);
      // Call forgot password API
      // await forgotPassword(email);
      setResetEmailSent(true);
    } catch (err) {
      console.error('Forgot password error:', err);
      setError(t('login.forgotPasswordError'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left Side - Branding */}
      <div className="hidden md:flex flex-col md:w-1/2 bg-primary-dark p-12 text-white items-center justify-center">
        <div className="max-w-md text-center">
          <div className="mb-8 flex justify-center">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center">
              <MessageSquare className="h-10 w-10 text-primary-dark" />
            </div>
          </div>
          <h1 className="text-4xl font-bold mb-6">ZapBan</h1>
          <p className="text-xl mb-8">{t('login.tagline')}</p>
          <div className="space-y-4">
            <div className="flex items-center">
              <div className="bg-white bg-opacity-20 rounded-full p-2 mr-4">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <span>{t('login.feature1')}</span>
            </div>
            <div className="flex items-center">
              <div className="bg-white bg-opacity-20 rounded-full p-2 mr-4">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <span>{t('login.feature2')}</span>
            </div>
            <div className="flex items-center">
              <div className="bg-white bg-opacity-20 rounded-full p-2 mr-4">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <span>{t('login.feature3')}</span>
            </div>
            <div className="flex items-center">
              <div className="bg-white bg-opacity-20 rounded-full p-2 mr-4">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <span>{t('login.feature4')}</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Right Side - Login Form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 relative">
        {/* Language Selector */}
        <div className="absolute top-4 right-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="flex items-center gap-1">
                <Globe className="h-4 w-4" />
                <span>{language === 'pt-BR' ? 'PT' : 'EN'}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {Object.entries(languages).map(([code, name]) => (
                <DropdownMenuItem
                  key={code}
                  onClick={() => changeLanguage(code)}
                  className="cursor-pointer"
                >
                  {name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <div className="md:hidden mb-8 flex justify-center">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center">
            <MessageSquare className="h-10 w-10 text-white" />
          </div>
        </div>
        
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-neutral-800">
              {forgotPasswordMode ? t('login.resetPassword') : t('login.welcomeBack')}
            </h2>
            <p className="text-neutral-600 mt-2">
              {forgotPasswordMode ? t('login.resetInstructions') : t('login.loginToContinue')}
            </p>
          </div>
          
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {resetEmailSent && (
            <Alert className="mb-4 bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <AlertDescription className="text-green-700">
                {t('login.resetEmailSent')}
              </AlertDescription>
            </Alert>
          )}
          
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div>
              <Label htmlFor="email" className="block text-sm font-medium text-neutral-700 mb-1">
                {t('login.email')}
              </Label>
              <Input
                id="email"
                type="email"
                className="w-full px-4 py-3 rounded-lg border border-neutral-300 focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                placeholder="exemplo@email.com"
                {...form.register('email')}
                disabled={isLoading}
              />
              {form.formState.errors.email && (
                <p className="mt-1 text-sm text-red-500">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>
            
            {!forgotPasswordMode && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label htmlFor="password" className="block text-sm font-medium text-neutral-700">
                    {t('login.password')}
                  </Label>
                  <Button
                    type="button"
                    variant="link"
                    className="text-sm text-primary hover:text-primary-dark p-0"
                    onClick={() => setForgotPasswordMode(true)}
                  >
                    {t('login.forgotPassword')}
                  </Button>
                </div>
                <Input
                  id="password"
                  type="password"
                  className="w-full px-4 py-3 rounded-lg border border-neutral-300 focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                  placeholder="••••••••"
                  {...form.register('password')}
                  disabled={isLoading}
                />
                {form.formState.errors.password && (
                  <p className="mt-1 text-sm text-red-500">
                    {form.formState.errors.password.message}
                  </p>
                )}
              </div>
            )}
            
            {!forgotPasswordMode && (
              <div className="flex items-center">
                <Checkbox
                  id="remember-me"
                  {...form.register('rememberMe')}
                  disabled={isLoading}
                />
                <Label
                  htmlFor="remember-me"
                  className="ml-2 block text-sm text-neutral-700"
                >
                  {t('login.rememberMe')}
                </Label>
              </div>
            )}
            
            {forgotPasswordMode ? (
              <div className="flex flex-col space-y-3">
                <Button
                  type="button"
                  className="w-full py-3 px-4 bg-primary hover:bg-primary-dark text-white font-medium rounded-lg shadow-sm transition-colors"
                  onClick={handleForgotPassword}
                  disabled={isLoading}
                >
                  {isLoading ? t('login.sending') : t('login.sendResetLink')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setForgotPasswordMode(false);
                    setResetEmailSent(false);
                    setError(null);
                  }}
                  disabled={isLoading}
                >
                  {t('login.backToLogin')}
                </Button>
              </div>
            ) : (
              <Button
                type="submit"
                className="w-full py-3 px-4 bg-primary hover:bg-primary-dark text-white font-medium rounded-lg shadow-sm transition-colors"
                disabled={isLoading}
              >
                {isLoading ? t('login.loggingIn') : t('login.login')}
              </Button>
            )}
          </form>
          
          <div className="mt-8 text-center">
            <p className="text-neutral-600">
              {t('login.noAccount')} <Button variant="link" className="text-primary hover:text-primary-dark font-medium p-0">{t('login.contactUs')}</Button>
            </p>
          </div>
          
          <div className="mt-12 pt-8 border-t border-neutral-200">
            <div className="flex items-center justify-center space-x-4">
              <Button variant="ghost" size="icon" className="text-neutral-500 hover:text-neutral-700">
                <Globe className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="text-neutral-500 hover:text-neutral-700">
                <HelpCircle className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

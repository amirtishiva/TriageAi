import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Heart, Stethoscope, Shield, Eye, EyeOff, Loader2 } from 'lucide-react';
import { z } from 'zod';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

// Validation schemas
const emailSchema = z.string().trim().email({ message: "Please enter a valid email address" });
const passwordSchema = z.string().min(6, { message: "Password must be at least 6 characters" });

const ROLE_OPTIONS: { value: AppRole; label: string; icon: React.ReactNode }[] = [
  { value: 'nurse', label: 'Nurse', icon: <Heart className="h-4 w-4" /> },
  { value: 'physician', label: 'Physician', icon: <Stethoscope className="h-4 w-4" /> },
  { value: 'senior_physician', label: 'Senior Physician', icon: <Stethoscope className="h-4 w-4" /> },
  { value: 'charge_nurse', label: 'Charge Nurse', icon: <Shield className="h-4 w-4" /> },
];

const ZONE_OPTIONS = ['A', 'B', 'C', 'D', 'ICU', 'Trauma'];

// Role to route mapping
const ROLE_ROUTES: Record<AppRole, string> = {
  nurse: '/nurse',
  charge_nurse: '/nurse',
  physician: '/physician',
  senior_physician: '/physician',
};

export default function AuthPage() {
  const navigate = useNavigate();
  const { signIn, signUp, user, currentRole, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<AppRole>('nurse');
  const [zone, setZone] = useState('A');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Redirect if already logged in (role-based)
  useEffect(() => {
    if (!authLoading && user && currentRole) {
      const targetRoute = ROLE_ROUTES[currentRole] || '/';
      navigate(targetRoute, { replace: true });
    }
  }, [user, currentRole, authLoading, navigate]);

  const validateEmail = (value: string): boolean => {
    const result = emailSchema.safeParse(value);
    if (!result.success) {
      setEmailError(result.error.errors[0].message);
      return false;
    }
    setEmailError(null);
    return true;
  };

  const validatePassword = (value: string): boolean => {
    const result = passwordSchema.safeParse(value);
    if (!result.success) {
      setPasswordError(result.error.errors[0].message);
      return false;
    }
    setPasswordError(null);
    return true;
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate inputs
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);
    
    if (!isEmailValid || !isPasswordValid) {
      return;
    }

    setLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      toast({
        title: 'Sign in failed',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Welcome back!',
        description: 'You have been signed in successfully.',
      });
      // Navigation happens via useEffect when currentRole is set
    }

    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate inputs
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);
    
    if (!isEmailValid || !isPasswordValid) {
      return;
    }

    setLoading(true);

    const { error } = await signUp(email, password, role, zone);

    if (error) {
      toast({
        title: 'Sign up failed',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Account created!',
        description: 'You can now sign in with your credentials.',
      });
      setActiveTab('signin');
    }

    setLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateEmail(email)) {
      return;
    }

    setLoading(true);

    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth`,
      });

      if (error) {
        toast({
          title: 'Failed to send reset email',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Check your email',
          description: 'We sent you a password reset link.',
        });
        setActiveTab('signin');
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    }

    setLoading(false);
  };

  // Show loading while checking auth state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Stethoscope className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">MedTriage AI</CardTitle>
          <CardDescription>
            Clinical Decision Support System
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'signin' | 'signup' | 'forgot')} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="you@hospital.org"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setEmailError(null);
                    }}
                    className={emailError ? 'border-destructive' : ''}
                    required
                  />
                  {emailError && <p className="text-xs text-destructive">{emailError}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <div className="relative">
                    <Input
                      id="signin-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setPasswordError(null);
                      }}
                      className={passwordError ? 'border-destructive pr-10' : 'pr-10'}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {passwordError && <p className="text-xs text-destructive">{passwordError}</p>}
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Signing in...</> : 'Sign In'}
                </Button>
                <button
                  type="button"
                  onClick={() => setActiveTab('forgot')}
                  className="w-full text-sm text-muted-foreground hover:text-primary text-center"
                >
                  Forgot your password?
                </button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="you@hospital.org"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setEmailError(null);
                    }}
                    className={emailError ? 'border-destructive' : ''}
                    required
                  />
                  {emailError && <p className="text-xs text-destructive">{emailError}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <div className="relative">
                    <Input
                      id="signup-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Min 6 characters"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setPasswordError(null);
                      }}
                      className={passwordError ? 'border-destructive pr-10' : 'pr-10'}
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {passwordError && <p className="text-xs text-destructive">{passwordError}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your role" />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center gap-2">
                            {option.icon}
                            <span>{option.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zone">Zone</Label>
                  <Select value={zone} onValueChange={setZone}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your zone" />
                    </SelectTrigger>
                    <SelectContent>
                      {ZONE_OPTIONS.map((z) => (
                        <SelectItem key={z} value={z}>
                          Zone {z}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Creating account...</> : 'Create Account'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="forgot">
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="text-center mb-4">
                  <p className="text-sm text-muted-foreground">
                    Enter your email address and we'll send you a link to reset your password.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="forgot-email">Email</Label>
                  <Input
                    id="forgot-email"
                    type="email"
                    placeholder="you@hospital.org"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setEmailError(null);
                    }}
                    className={emailError ? 'border-destructive' : ''}
                    required
                  />
                  {emailError && <p className="text-xs text-destructive">{emailError}</p>}
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Sending...</> : 'Send Reset Link'}
                </Button>
                <button
                  type="button"
                  onClick={() => setActiveTab('signin')}
                  className="w-full text-sm text-muted-foreground hover:text-primary text-center"
                >
                  Back to Sign In
                </button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            <Link to="/" className="hover:underline">
              ← Back to Home
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
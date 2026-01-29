import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  zone: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRoles: UserRole[];
  currentRole: AppRole | null;
  zone: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, role: AppRole, zone?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  hasRole: (role: AppRole) => boolean;
  setCurrentRole: (role: AppRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [currentRole, setCurrentRole] = useState<AppRole | null>(null);
  const [zone, setZone] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch user roles
  const fetchUserRoles = async (userId: string) => {
    const { data, error } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching user roles:', error);
      return [];
    }

    return (data || []) as UserRole[];
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);

        // Fetch roles after auth state change
        if (newSession?.user) {
          setTimeout(() => {
            fetchUserRoles(newSession.user.id).then(roles => {
              setUserRoles(roles);
              if (roles.length > 0 && !currentRole) {
                setCurrentRole(roles[0].role);
                setZone(roles[0].zone);
              }
            });
          }, 0);
        } else {
          setUserRoles([]);
          setCurrentRole(null);
          setZone(null);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      setSession(existingSession);
      setUser(existingSession?.user ?? null);

      if (existingSession?.user) {
        fetchUserRoles(existingSession.user.id).then(roles => {
          setUserRoles(roles);
          if (roles.length > 0) {
            setCurrentRole(roles[0].role);
            setZone(roles[0].zone);
          }
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return { error: error ? new Error(error.message) : null };
  };

  const signUp = async (email: string, password: string, role: AppRole, zone?: string) => {
    const redirectUrl = `${window.location.origin}/`;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });

    if (error) {
      return { error: new Error(error.message) };
    }

    // Create user role after signup
    if (data.user) {
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: data.user.id,
          role,
          zone: zone || null,
        });

      if (roleError) {
        console.error('Error creating user role:', roleError);
        // Don't fail the signup, but log the error
      }
    }

    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setUserRoles([]);
    setCurrentRole(null);
    setZone(null);
  };

  const hasRole = (role: AppRole): boolean => {
    return userRoles.some(ur => ur.role === role);
  };

  const handleSetCurrentRole = (role: AppRole) => {
    const roleData = userRoles.find(ur => ur.role === role);
    if (roleData) {
      setCurrentRole(role);
      setZone(roleData.zone);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        userRoles,
        currentRole,
        zone,
        loading,
        signIn,
        signUp,
        signOut,
        hasRole,
        setCurrentRole: handleSetCurrentRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

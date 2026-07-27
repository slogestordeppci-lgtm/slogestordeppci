import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (name: string, email: string, pass: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Buscar sessão inicial do Supabase
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Escutar alterações de autenticação (login, logout, refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loginWithEmail = async (email: string, pass: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: pass,
    });
    if (error) {
      throw new Error(translateSupabaseAuthError(error.message));
    }
  };

  const registerWithEmail = async (name: string, email: string, pass: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password: pass,
      options: {
        data: {
          display_name: name,
          full_name: name,
        }
      }
    });
    if (error) {
      throw new Error(translateSupabaseAuthError(error.message));
    }
  };

  const loginWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      }
    });
    if (error) {
      throw new Error(translateSupabaseAuthError(error.message));
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    if (error) {
      throw new Error(translateSupabaseAuthError(error.message));
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      loginWithEmail,
      registerWithEmail,
      loginWithGoogle,
      logout,
      resetPassword
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}

function translateSupabaseAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('invalid login credentials') || lower.includes('invalid_credentials')) {
    return 'E-mail ou senha incorretos.';
  }
  if (lower.includes('user already registered') || lower.includes('already registered')) {
    return 'Este e-mail já está cadastrado no sistema.';
  }
  if (lower.includes('password should be at least')) {
    return 'A senha deve conter no mínimo 6 caracteres.';
  }
  if (lower.includes('invalid email')) {
    return 'Por favor, insira um e-mail válido.';
  }
  if (lower.includes('too many requests')) {
    return 'Muitas tentativas. Aguarde um instante e tente novamente.';
  }
  return message || 'Ocorreu um erro na autenticação com Supabase.';
}


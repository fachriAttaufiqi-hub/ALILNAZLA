import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { 
  User, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase.ts';

interface AuthContextType {
  user: User | null;
  idToken: string | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  getFreshToken: () => Promise<string | null>;
  isDemoUser: boolean;
  enableDemoMode: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  idToken: null,
  loading: true,
  signInWithGoogle: async () => {},
  signOutUser: async () => {},
  getFreshToken: async () => null,
  isDemoUser: false,
  enableDemoMode: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemoUser, setIsDemoUser] = useState(false);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    try {
      const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
        setUser(currentUser);
        if (currentUser) {
          try {
            const token = await currentUser.getIdToken();
            setIdToken(token);
            setIsDemoUser(false);
          } catch (err) {
            console.error('Failed to get user ID token:', err);
            setIdToken(null);
          }
        } else {
          setIdToken(null);
        }
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (err) {
      console.warn('Auth state listener error:', err);
      setLoading(false);
    }
  }, []);

  const getFreshToken = useCallback(async (): Promise<string | null> => {
    if (auth && auth.currentUser) {
      try {
        const token = await auth.currentUser.getIdToken(true);
        setIdToken(token);
        return token;
      } catch (e) {
        console.error('Error refreshing token:', e);
      }
    }
    return idToken;
  }, [idToken]);

  const signInWithGoogle = async () => {
    if (!auth || !googleAuthProvider) {
      alert('Autentikasi Google belum aktif di domain ini. Anda dapat menggunakan aplikasi secara mandiri dengan penyimpanan Supabase / Offline.');
      return;
    }
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleAuthProvider);
      const token = await result.user.getIdToken();
      setIdToken(token);
      setUser(result.user);
      setIsDemoUser(false);
    } catch (error: any) {
      console.error('Google Sign-in failed:', error);
      alert('Gagal masuk dengan Google: ' + (error?.message || 'Silakan coba lagi.'));
    } finally {
      setLoading(false);
    }
  };

  const signOutUser = async () => {
    if (!auth) {
      setUser(null);
      setIdToken(null);
      setIsDemoUser(false);
      return;
    }
    setLoading(true);
    try {
      await signOut(auth);
      setUser(null);
      setIdToken(null);
      setIsDemoUser(false);
    } catch (error) {
      console.error('Sign-out error:', error);
    } finally {
      setLoading(false);
    }
  };

  const enableDemoMode = () => {
    setIsDemoUser(true);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        idToken,
        loading,
        signInWithGoogle,
        signOutUser,
        getFreshToken,
        isDemoUser,
        enableDemoMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

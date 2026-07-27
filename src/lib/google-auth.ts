import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const GOOGLE_CLIENT_ID = '242189821893-11ls96k8i9ukc1d2n7ua7o4ramf9ontk.apps.googleusercontent.com';
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

// Use existing app if already initialized
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope(DRIVE_SCOPE);

let isSigningIn = false;
let cachedAccessToken: string | null = localStorage.getItem('gdrive_access_token');

export const setAccessToken = (token: string) => {
  cachedAccessToken = token;
  localStorage.setItem('gdrive_access_token', token);
};

export const getAccessToken = async (): Promise<string | null> => {
  if (cachedAccessToken) {
    return cachedAccessToken;
  }
  return localStorage.getItem('gdrive_access_token');
};

export const initAuth = (
  onAuthSuccess?: (user: User | any, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    const token = await getAccessToken();
    if (user && token) {
      if (onAuthSuccess) onAuthSuccess(user, token);
    } else if (token) {
      if (onAuthSuccess) onAuthSuccess({ email: 'google.user@drive.com' }, token);
    } else {
      if (onAuthFailure) onAuthFailure();
    }
  });
};

/**
 * Trigger OAuth token request via Google Identity Services (GIS) or Firebase Auth
 */
export const googleSignIn = async (): Promise<{ accessToken: string } | null> => {
  isSigningIn = true;

  // Try Google Identity Services GIS token client if available
  if (typeof window !== 'undefined' && (window as any).google?.accounts?.oauth2) {
    return new Promise((resolve, reject) => {
      try {
        const client = (window as any).google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: DRIVE_SCOPE,
          callback: (response: any) => {
            if (response.error) {
              console.error('GIS token error:', response);
              reject(new Error(response.error_description || response.error));
              return;
            }
            if (response.access_token) {
              setAccessToken(response.access_token);
              resolve({ accessToken: response.access_token });
            } else {
              reject(new Error('Nenhum token de acesso retornado pelo Google.'));
            }
          },
          onerror: (err: any) => {
            console.error('GIS error:', err);
            reject(err);
          }
        });
        client.requestAccessToken();
      } catch (err) {
        console.warn('GIS init error, falling back to Firebase popup', err);
        fallbackFirebaseSignIn().then(resolve).catch(reject);
      } finally {
        isSigningIn = false;
      }
    });
  }

  // Fallback to Firebase popup
  return fallbackFirebaseSignIn();
};

const fallbackFirebaseSignIn = async (): Promise<{ accessToken: string }> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Falha ao obter token de acesso do Google Drive via Firebase');
    }

    setAccessToken(credential.accessToken);
    return { accessToken: credential.accessToken };
  } catch (error: any) {
    console.error('Firebase sign in error:', error);
    // If inside iframe or popup blocked error
    if (error?.code === 'auth/popup-blocked' || error?.message?.includes('popup')) {
      throw new Error('O popup de login foi bloqueado pelo navegador. Abra a aplicação em uma nova aba para fazer login.');
    }
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const logout = async () => {
  try {
    await auth.signOut();
  } catch (err) {
    console.warn('Firebase signOut warn:', err);
  }
  cachedAccessToken = null;
  localStorage.removeItem('gdrive_access_token');
};


import { Injectable } from '@angular/core';
import { SocialLogin, type GoogleLoginResponseOnline } from '@capgo/capacitor-social-login';
import { environment } from '../../environments/environment';

export interface GoogleAccount {
  name: string;
  email: string;
  idToken: string | null;
  accessToken: string | null;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private initialized = false;

  async signInWithGoogle(): Promise<GoogleAccount> {
    if (!this.initialized) {
      await SocialLogin.initialize({
        google: {
          webClientId: environment.googleWebClientId,
          mode: 'online',
        },
      });
      this.initialized = true;
    }

    const { result } = await SocialLogin.login({ provider: 'google', options: {} });
    if (result.responseType !== 'online') {
      throw new Error('Google no devolvió el perfil de la cuenta.');
    }

    const response = result as GoogleLoginResponseOnline;
    const email = response.profile.email?.trim();
    if (!email) throw new Error('Google no proporcionó un correo para esta cuenta.');

    return {
      name: response.profile.name?.trim() || email.split('@')[0],
      email,
      idToken: response.idToken,
      accessToken: response.accessToken?.token || null,
    };
  }

  async signOutFromGoogle(): Promise<void> {
    try {
      await SocialLogin.logout({ provider: 'google' });
    } catch {
      // The local EcoBites session can still be closed if Google has no active session.
    }
  }
}

import { Injectable } from '@angular/core';
import { initializeApp } from 'firebase/app';
import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  getAuth,
  indexedDBLocalPersistence,
  initializeAuth,
  reauthenticateWithCredential,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updatePassword,
  updateProfile,
  type User,
} from 'firebase/auth';
import { collection, deleteDoc, doc, getDocs, getDoc, getFirestore, setDoc } from 'firebase/firestore';

import { environment } from '../../environments/environment';

export interface FirebaseSession {
  accessToken: string;
  user: { id: string; name: string; email: string };
}

export interface FirebaseProduct {
  id: number;
  name: string;
  category: string;
  expiration: number;
  quantity: string;
  photo?: string;
  barcode?: string;
}

@Injectable({ providedIn: 'root' })
export class FirebaseService {
  private readonly firebaseApp = initializeApp(environment.firebase);
  private readonly auth = this.createAuth();
  private readonly db = getFirestore(this.firebaseApp);
  async register(name: string, email: string, password: string): Promise<FirebaseSession> {
    this.ensureConfigured();
    const credential = await createUserWithEmailAndPassword(this.auth, email, password);
    await updateProfile(credential.user, { displayName: name });
    return this.createSession(credential.user);
  }

  async login(email: string, password: string): Promise<FirebaseSession> {
    this.ensureConfigured();
    const credential = await signInWithEmailAndPassword(this.auth, email, password);
    return this.createSession(credential.user);
  }

  async signOut(): Promise<void> {
    await firebaseSignOut(this.auth);
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    this.ensureConfigured();
    const user = this.auth.currentUser;
    if (!user?.email) throw new Error('Inicia sesión de nuevo para cambiar tu contraseña.');
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);
    await updatePassword(user, newPassword);
  }

  async updateDisplayName(name: string): Promise<void> {
    this.ensureConfigured();
    const user = this.auth.currentUser;
    if (!user) throw new Error('Inicia sesión de nuevo para cambiar tu nombre.');
    await updateProfile(user, { displayName: name });
  }

  async products(): Promise<FirebaseProduct[]> {
    const uid = await this.requireUid();
    const snapshot = await getDocs(collection(this.db, 'users', uid, 'products'));
    return snapshot.docs.map((item) => item.data() as FirebaseProduct);
  }

  async saveProduct(product: FirebaseProduct): Promise<void> {
    const uid = await this.requireUid();
    const firestoreProduct = Object.fromEntries(Object.entries(product).filter(([, value]) => value !== undefined));
    await setDoc(doc(this.db, 'users', uid, 'products', String(product.id)), firestoreProduct);
  }

  async removeProduct(id: number): Promise<void> {
    const uid = await this.requireUid();
    await deleteDoc(doc(this.db, 'users', uid, 'products', String(id)));
  }

  async migrateLegacyProducts(products: FirebaseProduct[]): Promise<void> {
    const uid = await this.requireUid();
    const migrationRef = doc(this.db, 'users', uid, 'metadata', 'local-migration');
    const migration = await getDoc(migrationRef);
    if (migration.exists()) return;
    for (const product of products) {
      const firestoreProduct = Object.fromEntries(Object.entries(product).filter(([, value]) => value !== undefined));
      await setDoc(doc(this.db, 'users', uid, 'products', String(product.id)), firestoreProduct);
    }
    await setDoc(migrationRef, { completedAt: new Date().toISOString() });
  }

  async loadSettings(): Promise<Record<string, string>> {
    const uid = await this.requireUid();
    const snapshot = await getDoc(doc(this.db, 'users', uid, 'preferences', 'app'));
    return snapshot.exists() ? (snapshot.data() as Record<string, string>) : {};
  }

  async saveSetting(name: string, value: string): Promise<void> {
    const uid = await this.requireUid();
    await setDoc(doc(this.db, 'users', uid, 'preferences', 'app'), { [name]: value }, { merge: true });
  }

  private async createSession(user: User): Promise<FirebaseSession> {
    const email = user.email?.trim().toLowerCase();
    if (!email) throw new Error('Firebase no devolvió el correo de la cuenta.');
    const name = user.displayName?.trim() || email.split('@')[0];
    const accessToken = await user.getIdToken();
    return { accessToken, user: { id: user.uid, name, email } };
  }

  private createAuth() {
    try {
      return initializeAuth(this.firebaseApp, {
        persistence: [indexedDBLocalPersistence, browserLocalPersistence],
      });
    } catch {
      return getAuth(this.firebaseApp);
    }
  }

  private async requireUid(): Promise<string> {
    this.ensureConfigured();
    await this.auth.authStateReady();
    const uid = this.auth.currentUser?.uid;
    if (!uid) throw new Error('Inicia sesión para guardar tus datos.');
    return uid;
  }

  private ensureConfigured(): void {
    const config = environment.firebase;
    if (
      !config.apiKey ||
      config.apiKey.startsWith('CONFIGURA_') ||
      !config.projectId ||
      config.projectId.startsWith('CONFIGURA_') ||
      !config.appId ||
      config.appId.startsWith('CONFIGURA_')
    ) {
      throw new Error('Configura Firebase en src/environments/environment.ts antes de iniciar sesión.');
    }
  }
}

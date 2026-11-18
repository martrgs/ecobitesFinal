import { Injectable, inject } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

import { FIELD_REGEX } from '../service/field-validation';
import { FirebaseService, type FirebaseProduct } from '../service/firebase.service';

export interface EcoProduct {
  id: number;
  name: string;
  category: string;
  expiration: number;
  quantity: string;
  photo?: string;
  barcode?: string;
}

export interface EcoUser {
  id: string;
  name: string;
  email: string;
}

@Injectable({ providedIn: 'root' })
export class EcoBitesService {
  private firebase = inject(FirebaseService);

  private readonly sessionKey = 'ecobites.session';

  constructor() {
    localStorage.removeItem('ecobites.accounts');
  }

  currentUser(): EcoUser | null {
    try {
      const user = JSON.parse(localStorage.getItem(this.sessionKey) || 'null') as EcoUser | null;
      return user?.id ? user : null;
    } catch {
      return null;
    }
  }

  userInitial(user: EcoUser | null): string {
    return user?.name.trim().charAt(0).toLocaleUpperCase('es') || '?';
  }

  userAvatarColor(user: EcoUser | null): string {
    const palette = ['#168a43', '#2878a5', '#8b5bb5', '#c16a32', '#bd4d68', '#438477', '#6b7fc1'];
    const source = user?.id || user?.email || user?.name || 'ecobites';
    let hash = 0;
    for (let index = 0; index < source.length; index++) hash = (hash * 31 + source.charCodeAt(index)) >>> 0;
    return palette[hash % palette.length];
  }

  signIn(user: EcoUser): void {
    localStorage.setItem(this.sessionKey, JSON.stringify(user));
    this.applyAccountPreferences();
  }

  async activateSession(user: EcoUser): Promise<void> {
    this.signIn(user);
    try {
      await this.loadSettings();
    } catch {
      // Use this account's cached preferences if Firebase is temporarily unavailable.
    }
    if (this.currentUser()?.id === user.id) this.applyAccountPreferences();
  }

  applyAccountPreferences(): void {
    const dark = this.setting('dark_mode', 'false') === 'true';
    const language = this.setting('language', 'Español') === 'English' ? 'English' : 'Español';
    document.body.classList.toggle('dark-mode', dark);
    document.documentElement.lang = language === 'English' ? 'en' : 'es';
    localStorage.setItem('ecobites_language', language);
  }

  daysUntilExpiration(expiration: number): number {
    const expiryDate = new Date(expiration);
    const today = new Date();
    const expiryDay = Date.UTC(expiryDate.getFullYear(), expiryDate.getMonth(), expiryDate.getDate());
    const todayDay = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
    return Math.round((expiryDay - todayDay) / 86_400_000);
  }

  updateCurrentUserName(name: string): EcoUser | null {
    const user = this.currentUser();
    if (!user) return null;
    const updated = { ...user, name };
    this.signIn(updated);
    return updated;
  }

  signOut(): void {
    localStorage.removeItem(this.sessionKey);
    document.body.classList.remove('dark-mode');
    document.documentElement.lang = 'es';
    localStorage.setItem('ecobites_language', 'Español');
  }

  async products(): Promise<EcoProduct[]> {
    const user = this.currentUser();
    if (!user) return [];
    const local = this.cachedProducts(user.email);
    try {
      const remote = (await this.firebase.products()) as EcoProduct[];
      if (!localStorage.getItem(this.migrationKey(user.id))) {
        if (remote.length === 0) {
          const productsForCloud = await Promise.all(
            local.map(async (product) => ({
              ...product,
              photo: product.photo ? await this.fitPhoto(product.photo) : undefined,
            })),
          );
          await this.firebase.migrateLegacyProducts(productsForCloud as FirebaseProduct[]);
        }
        localStorage.setItem(this.migrationKey(user.id), 'true');
        if (remote.length === 0) {
          const migrated = (await this.firebase.products()) as EcoProduct[];
          const products = migrated.length ? migrated : local;
          this.cacheProducts(user.email, products);
          return products;
        }
      }
      const products = remote.length ? remote : local;
      this.cacheProducts(user.email, products);
      return products;
    } catch (error) {
      if (local.length) return local;
      throw error;
    }
  }

  cachedProductsForCurrentUser(): EcoProduct[] {
    const user = this.currentUser();
    return user ? this.cachedProducts(user.email) : [];
  }

  async saveProduct(product: EcoProduct): Promise<void> {
    const name = product.name.trim();
    const category = product.category.trim();
    const quantity = product.quantity.trim();
    if (!Number.isSafeInteger(product.id) || product.id <= 0)
      throw new Error('El identificador del producto no es válido.');
    if (name.length < 2 || name.length > 50 || !FIELD_REGEX.productName.test(name))
      throw new Error('El nombre del producto no es válido.');
    if (category.length < 2 || category.length > 40 || !FIELD_REGEX.category.test(category))
      throw new Error('La categoría del producto no es válida.');
    if (quantity.length > 40 || (quantity.length > 0 && !FIELD_REGEX.quantity.test(quantity)))
      throw new Error('La cantidad del producto no es válida.');
    const existing = this.cachedProductsForCurrentUser().find((item) => item.id === product.id);
    if (
      !Number.isFinite(product.expiration) ||
      (product.expiration <= Date.now() && existing?.expiration !== product.expiration)
    )
      throw new Error('La fecha de vencimiento debe ser futura.');
    if (
      product.photo &&
      (!/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(product.photo) || product.photo.length > 700_000)
    ) {
      throw new Error('La foto es demasiado grande para sincronizarla. Elige una imagen más pequeña.');
    }
    if (product.barcode && !FIELD_REGEX.barcode.test(product.barcode))
      throw new Error('El código de barras no es válido.');
    const user = this.currentUser();
    if (!user) throw new Error('Inicia sesión para guardar tus productos.');
    const normalized = Object.fromEntries(
      Object.entries({ ...product, name, category, quantity }).filter(([, value]) => value !== undefined),
    ) as unknown as EcoProduct;
    const products = this.cachedProducts(user.email).filter((item) => item.id !== product.id);
    this.cacheProducts(user.email, [...products, normalized]);
    try {
      await this.firebase.saveProduct(normalized as FirebaseProduct);
    } catch (error) {
      this.cacheProducts(user.email, products);
      throw error;
    }
  }

  async scheduleExpiryAlerts(product: EcoProduct): Promise<void> {
    if (
      !Capacitor.isNativePlatform() ||
      this.setting('notifications', 'true') !== 'true' ||
      product.expiration <= Date.now()
    )
      return;
    const days = [5, 4, 3, 2, 1, 0];
    const now = Date.now();
    const upcoming = days.filter((day) => product.expiration - day * 86_400_000 > now);
    const reminders = upcoming.map((day) => this.notification(product, day, product.expiration - day * 86_400_000));
    if (!reminders.length) return;
    try {
      await LocalNotifications.createChannel({ id: 'ecobites_expiry', name: 'Vencimientos', importance: 4 });
      await LocalNotifications.schedule({ notifications: reminders });
    } catch {
      // Android can request notification permission separately from saving the product.
    }
  }

  async requestNotificationPermission(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return true;
    try {
      return (await LocalNotifications.requestPermissions()).display === 'granted';
    } catch {
      return false;
    }
  }

  async scheduleAllExpiryAlerts(): Promise<void> {
    await Promise.all((await this.products()).map((product) => this.scheduleExpiryAlerts(product)));
  }

  async cancelExpiryAlerts(product: EcoProduct): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;
    try {
      await LocalNotifications.cancel({
        notifications: [5, 4, 3, 2, 1, 0].map((day) => ({ id: this.notificationId(product.id, day) })),
      });
    } catch {
      // The product can still be removed if Android has no pending reminder.
    }
  }

  async cancelAllExpiryAlerts(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;
    await Promise.all((await this.products()).map((product) => this.cancelExpiryAlerts(product)));
  }

  async removeProduct(id: number): Promise<void> {
    const user = this.currentUser();
    if (!user) throw new Error('Inicia sesión para eliminar productos.');
    await this.firebase.removeProduct(id);
    this.cacheProducts(
      user.email,
      this.cachedProducts(user.email).filter((item) => item.id !== id),
    );
  }

  setting(name: string, fallback: string): string {
    const user = this.currentUser();
    return user ? localStorage.getItem(this.key(user.email, name)) || fallback : fallback;
  }

  async loadSettings(): Promise<void> {
    const user = this.currentUser();
    if (!user) return;
    const settings = await this.firebase.loadSettings();
    if (Object.keys(settings).length === 0) {
      for (const name of ['dark_mode', 'notifications', 'language']) {
        const value = this.setting(name, name === 'notifications' ? 'true' : name === 'language' ? 'Español' : 'false');
        await this.firebase.saveSetting(name, value);
      }
    }
    for (const [name, value] of Object.entries(settings)) {
      localStorage.setItem(this.key(user.email, name), value);
    }
  }

  async saveSetting(name: string, value: string): Promise<void> {
    const valid =
      name === 'dark_mode' || name === 'notifications'
        ? value === 'true' || value === 'false'
        : name === 'language' && (value === 'Español' || value === 'English');
    if (!valid) throw new Error('La preferencia seleccionada no es válida.');
    const user = this.currentUser();
    if (!user) throw new Error('Inicia sesión para guardar tus preferencias.');
    localStorage.setItem(this.key(user.email, name), value);
    await this.firebase.saveSetting(name, value);
  }

  private cachedProducts(email: string): EcoProduct[] {
    try {
      return JSON.parse(localStorage.getItem(this.key(email, 'products')) || '[]') as EcoProduct[];
    } catch {
      return [];
    }
  }

  private cacheProducts(email: string, products: EcoProduct[]): void {
    localStorage.setItem(this.key(email, 'products'), JSON.stringify(products));
  }

  private async fitPhoto(dataUrl: string): Promise<string> {
    if (dataUrl.length <= 700_000) return dataUrl;
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error('No se pudo preparar una foto para sincronizarla.'));
      element.src = dataUrl;
    });
    for (const size of [600, 480, 360]) {
      const scale = Math.min(1, size / Math.max(image.width, image.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height);
      for (const quality of [0.58, 0.44, 0.34]) {
        const compressed = canvas.toDataURL('image/jpeg', quality);
        if (compressed.length <= 700_000) return compressed;
      }
    }
    throw new Error('Una foto antigua supera el tamaño que Firestore permite guardar.');
  }

  private migrationKey(uid: string): string {
    return `ecobites.firebase.migrated.${uid}`;
  }
  private key(email: string, suffix: string): string {
    return `ecobites.${email.toLowerCase()}.${suffix}`;
  }

  private notification(product: EcoProduct, days: number, at: number) {
    const dayLabel = days === 1 ? 'día' : 'días';
    return {
      id: this.notificationId(product.id, days),
      title: days === 0 ? 'Producto vencido' : 'Producto próximo a vencer',
      body:
        days === 0
          ? `${product.name} ya venció. Revísalo antes de consumirlo.`
          : `${product.name} vence en ${days} ${dayLabel}. Revísalo para evitar desperdicios.`,
      schedule: { at: new Date(at) },
      channelId: 'ecobites_expiry',
      isExactNotification: false,
    };
  }

  private notificationId(productId: number, days: number): number {
    let hash = 0;
    const key = `${this.currentUser()?.email.toLowerCase() || 'anonymous'}:${productId}:${days}`;
    for (let index = 0; index < key.length; index++) hash = (Math.imul(hash, 31) + key.charCodeAt(index)) | 0;
    return Math.abs(hash);
  }
}

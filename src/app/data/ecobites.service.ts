import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

export interface EcoProduct {
  id: number;
  name: string;
  category: string;
  expiration: number;
  quantity: string;
  photo?: string;
}

export interface EcoUser {
  name: string;
  email: string;
  provider?: 'email' | 'google';
}

@Injectable({ providedIn: 'root' })
export class EcoBitesService {
  private readonly sessionKey = 'ecobites.session';

  currentUser(): EcoUser | null {
    try {
      return JSON.parse(localStorage.getItem(this.sessionKey) || 'null') as EcoUser | null;
    } catch {
      return null;
    }
  }

  signIn(name: string, email: string, provider: 'email' | 'google' = 'email'): void {
    localStorage.setItem(this.sessionKey, JSON.stringify({ name, email, provider }));
  }

  changePassword(currentPassword: string, newPassword: string): boolean {
    const user = this.currentUser();
    if (!user || user.provider === 'google') return false;
    const accounts = this.accounts();
    const account = accounts.find((item) => item.email.toLowerCase() === user.email.toLowerCase());
    if (!account || account.password !== currentPassword) return false;
    account.password = newPassword;
    localStorage.setItem('ecobites.accounts', JSON.stringify(accounts));
    return true;
  }

  private accounts(): Array<{ name: string; email: string; password: string }> {
    try {
      return JSON.parse(localStorage.getItem('ecobites.accounts') || '[]') as Array<{ name: string; email: string; password: string }>;
    } catch {
      return [];
    }
  }

  signOut(): void {
    localStorage.removeItem(this.sessionKey);
  }

  products(): EcoProduct[] {
    try {
      return JSON.parse(localStorage.getItem(this.key('products')) || '[]') as EcoProduct[];
    } catch {
      return [];
    }
  }

  saveProduct(product: EcoProduct): void {
    const products = this.products();
    products.push(product);
    localStorage.setItem(this.key('products'), JSON.stringify(products));
  }

  async scheduleExpiryAlerts(product: EcoProduct): Promise<void> {
    if (!Capacitor.isNativePlatform() || this.setting('notifications', 'true') !== 'true' || product.expiration <= Date.now()) return;
    const days = [5, 4, 3, 2, 0];
    const now = Date.now();
    const upcoming = days.filter((day) => product.expiration - day * 86_400_000 > now);
    const reminders = upcoming.map((day) => this.notification(product, day, product.expiration - day * 86_400_000));
    const remainingDays = Math.ceil((product.expiration - now) / 86_400_000);
    if (remainingDays >= 1 && remainingDays <= 5 && !upcoming.includes(remainingDays)) {
      reminders.push(this.notification(product, remainingDays, now + 3_000));
    }
    if (!reminders.length) return;

    try {
      await LocalNotifications.createChannel({ id: 'ecobites_expiry', name: 'Vencimientos', importance: 4 });
      await LocalNotifications.schedule({ notifications: reminders });
    } catch {
      // Android pedirá permiso si hace falta; los datos del producto se mantienen guardados.
    }
  }

  async scheduleAllExpiryAlerts(): Promise<void> {
    await Promise.all(this.products().map((product) => this.scheduleExpiryAlerts(product)));
  }

  async cancelExpiryAlerts(product: EcoProduct): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;
    try {
      await LocalNotifications.cancel({ notifications: [5, 4, 3, 2, 1, 0].map((day) => ({ id: this.notificationId(product.id, day) })) });
    } catch {
      // The product can still be removed if Android has no pending reminder.
    }
  }

  async cancelAllExpiryAlerts(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;
    await Promise.all(this.products().map((product) => this.cancelExpiryAlerts(product)));
  }

  removeProduct(id: number): void {
    localStorage.setItem(this.key('products'), JSON.stringify(this.products().filter((item) => item.id !== id)));
  }

  setting(name: string, fallback: string): string {
    return localStorage.getItem(this.key(name)) || fallback;
  }

  saveSetting(name: string, value: string): void {
    localStorage.setItem(this.key(name), value);
  }

  private key(suffix: string): string {
    return `ecobites.${this.currentUser()?.email.toLowerCase() || 'anonymous'}.${suffix}`;
  }

  private notification(product: EcoProduct, days: number, at: number) {
    const dayLabel = days === 1 ? 'día' : 'días';
    return {
      id: this.notificationId(product.id, days),
      title: days === 0 ? 'Producto vencido' : 'Producto próximo a vencer',
      body: days === 0 ? `${product.name} ya venció. Revísalo antes de consumirlo.` : `${product.name} vence en ${days} ${dayLabel}. Revísalo para evitar desperdicios.`,
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

import { CommonModule } from '@angular/common';
import type { OnInit } from '@angular/core';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';

import { EcoBitesService, type EcoProduct, type EcoUser } from '../../data/ecobites.service';
import { FIELD_PATTERNS, FIELD_REGEX, utf8Length } from '../../service/field-validation';
import { FirebaseService } from '../../service/firebase.service';
import { TranslatePipe } from '../../service/translate.pipe';

@Component({
  selector: 'app-account',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './account.page.html',
})
export class AccountPage implements OnInit {
  router = inject(Router);
  private data = inject(EcoBitesService);
  private firebase = inject(FirebaseService);
  private toastController = inject(ToastController);
  private changeDetector = inject(ChangeDetectorRef);

  user: EcoUser | null = null;
  userInitial = '?';
  userAvatarColor = '#168a43';
  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  message = '';
  messageIsError = false;
  editingName = false;
  nameDraft = '';
  savingName = false;
  savingPassword = false;
  productCount = 0;
  expiringCount = 0;
  securityOpen = false;
  readonly patterns = FIELD_PATTERNS;
  private pantryLoad: Promise<void> | null = null;

  async ngOnInit(): Promise<void> {
    this.user = this.data.currentUser();
    this.userInitial = this.data.userInitial(this.user);
    this.userAvatarColor = this.data.userAvatarColor(this.user);
    if (!this.user) void this.router.navigateByUrl('/');
    this.nameDraft = this.user?.name || '';
    this.updatePantrySummary(this.data.cachedProductsForCurrentUser());
    void this.loadPantrySummary();
  }

  ionViewWillEnter(): void {
    void this.loadPantrySummary();
  }

  private loadPantrySummary(): Promise<void> {
    this.updatePantrySummary(this.data.cachedProductsForCurrentUser());
    if (this.pantryLoad) return this.pantryLoad;

    this.pantryLoad = this.data
      .products()
      .then((products) => this.updatePantrySummary(products))
      .catch(() => {
        // Keep the cached product counts visible while Firebase is unavailable.
      })
      .finally(() => {
        this.pantryLoad = null;
      });
    return this.pantryLoad;
  }

  private updatePantrySummary(products: EcoProduct[]): void {
    this.productCount = products.length;
    this.expiringCount = products.filter((product) => {
      const days = this.data.daysUntilExpiration(product.expiration);
      return days >= 0 && days <= 5;
    }).length;
  }

  async saveName(): Promise<void> {
    if (this.savingName) return;
    const name = this.nameDraft.trim();
    if (!FIELD_REGEX.personName.test(name) || name.length < 2 || name.length > 60) {
      this.messageIsError = true;
      this.message = 'Escribe un nombre válido de 2 a 60 letras.';
      return;
    }
    this.savingName = true;
    try {
      await this.waitForFirebase(this.firebase.updateDisplayName(name));
      this.user = this.data.updateCurrentUserName(name);
      this.userInitial = this.data.userInitial(this.user);
      this.message = '';
      this.editingName = false;
      void this.showSuccessToast('Nombre guardado correctamente').catch(() => undefined);
    } catch (error) {
      this.messageIsError = true;
      this.message =
        (error as { code?: string }).code === 'ecobites/timeout'
          ? 'Firebase no respondió a tiempo. Revisa tu conexión e inténtalo otra vez.'
          : 'No se pudo actualizar tu nombre. Inténtalo de nuevo.';
    } finally {
      this.savingName = false;
      this.changeDetector.detectChanges();
    }
  }

  async changePassword(): Promise<void> {
    if (this.savingPassword) return;
    this.message = '';
    this.messageIsError = true;
    if (!this.currentPassword.trim() || utf8Length(this.currentPassword) > 72) {
      this.message = 'Escribe tu contraseña actual (máximo 72 bytes).';
      return;
    }
    if (!FIELD_REGEX.password.test(this.newPassword) || utf8Length(this.newPassword) > 72) {
      this.message = 'La contraseña nueva debe tener entre 8 y 72 caracteres e incluir una letra y un número.';
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.message = 'La nueva contraseña y su confirmación no coinciden.';
      return;
    }
    this.savingPassword = true;
    try {
      await this.waitForFirebase(this.firebase.changePassword(this.currentPassword, this.newPassword));
      this.message = '';
      this.currentPassword = '';
      this.newPassword = '';
      this.confirmPassword = '';
      this.securityOpen = false;
      void this.showSuccessToast('Contraseña cambiada correctamente').catch(() => undefined);
    } catch (error) {
      const code = (error as { code?: string })?.code;
      const messages: Record<string, string> = {
        'ecobites/timeout': 'Firebase no respondió a tiempo. Revisa tu conexión e inténtalo otra vez.',
        'auth/invalid-credential': 'La contraseña actual no es correcta.',
        'auth/wrong-password': 'La contraseña actual no es correcta.',
        'auth/weak-password': 'La contraseña nueva no cumple los requisitos.',
        'auth/requires-recent-login': 'Cierra sesión e inicia de nuevo antes de cambiar la contraseña.',
        'auth/network-request-failed': 'No se pudo conectar. Revisa tu conexión e inténtalo otra vez.',
      };
      this.message =
        messages[code || ''] ||
        (error instanceof Error ? error.message : 'No se pudo cambiar la contraseña. Inténtalo de nuevo.');
    } finally {
      this.savingPassword = false;
      this.changeDetector.detectChanges();
    }
  }

  openSecurity(): void {
    this.message = '';
    this.messageIsError = false;
    this.securityOpen = true;
  }

  private async waitForFirebase<T>(operation: Promise<T>): Promise<T> {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        operation,
        new Promise<T>((_, reject) => {
          timeout = setTimeout(
            () =>
              reject(Object.assign(new Error('Firebase tardó demasiado en responder.'), { code: 'ecobites/timeout' })),
            20_000,
          );
        }),
      ]);
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  }

  private async showSuccessToast(message: string): Promise<void> {
    const english = this.data.setting('language', 'Español') === 'English';
    const englishMessage =
      message === 'Nombre guardado correctamente' ? 'Name saved successfully.' : 'Password changed successfully.';
    const toast = await this.toastController.create({
      message: english ? englishMessage : message,
      duration: 2500,
      position: 'top',
      color: 'success',
      icon: 'checkmark-circle-outline',
      cssClass: 'ecobites-success-toast',
    });
    await toast.present();
  }
}

import { CommonModule } from '@angular/common';
import type { OnInit } from '@angular/core';
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

import { EcoBitesService } from '../../data/ecobites.service';
import { TranslatePipe } from '../../service/translate.pipe';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './settings.page.html',
})
export class SettingsPage implements OnInit {
  router = inject(Router);
  private data = inject(EcoBitesService);

  dark = false;
  notifications = true;
  language = 'Español';
  error = '';
  infoModal: 'privacy' | 'about' | null = null;
  async ngOnInit(): Promise<void> {
    if (!this.data.currentUser()) void this.router.navigateByUrl('/');
    try {
      await this.data.loadSettings();
    } catch {
      this.error = 'No se pudieron sincronizar las preferencias con Firebase.';
    }
    this.dark = this.data.setting('dark_mode', 'false') === 'true';
    this.notifications = this.data.setting('notifications', 'true') === 'true';
    const savedLanguage = this.data.setting('language', 'Español');
    this.language = savedLanguage === 'English' ? 'English' : 'Español';
    this.data.applyAccountPreferences();
  }
  toggleDark(event: Event): void {
    this.dark = (event.target as HTMLInputElement).checked;
    void this.persist('dark_mode', String(this.dark));
    document.body.classList.toggle('dark-mode', this.dark);
  }
  async toggleNotifications(event: Event): Promise<void> {
    const enabled = (event.target as HTMLInputElement).checked;
    this.error = '';
    if (enabled && !(await this.data.requestNotificationPermission())) {
      this.notifications = false;
      await this.persist('notifications', 'false');
      this.error = 'Activa el permiso de notificaciones en tu dispositivo para recibir avisos.';
      return;
    }

    this.notifications = enabled;
    await this.persist('notifications', String(this.notifications));
    const action = enabled ? this.data.scheduleAllExpiryAlerts() : this.data.cancelAllExpiryAlerts();
    void action.catch(() => {
      this.error = this.notifications
        ? 'No se pudieron programar las notificaciones. Revisa los permisos de tu dispositivo.'
        : 'No se pudieron cancelar las notificaciones pendientes.';
    });
  }
  setLanguage(event: Event): void {
    const selected = (event.target as HTMLSelectElement).value;
    if (selected !== 'Español' && selected !== 'English') return;
    this.language = selected;
    localStorage.setItem('ecobites_language', selected);
    document.documentElement.lang = selected === 'English' ? 'en' : 'es';
    void this.persist('language', this.language);
  }
  openInfo(section: 'privacy' | 'about'): void {
    this.infoModal = section;
  }
  closeInfo(): void {
    this.infoModal = null;
  }
  private async persist(name: string, value: string): Promise<void> {
    this.error = '';
    try {
      await this.data.saveSetting(name, value);
    } catch {
      this.error = 'No se pudo guardar la preferencia en Firebase. Revisa la configuración de Firestore.';
    }
  }
}

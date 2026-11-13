import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { EcoBitesService } from '../data/ecobites.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule],
  templateUrl: '../templates/settings.page.html',
})
export class SettingsPage implements OnInit {
  dark = false;
  notifications = true;
  language = 'Español';
  constructor(public router: Router, private data: EcoBitesService) {}
  ngOnInit(): void {
    if (!this.data.currentUser()) void this.router.navigateByUrl('/');
    this.dark = this.data.setting('dark_mode', 'false') === 'true';
    this.notifications = this.data.setting('notifications', 'true') === 'true';
    this.language = this.data.setting('language', 'Español');
    document.body.classList.toggle('dark-mode', this.dark);
  }
  toggleDark(event: Event): void { this.dark = (event.target as HTMLInputElement).checked; this.data.saveSetting('dark_mode', String(this.dark)); document.body.classList.toggle('dark-mode', this.dark); }
  toggleNotifications(event: Event): void {
    this.notifications = (event.target as HTMLInputElement).checked;
    this.data.saveSetting('notifications', String(this.notifications));
    void (this.notifications ? this.data.scheduleAllExpiryAlerts() : this.data.cancelAllExpiryAlerts());
  }
  setLanguage(event: Event): void { this.language = (event.target as HTMLSelectElement).value; this.data.saveSetting('language', this.language); }
}

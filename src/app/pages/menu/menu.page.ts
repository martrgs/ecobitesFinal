import type { OnInit } from '@angular/core';
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

import { EcoBitesService, type EcoUser } from '../../data/ecobites.service';
import { FirebaseService } from '../../service/firebase.service';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './menu.page.html',
})
export class MenuPage implements OnInit {
  router = inject(Router);
  private data = inject(EcoBitesService);
  private firebase = inject(FirebaseService);

  user: EcoUser | null = null;
  userInitial = '?';
  userAvatarColor = '#168a43';
  loggingOut = false;
  ngOnInit(): void {
    this.user = this.data.currentUser();
    this.userInitial = this.data.userInitial(this.user);
    this.userAvatarColor = this.data.userAvatarColor(this.user);
    if (!this.user) void this.router.navigateByUrl('/');
  }
  search(): void {
    void this.router.navigateByUrl('/home').then((opened) => {
      if (opened) setTimeout(() => document.querySelector<HTMLInputElement>('.search input')?.focus(), 100);
    });
  }
  async logout(): Promise<void> {
    if (this.loggingOut) return;
    this.loggingOut = true;
    try {
      await this.firebase.signOut();
    } catch {
      // A local session must still be closable when Firebase is unavailable.
    } finally {
      this.data.signOut();
      void this.router.navigateByUrl('/');
      this.loggingOut = false;
    }
  }
}

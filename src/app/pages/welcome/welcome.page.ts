import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

import { EcoBitesService } from '../../data/ecobites.service';
import { TranslatePipe } from '../../service/translate.pipe';

@Component({
  selector: 'app-welcome',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './welcome.page.html',
})
export class WelcomePage {
  private router = inject(Router);
  private data = inject(EcoBitesService);

  constructor() {
    if (this.data.currentUser()) void this.router.navigateByUrl('/home');
  }

  openAuth(mode: string): void {
    void this.router.navigate(['/auth'], { queryParams: { mode } });
  }
}

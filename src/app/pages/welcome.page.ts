import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { EcoBitesService } from '../data/ecobites.service';

@Component({
  selector: 'app-welcome',
  standalone: true,
  templateUrl: '../templates/welcome.page.html',
})
export class WelcomePage {
  constructor(
    private router: Router,
    private data: EcoBitesService,
  ) {
    if (this.data.currentUser()) void this.router.navigateByUrl('/home');
  }

  openAuth(mode: string): void {
    void this.router.navigate(['/auth'], { queryParams: { mode } });
  }
}

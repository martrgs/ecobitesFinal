import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { EcoBitesService, EcoUser } from '../data/ecobites.service';
import { ApiService } from '../service/api.service';

@Component({
  selector: 'app-menu',
  standalone: true,
  templateUrl: '../templates/menu.page.html',
})
export class MenuPage implements OnInit {
  user: EcoUser | null = null;
  constructor(public router: Router, private data: EcoBitesService, private api: ApiService) {}
  ngOnInit(): void {
    this.user = this.data.currentUser();
    if (!this.user) void this.router.navigateByUrl('/');
  }
  search(): void { setTimeout(() => document.querySelector<HTMLInputElement>('.search input')?.focus()); }
  logout(): void {
    void this.api.signOutFromGoogle();
    this.data.signOut();
    void this.router.navigateByUrl('/');
  }
}

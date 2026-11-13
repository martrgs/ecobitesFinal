import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { EcoBitesService, EcoProduct } from '../data/ecobites.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: '../templates/home.page.html',
})
export class HomePage implements OnInit {
  query = '';
  userName = 'Usuario';
  allProducts: EcoProduct[] = [];

  constructor(
    public router: Router,
    private data: EcoBitesService,
  ) {}

  ngOnInit(): void {
    const user = this.data.currentUser();
    if (!user) {
      void this.router.navigateByUrl('/');
      return;
    }
    this.userName = user.name.split(' ')[0];
    this.allProducts = this.data.products().sort((a, b) => a.expiration - b.expiration);
    void this.data.scheduleAllExpiryAlerts();
  }

  get filtered(): EcoProduct[] {
    const query = this.query.trim().toLowerCase();
    return this.allProducts.filter((item) => !query || [item.name, item.category, item.quantity].some((value) => value.toLowerCase().includes(query)));
  }

  emoji(category: string): string {
    return ({ Lácteos: '🥛', 'Frutas y verduras': '🍎', Carnes: '🥩', Bebidas: '🧃', Otros: '🥫' })[category] || '🍎';
  }

  statusText(expiration: number): string {
    const days = Math.ceil((expiration - Date.now()) / 86_400_000);
    return days <= 0 ? 'Vencido' : days <= 5 ? `En ${days} días` : 'Fresco';
  }

  statusClass(expiration: number): string {
    const days = Math.ceil((expiration - Date.now()) / 86_400_000);
    return days <= 0 ? 'danger' : days <= 5 ? 'warning' : 'ok';
  }

  focusSearch(): void {
    document.querySelector<HTMLInputElement>('.search input')?.focus();
  }
}

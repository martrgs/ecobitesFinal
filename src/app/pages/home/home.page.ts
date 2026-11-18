import { CommonModule } from '@angular/common';
import type { OnInit } from '@angular/core';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { ProductCardComponent } from '../../components/product-card.component';
import { EcoBitesService, type EcoProduct } from '../../data/ecobites.service';
import { FIELD_PATTERNS, FIELD_REGEX } from '../../service/field-validation';
import { TranslatePipe } from '../../service/translate.pipe';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, ProductCardComponent],
  templateUrl: './home.page.html',
})
export class HomePage implements OnInit {
  router = inject(Router);
  private data = inject(EcoBitesService);

  query = '';
  userName = 'Usuario';
  userInitial = 'U';
  userAvatarColor = '#168a43';
  allProducts: EcoProduct[] = [];
  error = '';
  private alertsScheduled = false;
  private productsLoading = false;
  readonly searchPattern = FIELD_PATTERNS.search;

  async ngOnInit(): Promise<void> {
    const user = this.data.currentUser();
    if (!user) {
      void this.router.navigateByUrl('/');
      return;
    }
    this.userName = user.name.split(' ')[0];
    this.userInitial = this.data.userInitial(user);
    this.userAvatarColor = this.data.userAvatarColor(user);
    void this.loadProducts();
  }

  async ionViewWillEnter(): Promise<void> {
    await this.loadProducts();
  }

  private async loadProducts(): Promise<void> {
    this.allProducts = this.data.cachedProductsForCurrentUser().sort((a, b) => a.expiration - b.expiration);
    if (this.productsLoading) return;
    this.productsLoading = true;
    this.error = '';
    try {
      this.allProducts = (await this.data.products()).sort((a, b) => a.expiration - b.expiration);
      if (!this.alertsScheduled) {
        this.alertsScheduled = true;
        void this.data.scheduleAllExpiryAlerts().catch(() => undefined);
      }
    } catch {
      if (!this.allProducts.length)
        this.error = 'No se pudieron cargar tus productos. Revisa que Firestore esté configurado.';
    } finally {
      this.productsLoading = false;
    }
  }

  get filtered(): EcoProduct[] {
    const trimmedQuery = this.query.trim().slice(0, 80);
    const query = (FIELD_REGEX.search.test(trimmedQuery) ? trimmedQuery : '').toLowerCase();
    return this.allProducts.filter(
      (item) =>
        !query || [item.name, item.category, item.quantity].some((value) => value.toLowerCase().includes(query)),
    );
  }

  get expiringCount(): number {
    return this.allProducts.filter((product) => {
      const days = this.data.daysUntilExpiration(product.expiration);
      return days >= 0 && days <= 5;
    }).length;
  }

  get upToDateCount(): number {
    return this.allProducts.filter((product) => this.data.daysUntilExpiration(product.expiration) > 5).length;
  }

  emoji(category: string): string {
    return { Lácteos: '🥛', 'Frutas y verduras': '🍎', Carnes: '🥩', Bebidas: '🧃', Otros: '🥫' }[category] || '🍎';
  }

  statusText(expiration: number): string {
    const days = this.data.daysUntilExpiration(expiration);
    return days < 0 ? 'Vencido' : days === 0 ? 'Vence hoy' : days <= 5 ? `En ${days} días` : 'Fresco';
  }

  statusClass(expiration: number): string {
    const days = this.data.daysUntilExpiration(expiration);
    return days <= 0 ? 'danger' : days <= 5 ? 'warning' : 'ok';
  }

  focusSearch(): void {
    document.querySelector<HTMLInputElement>('.search input')?.focus();
  }
  productRemoved(id: number): void {
    this.allProducts = this.allProducts.filter((product) => product.id !== id);
  }
}

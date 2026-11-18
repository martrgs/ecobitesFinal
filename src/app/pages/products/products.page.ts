import { CommonModule } from '@angular/common';
import type { OnInit } from '@angular/core';
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

import { ProductCardComponent } from '../../components/product-card.component';
import { EcoBitesService, type EcoProduct } from '../../data/ecobites.service';
import { TranslatePipe } from '../../service/translate.pipe';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, TranslatePipe, ProductCardComponent],
  templateUrl: './products.page.html',
})
export class ProductsPage implements OnInit {
  router = inject(Router);
  private data = inject(EcoBitesService);

  products: EcoProduct[] = [];
  query = '';
  filter: 'all' | 'expiring' | 'fresh' = 'all';
  error = '';
  ngOnInit(): void {
    this.ionViewWillEnter();
  }
  ionViewWillEnter(): void {
    this.filter = 'all';
    this.query = '';
    this.products = this.data.cachedProductsForCurrentUser().sort((a, b) => a.expiration - b.expiration);
    this.error = '';
    void this.refresh();
  }
  async refresh(): Promise<void> {
    try {
      this.products = (await this.data.products()).sort((a, b) => a.expiration - b.expiration);
    } catch {
      this.error = 'No se pudieron cargar tus productos. Revisa que Firestore esté configurado.';
    }
  }
  get visibleProducts(): EcoProduct[] {
    const query = this.query.trim().toLocaleLowerCase();
    const now = Date.now();
    const soon = now + 5 * 86_400_000;
    return this.products.filter((product) => {
      const matchesQuery =
        !query || `${product.name} ${product.category} ${product.quantity}`.toLocaleLowerCase().includes(query);
      const matchesFilter =
        this.filter === 'all' ||
        (this.filter === 'expiring' && product.expiration <= soon) ||
        (this.filter === 'fresh' && product.expiration > soon);
      return matchesQuery && matchesFilter;
    });
  }
  onSearch(event: Event): void {
    this.query = (event.target as HTMLInputElement).value;
  }
  productRemoved(id: number): void {
    this.products = this.products.filter((product) => product.id !== id);
  }
  setFilter(filter: 'all' | 'expiring' | 'fresh'): void {
    this.filter = filter;
  }
  async remove(id: number): Promise<void> {
    const product = this.products.find((item) => item.id === id);
    if (product) void this.data.cancelExpiryAlerts(product);
    try {
      await this.data.removeProduct(id);
      await this.refresh();
    } catch {
      this.error = 'No se pudo eliminar el producto. Revisa la conexión con Firestore.';
    }
  }
  emoji(category: string): string {
    return { Lácteos: '🥛', 'Frutas y verduras': '🍎', Carnes: '🥩', Bebidas: '🧃', Otros: '🥫' }[category] || '🍎';
  }
}

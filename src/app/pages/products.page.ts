import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { EcoBitesService, EcoProduct } from '../data/ecobites.service';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule],
  templateUrl: '../templates/products.page.html',
})
export class ProductsPage implements OnInit {
  products: EcoProduct[] = [];
  constructor(public router: Router, private data: EcoBitesService) {}
  ngOnInit(): void { this.refresh(); }
  refresh(): void { this.products = this.data.products().sort((a, b) => a.expiration - b.expiration); }
  remove(id: number): void {
    const product = this.products.find((item) => item.id === id);
    if (product) void this.data.cancelExpiryAlerts(product);
    this.data.removeProduct(id);
    this.refresh();
  }
  emoji(category: string): string { return ({ Lácteos: '🥛', 'Frutas y verduras': '🍎', Carnes: '🥩', Bebidas: '🧃', Otros: '🥫' })[category] || '🍎'; }
}

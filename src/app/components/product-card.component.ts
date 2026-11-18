import { CommonModule } from '@angular/common';
import { Component, EventEmitter, HostListener, Input, Output, inject } from '@angular/core';
import { Router } from '@angular/router';

import { EcoBitesService, type EcoProduct } from '../data/ecobites.service';
import { TranslatePipe } from '../service/translate.pipe';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: '../templates/product-card.component.html',
  styleUrls: ['../styles/product-card.component.scss'],
})
export class ProductCardComponent {
  private data = inject(EcoBitesService);
  private router = inject(Router);

  @Input({ required: true }) product!: EcoProduct;
  @Output() removed = new EventEmitter<number>();
  @Output() failed = new EventEmitter<string>();
  menuOpen = false;
  deleting = false;

  get status(): string {
    const days = this.data.daysUntilExpiration(this.product.expiration);
    return days <= 0 ? 'expired' : days <= 5 ? 'soon' : 'fresh';
  }
  get statusLabel(): string {
    const days = this.data.daysUntilExpiration(this.product.expiration);
    return days === 0
      ? 'Vence hoy'
      : this.status === 'expired'
        ? 'Vencido'
        : this.status === 'soon'
          ? 'Por vencer'
          : 'Al día';
  }
  @HostListener('document:click') closeMenu(): void {
    this.menuOpen = false;
  }
  @HostListener('document:keydown.escape') closeWithEscape(): void {
    this.menuOpen = false;
  }
  async edit(): Promise<void> {
    this.menuOpen = false;
    try {
      const opened = await this.router.navigate(['/edit-product', this.product.id], {
        state: { productToEdit: { ...this.product } },
      });
      if (!opened) this.failed.emit('No se pudo abrir el producto para editar. Inténtalo de nuevo.');
    } catch {
      this.failed.emit('No se pudo abrir el producto para editar. Inténtalo de nuevo.');
    }
  }
  async remove(): Promise<void> {
    if (this.deleting) return;
    this.deleting = true;
    try {
      await this.data.removeProduct(this.product.id);
      void this.data.cancelExpiryAlerts(this.product);
      this.removed.emit(this.product.id);
    } catch {
      this.failed.emit('No se pudo eliminar el producto. Revisa la conexión con Firestore.');
    } finally {
      this.deleting = false;
      this.menuOpen = false;
    }
  }
}

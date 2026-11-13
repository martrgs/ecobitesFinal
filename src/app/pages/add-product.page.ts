import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Camera, type MediaResult } from '@capacitor/camera';
import { EcoBitesService } from '../data/ecobites.service';

@Component({
  selector: 'app-add-product',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: '../templates/add-product.page.html',
})
export class AddProductPage {
  name = '';
  category = 'Lácteos';
  customCategory = '';
  date = '';
  quantity = '';
  photo = '';
  error = '';
  today = new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 10);

  get selectedCategory(): string {
    return this.category === 'Otra' ? this.customCategory.trim() : this.category;
  }

  constructor(
    public router: Router,
    private data: EcoBitesService,
  ) {}

  async takePhoto(): Promise<void> {
    try {
      const image = await Camera.takePhoto({ quality: 65, targetWidth: 600, targetHeight: 600 });
      this.photo = await this.toPhotoDataUrl(image);
      this.error = '';
    } catch (error) {
      if (this.wasCancelled(error)) return;
      console.error('Error al tomar la foto del producto:', error);
      this.error = 'No se pudo abrir la cámara. Revisa los permisos del dispositivo.';
    }
  }

  async chooseImage(): Promise<void> {
    try {
      const { results } = await Camera.chooseFromGallery({
        quality: 65,
        targetWidth: 600,
        targetHeight: 600,
      });
      const image = results[0];
      if (!image) return;
      this.photo = await this.toPhotoDataUrl(image);
      this.error = '';
    } catch (error) {
      if (this.wasCancelled(error)) return;
      console.error('Error al seleccionar una imagen del producto:', error);
      this.error = 'No se pudo cargar esa imagen. Prueba con otra.';
    }
  }

  categoryChanged(category: string): void {
    this.category = category;
    if (category !== 'Otra') this.customCategory = '';
  }

  save(): void {
    this.error = '';
    if (this.name.trim().length < 2) {
      this.error = 'El nombre debe tener entre 2 y 50 caracteres.';
      return;
    }
    if (this.selectedCategory.length < 2 || this.selectedCategory.length > 40) {
      this.error = 'Escribe una categoría de 2 a 40 caracteres.';
      return;
    }
    const expiration = new Date(`${this.date}T23:59:59`).getTime();
    if (!Number.isFinite(expiration) || expiration <= Date.now()) {
      this.error = 'La fecha de vencimiento debe ser futura.';
      return;
    }
    if (this.quantity && !/^[A-Za-zÁÉÍÓÚáéíóúÑñ0-9., ]{1,40}$/.test(this.quantity)) {
      this.error = 'La cantidad contiene caracteres no válidos.';
      return;
    }
    const product = { id: Date.now(), name: this.name.trim(), category: this.selectedCategory, expiration, quantity: this.quantity.trim(), photo: this.photo || undefined };
    try {
      this.data.saveProduct(product);
      void this.data.scheduleExpiryAlerts(product);
      void this.router.navigateByUrl('/home');
    } catch (error) {
      console.error('No se pudo guardar el producto:', error);
      this.error = this.photo
        ? 'No hay espacio suficiente para guardar la foto. Elige otra imagen más pequeña.'
        : 'No se pudo guardar el producto. Inténtalo de nuevo.';
    }
  }

  private compressImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('No se pudo leer la imagen'));
      reader.onload = () => {
        const image = new Image();
        image.onerror = () => reject(new Error('No se pudo procesar la imagen'));
        image.onload = () => {
          const scale = Math.min(1, 600 / Math.max(image.width, image.height));
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(image.width * scale);
          canvas.height = Math.round(image.height * scale);
          canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.68));
        };
        image.src = String(reader.result);
      };
      reader.readAsDataURL(file);
    });
  }

  private async toPhotoDataUrl(image: MediaResult): Promise<string> {
    if (image.webPath) {
      try {
        const response = await fetch(image.webPath);
        if (!response.ok) throw new Error('No se pudo leer la foto');
        const blob = await response.blob();
        return this.compressImage(new File([blob], 'producto.jpg', { type: blob.type || 'image/jpeg' }));
      } catch (error) {
        if (!image.thumbnail) throw error;
      }
    }

    if (image.thumbnail) {
      const thumbnail = image.thumbnail.startsWith('data:')
        ? image.thumbnail
        : `data:image/jpeg;base64,${image.thumbnail}`;
      const response = await fetch(thumbnail);
      const blob = await response.blob();
      return this.compressImage(new File([blob], 'producto.jpg', { type: blob.type || 'image/jpeg' }));
    }
    throw new Error('Capacitor no devolvió una imagen para guardar');
  }

  private wasCancelled(error: unknown): boolean {
    const message = (error as { message?: string })?.message?.toLowerCase() || '';
    const code = (error as { code?: string })?.code || '';
    return message.includes('cancel') || code === 'OS-PLUG-CAMR-0006';
  }
}

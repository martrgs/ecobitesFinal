import { CommonModule } from '@angular/common';
import type { OnInit } from '@angular/core';
import { ChangeDetectorRef, Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Camera, type MediaResult } from '@capacitor/camera';
import { ToastController } from '@ionic/angular';

import { EcoBitesService, type EcoProduct } from '../../data/ecobites.service';
import { BarcodeScannerService } from '../../service/barcode-scanner.service';
import { FIELD_PATTERNS, FIELD_REGEX } from '../../validators/field-validation';
import { FoodProductsService } from '../../service/food-products.service';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-add-product',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './add-product.page.html',
})
export class AddProductPage implements OnInit {
  router = inject(Router);
  private data = inject(EcoBitesService);
  private scanner = inject(BarcodeScannerService);
  private foodProducts = inject(FoodProductsService);
  private route = inject(ActivatedRoute);
  private changeDetector = inject(ChangeDetectorRef);
  private toastController = inject(ToastController);

  private readonly destroyRef = inject(DestroyRef);
  private loadVersion = 0;
  private photoVersion = 0;
  name = '';
  category = '';
  date = '';
  quantity = '';
  photo = '';
  photoPreview = '';
  processingPhoto = false;
  barcode = '';
  error = '';
  scanning = false;
  editingProduct: EcoProduct | null = null;
  loading = false;
  saving = false;
  today = new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
  readonly patterns = FIELD_PATTERNS;

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      void this.loadProduct(params.get('id') || this.route.snapshot.queryParamMap.get('edit'));
    });
  }

  ionViewWillEnter(): void {
    void this.loadProduct(this.route.snapshot.paramMap.get('id') || this.route.snapshot.queryParamMap.get('edit'));
  }

  get minimumDate(): string {
    return this.editingProduct && this.date < this.today ? this.localDate(this.editingProduct.expiration) : this.today;
  }

  private localDate(timestamp: number): string {
    const date = new Date(timestamp);
    return new Date(timestamp - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
  }

  private async loadProduct(editId: string | null): Promise<void> {
    const version = ++this.loadVersion;
    this.photoVersion++;
    this.name =
      this.category =
      this.date =
      this.quantity =
      this.photo =
      this.photoPreview =
      this.barcode =
      this.error =
        '';
    this.processingPhoto = false;
    this.editingProduct = null;
    this.loading = false;
    if (!editId) return;
    this.loading = true;
    try {
      const cached = this.data.cachedProductsForCurrentUser();
      const passedProduct = this.router.getCurrentNavigation()?.extras.state?.['productToEdit'] as
        EcoProduct | undefined;
      const product =
        cached.find((item) => String(item.id) === editId) ||
        (passedProduct && String(passedProduct.id) === editId ? passedProduct : undefined) ||
        (await this.data.products()).find((item) => item.id === Number(editId));
      if (version !== this.loadVersion) return;
      if (!product) {
        void this.router.navigateByUrl('/products');
        return;
      }
      this.editingProduct = product;
      this.name = product.name;
      this.category = product.category;
      this.date = this.localDate(product.expiration);
      this.quantity = product.quantity || '';
      this.photo = product.photo || '';
      this.photoPreview = this.photo;
      this.barcode = product.barcode || '';
    } catch {
      if (version === this.loadVersion) this.error = 'No se pudo cargar el producto para editar.';
    } finally {
      if (version === this.loadVersion) {
        this.loading = false;
        this.changeDetector.markForCheck();
      }
    }
  }

  async scanProductBarcode(): Promise<void> {
    this.error = '';
    this.scanning = true;
    try {
      const barcode = await this.scanner.scanOnce();
      if (!barcode) return;
      this.barcode = barcode;
      const product = await this.foodProducts.findByBarcode(barcode);
      if (product.name) this.name = product.name;
      if (product.quantity) this.quantity = product.quantity;
      if (product.category) this.category = product.category.split(',')[0].trim().slice(0, 40);
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'No se pudo leer el código de barras.';
    } finally {
      this.scanning = false;
    }
  }

  async cancelBarcodeScan(): Promise<void> {
    await this.scanner.stop();
  }

  async takePhoto(): Promise<void> {
    try {
      const image = await Camera.takePhoto({ quality: 65, targetWidth: 600, targetHeight: 600 });
      await this.preparePhoto(image);
    } catch (error) {
      if (this.wasCancelled(error)) return;
      console.error('Error al tomar la foto del producto:', error);
      this.error = 'No se pudo procesar la foto. Intenta tomarla nuevamente.';
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
      await this.preparePhoto(image);
    } catch (error) {
      if (this.wasCancelled(error)) return;
      console.error('Error al seleccionar una imagen del producto:', error);
      this.error = 'No se pudo cargar esa imagen. Prueba con otra.';
    }
  }

  clearPhoto(): void {
    this.photoVersion++;
    this.photo = '';
    this.photoPreview = '';
    this.processingPhoto = false;
  }

  async save(): Promise<void> {
    if (this.saving || this.loading) return;
    if (this.processingPhoto) {
      this.error = 'Espera a que termine de prepararse la foto.';
      return;
    }
    this.error = '';
    const productName = this.name.trim();
    const category = this.category.trim();
    const quantity = this.quantity.trim();
    if (productName.length < 2 || productName.length > 50 || !FIELD_REGEX.productName.test(productName)) {
      this.error = 'El nombre debe tener de 2 a 50 caracteres. Usa letras, números, espacios y puntuación básica.';
      return;
    }
    if (category.length < 2 || category.length > 40 || !FIELD_REGEX.category.test(category)) {
      this.error = 'La categoría debe tener de 2 a 40 caracteres y solo contener letras, números o puntuación básica.';
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(this.date)) {
      this.error = 'Selecciona una fecha de vencimiento válida.';
      return;
    }
    const [year, month, day] = this.date.split('-').map(Number);
    const expirationDate = new Date(year, month - 1, day, 23, 59, 59, 999);
    const unchangedDate = this.editingProduct && this.date === this.localDate(this.editingProduct.expiration);
    if (
      expirationDate.getFullYear() !== year ||
      expirationDate.getMonth() !== month - 1 ||
      expirationDate.getDate() !== day ||
      (!unchangedDate && (this.date < this.today || expirationDate.getTime() <= Date.now()))
    ) {
      this.error = 'La fecha de vencimiento debe ser futura.';
      return;
    }
    if (quantity.length > 40 || (quantity.length > 0 && !FIELD_REGEX.quantity.test(quantity))) {
      this.error = 'La cantidad admite hasta 40 letras, números, espacios y unidades como g, ml o kg.';
      return;
    }
    if (this.barcode && !FIELD_REGEX.barcode.test(this.barcode)) {
      this.error = 'El código de barras debe contener entre 8 y 14 dígitos.';
      return;
    }
    if (
      this.photo &&
      (!/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(this.photo) || this.photo.length > 700_000)
    ) {
      this.error = 'La imagen no tiene un formato válido o supera el tamaño permitido. Adjunta otra foto.';
      return;
    }
    const product = {
      id: this.editingProduct?.id ?? Date.now(),
      name: productName,
      category,
      expiration: unchangedDate ? this.editingProduct!.expiration : expirationDate.getTime(),
      quantity,
      ...(this.photo ? { photo: this.photo } : {}),
      ...(this.barcode ? { barcode: this.barcode } : {}),
    };
    this.saving = true;
    try {
      const wasEditing = Boolean(this.editingProduct);
      await this.data.saveProduct(product);
      if (this.editingProduct) await this.data.cancelExpiryAlerts(this.editingProduct);
      void this.data.scheduleExpiryAlerts(product);
      try {
        await this.showSaveToast(wasEditing);
      } catch (toastError) {
        console.warn('No se pudo mostrar la confirmación del producto:', toastError);
      }
      void this.router.navigateByUrl(this.editingProduct ? '/products' : '/home');
    } catch (error) {
      console.error('No se pudo guardar el producto:', error);
      this.error =
        error instanceof Error
          ? error.message
          : this.photo
            ? 'No hay espacio suficiente para guardar la foto. Elige otra imagen más pequeña.'
            : 'No se pudo guardar el producto. Inténtalo de nuevo.';
    } finally {
      this.saving = false;
    }
  }

  private async showSaveToast(wasEditing: boolean): Promise<void> {
    const isEnglish = this.data.setting('language', 'Español') === 'English';
    const toast = await this.toastController.create({
      message: wasEditing
        ? isEnglish
          ? 'Product updated successfully.'
          : 'Producto actualizado correctamente.'
        : isEnglish
          ? 'Product added successfully.'
          : 'Producto agregado correctamente.',
      duration: 2500,
      position: 'top',
      color: 'success',
      icon: 'checkmark-circle-outline',
      cssClass: 'ecobites-success-toast',
    });
    await toast.present();
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

  private async preparePhoto(image: MediaResult): Promise<void> {
    const version = ++this.photoVersion;
    this.error = '';
    this.photo = '';
    this.photoPreview = image.webPath || this.thumbnailUrl(image.thumbnail);
    this.processingPhoto = true;
    this.changeDetector.detectChanges();
    await new Promise<void>((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));
    try {
      const compressed = await this.toPhotoDataUrl(image);
      if (version !== this.photoVersion) return;
      this.photo = compressed;
      this.photoPreview = compressed;
    } catch (error) {
      if (version === this.photoVersion) {
        this.photoPreview = '';
        throw error;
      }
    } finally {
      if (version === this.photoVersion) {
        this.processingPhoto = false;
        this.changeDetector.detectChanges();
      }
    }
  }

  private thumbnailUrl(thumbnail?: string): string {
    if (!thumbnail) return '';
    return thumbnail.startsWith('data:') ? thumbnail : `data:image/jpeg;base64,${thumbnail}`;
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

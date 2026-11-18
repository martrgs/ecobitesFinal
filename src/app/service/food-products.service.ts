import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

export interface FoodProductLookup {
  barcode: string;
  name: string | null;
  brand: string | null;
  category: string | null;
  imageUrl: string | null;
  quantity: string | null;
}

interface OpenFoodFactsResponse {
  status?: number;
  product?: {
    product_name?: string;
    brands?: string;
    categories?: string;
    image_url?: string;
    quantity?: string;
  };
}

@Injectable({ providedIn: 'root' })
export class FoodProductsService {
  private http = inject(HttpClient);

  private normalizeCategory(value: string | undefined): string | null {
    if (!value?.trim()) return null;

    const lastPathPart = value
      .split(/[>,/|]+/)
      .map((part) => part.trim().replace(/^[a-z]{2,3}:/i, '').replace(/-/g, ' '))
      .filter(Boolean)
      .at(-1);
    if (!lastPathPart) return null;

    const normalized = lastPathPart
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

    if (/lacte|dairy|milk|cheese|yogur/.test(normalized)) return 'Lácteos';
    if (/panader|bakery|bread|pastr|boulanger/.test(normalized)) return 'Panadería';
    if (/frut|fruit/.test(normalized)) return 'Frutas';
    if (/verd|vegetable/.test(normalized)) return 'Verduras';
    if (/carn|meat|poultry|fish|seafood/.test(normalized)) return 'Carnes';
    if (/bebid|drink|beverage|juice|water/.test(normalized)) return 'Bebidas';
    if (/cereal|grain|legumbre|pasta|rice/.test(normalized)) return 'Granos';
    if (/snack|dulce|chocolate|candy|confection/.test(normalized)) return 'Dulces';

    const firstWord = lastPathPart.match(/[\p{L}\p{N}]+/u)?.[0];
    if (!firstWord) return null;
    return firstWord.charAt(0).toLocaleUpperCase('es') + firstWord.slice(1).toLocaleLowerCase('es');
  }

  async findByBarcode(barcode: string): Promise<FoodProductLookup> {
    const normalized = barcode.replace(/\s+/g, '');
    if (!/^\d{8,14}$/.test(normalized)) {
      throw new Error('El código de barras debe tener entre 8 y 14 dígitos.');
    }
    const result = await firstValueFrom(
      this.http.get<OpenFoodFactsResponse>(
        `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(normalized)}.json?fields=status,product_name,brands,categories,image_url,quantity`,
      ),
    );
    const product = result.product;
    if (result.status !== 1 || !product)
      throw new Error('No encontramos ese producto en Open Food Facts. Puedes completar sus datos manualmente.');
    return {
      barcode: normalized,
      name: product.product_name?.trim() || null,
      brand: product.brands?.split(',')[0]?.trim() || null,
      category: this.normalizeCategory(product.categories),
      imageUrl: product.image_url || null,
      quantity: product.quantity?.trim() || null,
    };
  }
}

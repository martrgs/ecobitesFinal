import { Injectable } from '@angular/core';
import { App } from '@capacitor/app';
import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import {
  BarcodeFormat,
  BarcodeScanner,
  GoogleBarcodeScannerModuleInstallState,
} from '@capacitor-mlkit/barcode-scanning';

@Injectable({ providedIn: 'root' })
export class BarcodeScannerService {
  private listener?: PluginListenerHandle;
  private backButtonListener?: PluginListenerHandle;
  private finishCurrentScan?: (barcode: string | null) => void;

  async scanOnce(): Promise<string | null> {
    if (this.finishCurrentScan) throw new Error('Ya hay un escaneo en curso.');
    const { supported } = await BarcodeScanner.isSupported();
    if (!supported) throw new Error('Este dispositivo no admite el escaneo de códigos.');

    if (Capacitor.getPlatform() === 'android') {
      return this.scanWithGoogleScanner();
    }

    const permission = await BarcodeScanner.requestPermissions();
    if (permission.camera !== 'granted') {
      throw new Error('Debes permitir el acceso a la cámara para escanear el código.');
    }

    document.body.classList.add('barcode-scanner-active');
    return new Promise<string | null>((resolve, reject) => {
      this.finishCurrentScan = resolve;
      void App.addListener('backButton', () => void this.finish(null))
        .then((handle) => {
          if (this.finishCurrentScan) this.backButtonListener = handle;
          else void handle.remove();
        })
        .catch(() => undefined);
      void this.beginScan(reject);
    });
  }

  async stop(): Promise<void> {
    await this.finish(null);
  }

  private async scanWithGoogleScanner(): Promise<string | null> {
    await this.ensureGoogleScannerAvailable();
    const result = await BarcodeScanner.scan({
      formats: [
        BarcodeFormat.Ean13,
        BarcodeFormat.Ean8,
        BarcodeFormat.UpcA,
        BarcodeFormat.UpcE,
        BarcodeFormat.Code128,
      ],
    });
    return result.barcodes.find((barcode) => barcode.rawValue)?.rawValue ?? null;
  }

  private async ensureGoogleScannerAvailable(): Promise<void> {
    let { available } = await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable();
    if (available) return;

    let progressListener: PluginListenerHandle | undefined;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let resolveInstall!: () => void;
    let rejectInstall!: (error: Error) => void;
    const installCompleted = new Promise<void>((resolve, reject) => {
      resolveInstall = resolve;
      rejectInstall = reject;
    });

    try {
      progressListener = await BarcodeScanner.addListener(
        'googleBarcodeScannerModuleInstallProgress',
        ({ state }) => {
          if (state === GoogleBarcodeScannerModuleInstallState.COMPLETED) resolveInstall();
          if (state === GoogleBarcodeScannerModuleInstallState.FAILED) {
            rejectInstall(new Error('Google Play Services no pudo instalar el lector de códigos.'));
          }
          if (state === GoogleBarcodeScannerModuleInstallState.CANCELED) {
            rejectInstall(new Error('Se canceló la instalación del lector de códigos.'));
          }
        },
      );

      try {
        await BarcodeScanner.installGoogleBarcodeScannerModule();
        timeout = setTimeout(
          () => rejectInstall(new Error('La preparación del lector tardó demasiado. Revisa la conexión e inténtalo otra vez.')),
          90_000,
        );
        await installCompleted;
      } catch (error) {
        ({ available } = await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable());
        if (!available) throw error;
      }
    } finally {
      if (timeout) clearTimeout(timeout);
      await progressListener?.remove();
    }

    ({ available } = await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable());
    if (!available) {
      throw new Error('No se pudo activar el lector de Google. Actualiza Google Play Services e inténtalo de nuevo.');
    }
  }

  private async beginScan(reject: (reason?: unknown) => void): Promise<void> {
    try {
      this.listener = await BarcodeScanner.addListener('barcodesScanned', ({ barcodes }) => {
        const barcode = barcodes.find((item) => item.rawValue)?.rawValue;
        if (barcode) void this.finish(barcode);
      });
      await BarcodeScanner.startScan({
        formats: [
          BarcodeFormat.Ean13,
          BarcodeFormat.Ean8,
          BarcodeFormat.UpcA,
          BarcodeFormat.UpcE,
          BarcodeFormat.Code128,
        ],
      });
    } catch (error) {
      await this.cleanup();
      this.finishCurrentScan = undefined;
      reject(error);
    }
  }

  private async finish(barcode: string | null): Promise<void> {
    const resolve = this.finishCurrentScan;
    if (!resolve) return;
    this.finishCurrentScan = undefined;
    await this.cleanup();
    resolve(barcode);
  }

  private async cleanup(): Promise<void> {
    document.body.classList.remove('barcode-scanner-active');
    const listener = this.listener;
    this.listener = undefined;
    try {
      await listener?.remove();
    } catch {
      // The scan listener may not have started or may already have stopped.
    }
    const backButtonListener = this.backButtonListener;
    this.backButtonListener = undefined;
    try {
      await backButtonListener?.remove();
    } catch {
      // The app back-button listener may already have been removed.
    }
    try {
      await BarcodeScanner.stopScan();
    } catch {
      // The scanner may not have started or may already have stopped.
    }
  }
}

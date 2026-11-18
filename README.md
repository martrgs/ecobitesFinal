# EcoBites Ionic

Aplicación híbrida Ionic, Angular y Capacitor. La autenticación y los datos por cuenta usan Firebase Authentication y Cloud Firestore; la cámara, el escáner, los avisos y el almacenamiento nativo siguen usando Capacitor.

## Configurar Firebase una sola vez

1. Crea o abre un proyecto en Firebase Console y registra una aplicación **Web**.
2. En Authentication, habilita el proveedor **Correo electrónico/contraseña**.
3. Crea la base de datos Cloud Firestore y publica las reglas de `firestore.rules`.
4. Copia `apiKey`, `authDomain`, `projectId` y `appId` de Firebase en `src/environments/environment.ts` y `src/environments/environment.prod.ts`, reemplazando los valores `CONFIGURA_...`.
5. Agrega `localhost` y el dominio de producción a los dominios autorizados de Firebase Authentication.

La configuración web de Firebase son valores públicos de la aplicación. No pongas un client secret ni credenciales de administrador en Ionic. Las cuentas, productos y preferencias se guardan en Firebase; las fotos se reducen para caber en los documentos de Firestore. Los productos que ya existían en el almacenamiento local se suben a Firestore la primera vez que se consulta la lista después de iniciar sesión.

## Ejecutar en navegador

```sh
npm install
npm start
```

## Abrir en Android

```sh
npm run build
npx cap sync android
npm run android:open
```

Después de cambiar la app web, vuelve a ejecutar `npm run build` y `npx cap sync android` para copiar la versión actual al proyecto Android.
El comando `npm run android:open` abre Android Studio usando directamente la ruta instalada y pasa la carpeta `android` como proyecto. Si Android Studio está instalado en otra ubicación, define `CAPACITOR_ANDROID_STUDIO_PATH` con la ruta de `studio64.exe`.

## Servicios externos

- Firebase Authentication: registro e inicio de sesión con correo/contraseña.
- Cloud Firestore: perfil, productos y preferencias separados por UID, protegidos por `firestore.rules`.
- Open Food Facts: búsqueda de producto por código de barras desde `src/app/service/food-products.service.ts`.

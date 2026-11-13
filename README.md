# EcoBites Ionic

Aplicación Ionic con Angular y Capacitor, migrada desde la aplicación Android original. Las pantallas están separadas en bienvenida, acceso, inicio, productos y ajustes. Los productos y preferencias se guardan localmente por cuenta. Android programa avisos de vencimiento a 5, 4, 3, 2 y 0 días, según la preferencia de notificaciones.

## Organización del código

- `src/app/pages/`: TypeScript de todas las pantallas, sin una carpeta por pantalla.
- `src/app/templates/`: HTML de las pantallas.
- `src/app/styles/pages.scss`: estilos compartidos de las pantallas.
- `src/app/service/api.service.ts`: conexión de inicio de sesión con Google.

## Ejecutar en el navegador

```sh
npm install
npm start
```

## Abrir en Android

```sh
npm run build
npx cap sync android
npx cap open android
```

Android Studio abre el proyecto nativo ubicado en `android/`. La función de foto usa `@capacitor/camera`: desde Agregar producto, toca Agregar foto; la captura se guarda con el producto y aparece en la lista. Los avisos de vencimiento usan `@capacitor/local-notifications` y Android puede solicitar permiso para mostrarlos.

El inicio de sesión con Google usa el Web Client ID de `app/src/main/res/values/google_auth.xml` del ZIP original. Está configurado en `src/environments/` y lo consume `src/app/service/api.service.ts`. En Google Cloud, el cliente Android debe tener el paquete `com.example.ecobites` y la huella SHA-1 de la firma del APK que se instale.

Después de cambiar la app web, vuelve a ejecutar `npm run build` y `npx cap sync android` para copiar la versión actual al proyecto Android.

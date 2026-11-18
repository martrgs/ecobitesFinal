import type { PipeTransform } from '@angular/core';
import { Pipe, inject } from '@angular/core';

import { EcoBitesService } from '../data/ecobites.service';

const EN: Record<string, string> = {
  'Editar producto': 'Edit product',
  'Eliminar producto': 'Delete product',
  'Eliminando…': 'Deleting…',
  'Guardar cambios': 'Save changes',
  'Cargando producto…': 'Loading product…',
  'No se pudo cargar el producto para editar.': 'Could not load the product for editing.',
  Configuración: 'Settings',
  Idioma: 'Language',
  Español: 'Spanish',
  'Modo oscuro': 'Dark mode',
  Preferencias: 'Preferences',
  Cerrar: 'Close',
  'No se pudieron programar las notificaciones. Revisa los permisos de tu dispositivo.':
    'Could not schedule notifications. Check your device permissions.',
  'No se pudieron cancelar las notificaciones pendientes.': 'Could not cancel pending notifications.',
  'Activa el permiso de notificaciones en tu dispositivo para recibir avisos.':
    'Enable notification permission on your device to receive alerts.',
  Notificaciones: 'Notifications',
  Privacidad: 'Privacy',
  'Acerca de EcoBites': 'About EcoBites',
  'Juntos por un planeta más limpio 🌱': 'Together for a greener planet 🌱',
  Entendido: 'Got it',
  'EcoBites guarda tu perfil, tus productos y tus preferencias para que puedas consultarlos en tu cuenta.':
    'EcoBites stores your profile, products, and preferences so you can access them in your account.',
  'Tus productos y ajustes se asocian a tu usuario. Mantén protegidos tus datos de acceso y cierra sesión si compartes tu dispositivo.':
    'Your products and settings are linked to your account. Keep your sign-in details safe and sign out if you share your device.',
  'EcoBites te ayuda a organizar tus alimentos y revisar sus fechas de vencimiento.':
    'EcoBites helps you organize your food and keep track of expiration dates.',
  'Al tener tus productos a la mano, puedes planear su consumo y reducir el desperdicio de comida.':
    'Keeping your products organized helps you plan what to use and reduce food waste.',
  'Mi cuenta': 'My account',
  Nombre: 'Name',
  'Correo electrónico': 'Email address',
  Correo: 'Email',
  'Cambiar contraseña': 'Change password',
  'Mis datos': 'My details',
  'Editar nombre': 'Edit name',
  'Guardar nombre': 'Save name',
  'Cerrando sesión…': 'Signing out…',
  'La contraseña actual no es correcta.': 'The current password is incorrect.',
  'La contraseña nueva no cumple los requisitos.': 'The new password does not meet the requirements.',
  'Cierra sesión e inicia de nuevo antes de cambiar la contraseña.':
    'Sign out and sign in again before changing your password.',
  'No se pudo conectar. Revisa tu conexión e inténtalo otra vez.':
    'Could not connect. Check your connection and try again.',
  'No se pudo cambiar la contraseña. Inténtalo de nuevo.': 'Could not change the password. Please try again.',
  'Guardando…': 'Saving…',
  'Mi despensa': 'My pantry',
  productos: 'products',
  'por vencer': 'expiring soon',
  'Ver productos': 'View products',
  'Seguridad de la cuenta': 'Account security',
  'Tu nombre se actualizó correctamente.': 'Your name was updated successfully.',
  'Nombre guardado correctamente.': 'Name saved successfully.',
  'Contraseña cambiada correctamente.': 'Password changed successfully.',
  'Firebase no respondió a tiempo. Revisa tu conexión e inténtalo otra vez.':
    'Firebase did not respond in time. Check your connection and try again.',
  'No se pudo actualizar tu nombre. Inténtalo de nuevo.': 'Could not update your name. Please try again.',
  'Escribe un nombre válido de 2 a 60 letras.': 'Enter a valid name with 2 to 60 letters.',
  'Usa entre 8 y 72 caracteres e incluye al menos una letra y un número.':
    'Use 8 to 72 characters, including at least one letter and one number.',
  'Contraseña actual': 'Current password',
  'Nueva contraseña': 'New password',
  'Confirmar nueva contraseña': 'Confirm new password',
  'Guardar nueva contraseña': 'Save new password',
  'Agregar producto': 'Add product',
  'Escaneando código…': 'Scanning code…',
  'Escanear código de barras': 'Scan barcode',
  'Código leído:': 'Code scanned:',
  'Nombre del producto': 'Product name',
  Categoría: 'Category',
  'Fecha de vencimiento': 'Expiration date',
  'Cancelar escaneo': 'Cancel scan',
  'Cantidad (opcional)': 'Quantity (optional)',
  'Foto del producto': 'Product photo',
  '(opcional)': '(optional)',
  'Quitar imagen': 'Remove image',
  'Borrar foto': 'Delete photo',
  'Preparando la foto…': 'Preparing photo…',
  'Vista previa': 'Preview',
  'Tomar foto': 'Take photo',
  Galería: 'Gallery',
  'Puedes usar la cámara o elegir una imagen de tu dispositivo.': 'Take a photo or choose an image from your device.',
  'Guardar producto': 'Save product',
  'Ej: Leche': 'E.g. Milk',
  'Ej: Lácteos': 'E.g. Dairy',
  'Ej: 1 unidad, 500 g, etc.': 'E.g. 1 item, 500 g, etc.',
  'Crea tu cuenta': 'Create your account',
  '¡Bienvenido de nuevo!': 'Welcome back!',
  'Únete y empieza a cuidar tus alimentos': 'Join and start taking care of your food',
  'Inicia sesión para continuar': 'Sign in to continue',
  'Nombre completo': 'Full name',
  Contraseña: 'Password',
  'Confirmar contraseña': 'Confirm password',
  'Crear cuenta': 'Create account',
  'Iniciar sesión': 'Sign in',
  'Creando cuenta': 'Creating account',
  'Iniciando sesión': 'Signing in',
  '──────── &nbsp; o &nbsp; ────────': '──────── &nbsp; or &nbsp; ────────',
  '¿Ya tienes una cuenta?  Inicia sesión': 'Already have an account?  Sign in',
  '¿No tienes una cuenta?  Regístrate': 'Don’t have an account?  Sign up',
  Volver: 'Back',
  'Menos desperdicio,': 'Less waste,',
  'más vida para el planeta': 'more life for the planet',
  Registrarse: 'Sign up',
  'Hola,': 'Hello,',
  '¡Qué bueno verte!': 'Great to see you!',
  'Buscar producto...': 'Search products...',
  'Resumen de tus alimentos': 'Your food summary',
  'Por vencer': 'Expiring soon',
  'Al día': 'Up to date',
  Vencido: 'Expired',
  'Vence hoy': 'Expires today',
  Fresco: 'Fresh',
  'Mis productos': 'My products',
  'Ver todos': 'View all',
  'Aún no tienes productos': 'You have no products yet',
  'No encontramos ese producto': 'We couldn’t find that product',
  'Prueba con otro nombre o categoría.': 'Try another name or category.',
  'Agrega tu primer producto con el botón de abajo y empieza a organizar tus alimentos.':
    'Add your first product with the button below and start organizing your food.',
  'Agrega tu primer producto': 'Add your first product',
  'Organiza tus alimentos y revisa sus fechas.': 'Organize your food and keep track of its dates.',
  'Buscar productos': 'Search products',
  'Filtrar productos': 'Filter products',
  Todos: 'All',
  'No encontramos productos con esos filtros.': 'No products match those filters.',
  'Agrega alimentos para tenerlos organizados en un solo lugar.': 'Add food to keep it organized in one place.',
  '+ Agregar producto': '+ Add product',
  Inicio: 'Home',
  Productos: 'Products',
  Buscar: 'Search',
  Menú: 'Menu',
  'Cerrar sesión': 'Sign out',
  Vence: 'Expires',
  'Vista previa del producto': 'Product preview',
  'La búsqueda admite hasta 80 letras, números y signos básicos.':
    'Search supports up to 80 letters, numbers, and basic punctuation.',
  'Usa de 2 a 50 letras, números, espacios y puntuación básica.':
    'Use 2 to 50 letters, numbers, spaces, and basic punctuation.',
  'Usa de 2 a 40 letras, números y puntuación básica.': 'Use 2 to 40 letters, numbers, and basic punctuation.',
  'Usa hasta 40 letras, números, espacios y unidades.': 'Use up to 40 letters, numbers, spaces, and units.',
};

@Pipe({ name: 't', standalone: true, pure: false })
export class TranslatePipe implements PipeTransform {
  private readonly data = inject(EcoBitesService);
  transform(value: string | null | undefined): string {
    if (!value) return value ?? '';
    const language = localStorage.getItem('ecobites_language') || this.data.setting('language', 'Español');
    const daysUntil = /^En (\d+) días$/.exec(value);
    if (language === 'English' && daysUntil) return `In ${daysUntil[1]} days`;
    return language === 'English' ? (EN[value] ?? value) : value;
  }
}

import type { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'welcome',
    loadComponent: () => import('./pages/welcome.page').then((m) => m.WelcomePage),
  },
  {
    path: 'auth',
    loadComponent: () => import('./pages/auth.page').then((m) => m.AuthPage),
  },
  {
    path: 'home',
    loadComponent: () => import('./pages/home.page').then((m) => m.HomePage),
  },
  {
    path: 'add-product',
    loadComponent: () => import('./pages/add-product.page').then((m) => m.AddProductPage),
  },
  {
    path: 'products',
    loadComponent: () => import('./pages/products.page').then((m) => m.ProductsPage),
  },
  {
    path: 'menu',
    loadComponent: () => import('./pages/menu.page').then((m) => m.MenuPage),
  },
  {
    path: 'account',
    loadComponent: () => import('./pages/account.page').then((m) => m.AccountPage),
  },
  {
    path: 'settings',
    loadComponent: () => import('./pages/settings.page').then((m) => m.SettingsPage),
  },
  {
    path: '',
    redirectTo: 'welcome',
    pathMatch: 'full',
  },
];

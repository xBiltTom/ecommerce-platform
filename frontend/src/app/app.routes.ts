import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/public/layout/public-layout.component').then(m => m.PublicLayoutComponent),
    children: [
      { path: '', loadComponent: () => import('./features/public/catalog/catalog.component').then(m => m.CatalogComponent) },
      { path: 'producto/:slug', loadComponent: () => import('./features/public/product-detail/product-detail.component').then(m => m.ProductDetailComponent) }
    ]
  },
  {
    path: 'auth',
    loadComponent: () => import('./features/auth/layout/auth-layout.component').then(m => m.AuthLayoutComponent),
    canActivate: [() => import('./core/guards/auth.guard').then(m => m.guestGuard)],
    children: [
      { path: 'login', loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent) },
      { path: 'register', loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent) },
      { path: '', redirectTo: 'login', pathMatch: 'full' }
    ]
  },
  { path: 'ui-sandbox', loadComponent: () => import('./features/ui-sandbox/ui-sandbox.component').then(m => m.UiSandboxComponent) },
  { path: '**', redirectTo: '' }
];

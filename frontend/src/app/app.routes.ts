import { Routes } from '@angular/router';
import { authGuard, adminGuard, guestGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/public/layout/public-layout.component').then(m => m.PublicLayoutComponent),
    children: [
      { path: '', loadComponent: () => import('./features/public/catalog/catalog.component').then(m => m.CatalogComponent) },
      { path: 'producto/:slug', loadComponent: () => import('./features/public/product-detail/product-detail.component').then(m => m.ProductDetailComponent) },
      {
        path: 'mi-perfil',
        loadComponent: () => import('./features/customer/profile/profile.component').then(m => m.ProfileComponent),
        canActivate: [authGuard],
      },
    ]
  },
  {
    path: 'auth',
    loadComponent: () => import('./features/auth/layout/auth-layout.component').then(m => m.AuthLayoutComponent),
    canActivate: [guestGuard],
    children: [
      { path: 'login', loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent) },
      { path: 'register', loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent) },
      { path: '', redirectTo: 'login', pathMatch: 'full' }
    ]
  },
  {
    path: 'checkout',
    loadComponent: () => import('./features/customer/checkout/checkout.component').then(m => m.CheckoutComponent),
    canActivate: [authGuard]
  },
  {
    path: 'admin',
    loadChildren: () => import('./features/admin/admin.routes').then(m => m.adminRoutes),
    canActivate: [adminGuard]
  },
  { path: 'ui-sandbox', loadComponent: () => import('./features/ui-sandbox/ui-sandbox.component').then(m => m.UiSandboxComponent) },
  { path: '**', redirectTo: '' }
];

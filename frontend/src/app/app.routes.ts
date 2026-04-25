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
  { path: 'ui-sandbox', loadComponent: () => import('./features/ui-sandbox/ui-sandbox.component').then(m => m.UiSandboxComponent) },
  { path: '**', redirectTo: '' }
];

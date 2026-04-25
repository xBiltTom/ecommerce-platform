import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: 'ui-sandbox', loadComponent: () => import('./features/ui-sandbox/ui-sandbox.component').then(m => m.UiSandboxComponent) },
  { path: '', redirectTo: 'ui-sandbox', pathMatch: 'full' }
];

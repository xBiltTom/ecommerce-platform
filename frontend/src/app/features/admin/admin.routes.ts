import { Routes } from '@angular/router';
import { AdminLayoutComponent } from './layout/admin-layout.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { AdminConfiguracionComponent } from './configuracion/configuracion.component';
import { AdminPedidosComponent } from './pedidos/pedidos.component';
import { AdminProductosComponent } from './productos/productos.component';
import { AdminUsuariosComponent } from './usuarios/usuarios.component';

export const adminRoutes: Routes = [
  {
    path: '',
    component: AdminLayoutComponent,
    children: [
      { path: 'dashboard', component: DashboardComponent },
      { path: 'pedidos', component: AdminPedidosComponent },
      { path: 'productos', component: AdminProductosComponent },
      { path: 'usuarios', component: AdminUsuariosComponent },
      { path: 'configuracion', component: AdminConfiguracionComponent },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  }
];

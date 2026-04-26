import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { LucideAngularModule, LayoutDashboard, ShoppingBag, Users, PackageSearch, LogOut, Settings } from 'lucide-angular';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  template: `
    <div class="min-h-screen bg-bg-main flex">
      
      <!-- Sidebar -->
      <aside class="w-64 bg-bg-surface border-r border-border-subtle hidden md:flex flex-col">
        <!-- Logo -->
        <div class="h-20 flex items-center px-6 border-b border-border-subtle cursor-pointer" routerLink="/">
          <div class="w-8 h-8 rounded-sm bg-accent-primary flex items-center justify-center mr-3 shadow-[0_0_15px_rgba(223,227,29,0.3)]">
            <span class="text-text-inverse font-bold tracking-tighter text-sm">PR</span>
          </div>
          <span class="text-xl font-bold tracking-tight text-text-primary">Protech <span class="text-accent-primary text-sm font-normal ml-1">Admin</span></span>
        </div>

        <!-- Navegación -->
        <nav class="flex-grow py-6 px-4 space-y-2">
          <a routerLink="/admin/dashboard" routerLinkActive="bg-accent-primary/10 text-accent-primary border-accent-primary" [routerLinkActiveOptions]="{exact: true}" class="flex items-center gap-3 px-4 py-3 text-text-secondary hover:text-text-primary hover:bg-bg-main rounded-sm transition-all duration-200 border border-transparent font-medium cursor-pointer group">
            <lucide-icon [img]="LayoutDashboard" [size]="20" class="group-hover:scale-110 transition-transform"></lucide-icon>
            Dashboard
          </a>
          
          <a routerLink="/admin/pedidos" routerLinkActive="bg-accent-primary/10 text-accent-primary border-accent-primary" class="flex items-center gap-3 px-4 py-3 text-text-secondary hover:text-text-primary hover:bg-bg-main rounded-sm transition-all duration-200 border border-transparent font-medium cursor-pointer group">
            <lucide-icon [img]="ShoppingBag" [size]="20" class="group-hover:scale-110 transition-transform"></lucide-icon>
            Pedidos
          </a>
          
          <a routerLink="/admin/productos" routerLinkActive="bg-accent-primary/10 text-accent-primary border-accent-primary" class="flex items-center gap-3 px-4 py-3 text-text-secondary hover:text-text-primary hover:bg-bg-main rounded-sm transition-all duration-200 border border-transparent font-medium cursor-pointer group">
            <lucide-icon [img]="PackageSearch" [size]="20" class="group-hover:scale-110 transition-transform"></lucide-icon>
            Productos
          </a>
          
          <a routerLink="/admin/usuarios" routerLinkActive="bg-accent-primary/10 text-accent-primary border-accent-primary" class="flex items-center gap-3 px-4 py-3 text-text-secondary hover:text-text-primary hover:bg-bg-main rounded-sm transition-all duration-200 border border-transparent font-medium cursor-pointer group">
            <lucide-icon [img]="Users" [size]="20" class="group-hover:scale-110 transition-transform"></lucide-icon>
            Usuarios
          </a>
        </nav>

        <!-- Configuración & Perfil inferior -->
        <div class="p-4 border-t border-border-subtle">
          <a
            routerLink="/admin/configuracion"
            routerLinkActive="bg-accent-primary/10 text-accent-primary border-accent-primary"
            class="flex items-center gap-3 px-4 py-3 text-text-secondary hover:text-text-primary hover:bg-bg-main rounded-sm transition-all duration-200 border border-transparent font-medium cursor-pointer group"
          >
            <lucide-icon [img]="Settings" [size]="20"></lucide-icon>
            Configuración
          </a>
          <div (click)="logout()" class="flex items-center gap-3 px-4 py-3 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-sm cursor-pointer transition-colors mt-1">
            <lucide-icon [img]="LogOut" [size]="20"></lucide-icon>
            Cerrar Sesión
          </div>
        </div>
      </aside>

      <!-- Main Content -->
      <main class="flex-grow flex flex-col h-screen overflow-hidden min-w-0">
        <!-- Topbar móvil (Opcional, mockeado para ahora) -->
        <header class="md:hidden h-16 border-b border-border-subtle flex items-center px-4 bg-bg-surface">
          <span class="text-lg font-bold text-text-primary">Protech Admin</span>
        </header>

        <!-- Contenido dinámico -->
        <div class="flex-grow p-6 lg:p-10 overflow-y-auto">
          <router-outlet></router-outlet>
        </div>
      </main>

    </div>
  `,
  styles: []
})
export class AdminLayoutComponent {
  private authService = inject(AuthService);

  readonly LayoutDashboard = LayoutDashboard;
  readonly ShoppingBag = ShoppingBag;
  readonly Users = Users;
  readonly PackageSearch = PackageSearch;
  readonly LogOut = LogOut;
  readonly Settings = Settings;

  logout() {
    this.authService.logout();
  }
}

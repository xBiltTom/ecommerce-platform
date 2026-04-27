import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AdminService } from '../../../core/services/admin.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { 
  LucideAngularModule, 
  LayoutDashboard, 
  ShoppingBag, 
  Users, 
  PackageSearch, 
  LogOut, 
  Settings, 
  FolderTree, 
  Tag,
  Menu,
  X
} from 'lucide-angular';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  template: `
    <div class="h-screen w-full bg-bg-main flex overflow-hidden">
      
      <!-- Backdrop for mobile -->
      <div 
        *ngIf="isMobileMenuOpen" 
        (click)="closeMobileMenu()" 
        class="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden transition-opacity duration-300 ease-in-out"
        aria-hidden="true"
      ></div>

      <!-- Sidebar -->
      <aside 
        [class.translate-x-0]="isMobileMenuOpen"
        [class.-translate-x-full]="!isMobileMenuOpen"
        class="fixed inset-y-0 left-0 z-50 w-72 md:w-64 bg-bg-surface border-r border-border-subtle flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] md:relative md:translate-x-0 shadow-[4px_0_24px_rgba(0,0,0,0.5)] md:shadow-none"
      >
        <!-- Header Sidebar -->
        <div class="h-16 md:h-20 flex items-center justify-between px-6 border-b border-border-subtle shrink-0">
          <div class="flex items-center cursor-pointer group" routerLink="/" (click)="closeMobileMenu()">
            <div class="w-8 h-8 rounded-sm bg-accent-primary flex items-center justify-center mr-3 shadow-[0_0_15px_rgba(223,227,29,0.3)] group-hover:shadow-[0_0_25px_rgba(223,227,29,0.5)] transition-shadow">
              <span class="text-text-inverse font-bold tracking-tighter text-sm">PR</span>
            </div>
            <span class="text-xl font-bold tracking-tight text-text-primary">Protech <span class="text-accent-primary text-sm font-normal ml-1">Admin</span></span>
          </div>
          <!-- Close button mobile -->
          <button 
            (click)="closeMobileMenu()" 
            class="md:hidden p-2 -mr-2 text-text-secondary hover:text-text-primary hover:bg-bg-main rounded-md transition-colors"
            aria-label="Close sidebar"
          >
            <lucide-icon [img]="X" [size]="20"></lucide-icon>
          </button>
        </div>

        <!-- Navegación -->
        <nav class="flex-grow py-6 px-4 space-y-2 overflow-y-auto custom-scrollbar">
          <a routerLink="/admin/dashboard" (click)="closeMobileMenu()" routerLinkActive="bg-accent-primary/10 text-accent-primary border-accent-primary" [routerLinkActiveOptions]="{exact: true}" class="flex items-center gap-3 px-4 py-3 text-text-secondary hover:text-text-primary hover:bg-bg-main rounded-sm transition-all duration-200 border border-transparent font-medium cursor-pointer group">
            <lucide-icon [img]="LayoutDashboard" [size]="20" class="group-hover:scale-110 transition-transform duration-300 ease-out"></lucide-icon>
            Dashboard
          </a>
          
          <a routerLink="/admin/pedidos" (click)="closeMobileMenu()" routerLinkActive="bg-accent-primary/10 text-accent-primary border-accent-primary" class="flex items-center gap-3 px-4 py-3 text-text-secondary hover:text-text-primary hover:bg-bg-main rounded-sm transition-all duration-200 border border-transparent font-medium cursor-pointer group">
            <lucide-icon [img]="ShoppingBag" [size]="20" class="group-hover:scale-110 transition-transform duration-300 ease-out"></lucide-icon>
            Pedidos
          </a>
          
          <a routerLink="/admin/productos" (click)="closeMobileMenu()" routerLinkActive="bg-accent-primary/10 text-accent-primary border-accent-primary" class="flex items-center gap-3 px-4 py-3 text-text-secondary hover:text-text-primary hover:bg-bg-main rounded-sm transition-all duration-200 border border-transparent font-medium cursor-pointer group">
            <lucide-icon [img]="PackageSearch" [size]="20" class="group-hover:scale-110 transition-transform duration-300 ease-out"></lucide-icon>
            Productos
          </a>

          <a routerLink="/admin/categorias" (click)="closeMobileMenu()" routerLinkActive="bg-accent-primary/10 text-accent-primary border-accent-primary" class="flex items-center gap-3 px-4 py-3 text-text-secondary hover:text-text-primary hover:bg-bg-main rounded-sm transition-all duration-200 border border-transparent font-medium cursor-pointer group">
            <lucide-icon [img]="FolderTree" [size]="20" class="group-hover:scale-110 transition-transform duration-300 ease-out"></lucide-icon>
            Categorías
          </a>
          
          <a routerLink="/admin/marcas" (click)="closeMobileMenu()" routerLinkActive="bg-accent-primary/10 text-accent-primary border-accent-primary" class="flex items-center gap-3 px-4 py-3 text-text-secondary hover:text-text-primary hover:bg-bg-main rounded-sm transition-all duration-200 border border-transparent font-medium cursor-pointer group">
            <lucide-icon [img]="Tag" [size]="20" class="group-hover:scale-110 transition-transform duration-300 ease-out"></lucide-icon>
            Marcas
          </a>
          
          <a routerLink="/admin/usuarios" (click)="closeMobileMenu()" routerLinkActive="bg-accent-primary/10 text-accent-primary border-accent-primary" class="flex items-center gap-3 px-4 py-3 text-text-secondary hover:text-text-primary hover:bg-bg-main rounded-sm transition-all duration-200 border border-transparent font-medium cursor-pointer group">
            <lucide-icon [img]="Users" [size]="20" class="group-hover:scale-110 transition-transform duration-300 ease-out"></lucide-icon>
            Usuarios
          </a>
        </nav>

        <!-- Configuración & Perfil inferior -->
        <div class="p-4 border-t border-border-subtle shrink-0">
          <a
            routerLink="/admin/configuracion"
            (click)="closeMobileMenu()"
            routerLinkActive="bg-accent-primary/10 text-accent-primary border-accent-primary"
            class="flex items-center gap-3 px-4 py-3 text-text-secondary hover:text-text-primary hover:bg-bg-main rounded-sm transition-all duration-200 border border-transparent font-medium cursor-pointer group"
          >
            <lucide-icon [img]="Settings" [size]="20" class="group-hover:rotate-90 transition-transform duration-500"></lucide-icon>
            Configuración
          </a>
          <button 
            (click)="logout()" 
            class="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-sm cursor-pointer transition-colors mt-1 font-medium group"
          >
            <lucide-icon [img]="LogOut" [size]="20" class="group-hover:-translate-x-1 transition-transform"></lucide-icon>
            Cerrar Sesión
          </button>
        </div>
      </aside>

      <!-- Main Content Area -->
      <main class="flex-1 flex flex-col min-w-0 h-full relative z-0">
        
        <!-- Topbar móvil -->
        <header class="md:hidden h-16 border-b border-border-subtle flex items-center px-4 bg-bg-surface/80 backdrop-blur-md sticky top-0 z-30 shrink-0">
          <button 
            (click)="toggleMobileMenu()" 
            class="p-2 -ml-2 mr-2 text-text-secondary hover:text-text-primary hover:bg-bg-main rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
            aria-label="Toggle menu"
          >
            <lucide-icon [img]="Menu" [size]="24"></lucide-icon>
          </button>
          <div class="flex items-center">
            <div class="w-6 h-6 rounded-sm bg-accent-primary flex items-center justify-center mr-2 shadow-[0_0_10px_rgba(223,227,29,0.3)]">
              <span class="text-text-inverse font-bold text-xs">PR</span>
            </div>
            <span class="text-lg font-bold text-text-primary tracking-tight">Protech</span>
          </div>
        </header>

        <!-- Contenido dinámico scrollable -->
        <div class="flex-1 p-4 sm:p-6 lg:p-10 overflow-y-auto custom-scrollbar scroll-smooth">
          <div class="max-w-7xl mx-auto w-full">
            <router-outlet></router-outlet>
          </div>
        </div>
        
      </main>

    </div>
  `,
  styles: [`
    .custom-scrollbar::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
      background: transparent;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 10px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
      background: rgba(255, 255, 255, 0.2);
    }
  `]
})
export class AdminLayoutComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly authService = inject(AuthService);
  private readonly toast = inject(ToastService);

  isMobileMenuOpen = false;

  readonly LayoutDashboard = LayoutDashboard;
  readonly ShoppingBag = ShoppingBag;
  readonly Users = Users;
  readonly PackageSearch = PackageSearch;
  readonly LogOut = LogOut;
  readonly Settings = Settings;
  readonly FolderTree = FolderTree;
  readonly Tag = Tag;
  readonly Menu = Menu;
  readonly X = X;

  ngOnInit(): void {
    this.checkStockAlerts();
  }

  toggleMobileMenu() {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  closeMobileMenu() {
    this.isMobileMenuOpen = false;
  }

  logout() {
    this.authService.logout();
  }

  private checkStockAlerts(): void {
    this.adminService.getProductos({ page: 1, page_size: 1 }).subscribe({
      next: (response) => {
        const meta = response.meta ?? {};
        const bajoStock = this.toCount(meta['bajo_stock']);
        const agotados = this.toCount(meta['agotados']);

        if (bajoStock <= 0 && agotados <= 0) {
          return;
        }

        const message = this.buildStockAlertMessage(bajoStock, agotados);
        this.toast.warning(message, 'Alerta de stock', 5200);
      },
    });
  }

  private buildStockAlertMessage(bajoStock: number, agotados: number): string {
    const parts: string[] = [];

    if (agotados > 0) {
      parts.push(`${agotados} producto${agotados === 1 ? '' : 's'} sin stock`);
    }

    if (bajoStock > 0) {
      parts.push(`${bajoStock} producto${bajoStock === 1 ? '' : 's'} con stock minimo`);
    }

    return `Hay ${parts.join(' y ')}. Reponer inventario recomendado.`;
  }

  private toCount(value: unknown): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
}

import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterModule } from '@angular/router';
import { LucideAngularModule, Search, ShoppingBag, User, Menu, LogOut } from 'lucide-angular';
import { CartService } from '../../../core/services/cart.service';
import { AuthService } from '../../../core/services/auth.service';
import { CartSidebarComponent } from '../../../shared/components/cart-sidebar/cart-sidebar.component';

@Component({
  selector: 'app-public-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterModule, LucideAngularModule, CartSidebarComponent],
  template: `
    <div class="min-h-screen flex flex-col bg-bg-main text-text-primary">
      
      <!-- Navbar -->
      <header class="sticky top-0 z-50 bg-bg-main/90 backdrop-blur-md border-b border-border-subtle">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          <!-- Logo -->
          <div class="flex-shrink-0 flex items-center cursor-pointer" routerLink="/">
            <div class="w-8 h-8 rounded-sm bg-accent-primary flex items-center justify-center mr-3">
              <span class="text-text-inverse font-bold font-sans tracking-tighter">PR</span>
            </div>
            <span class="text-xl font-bold tracking-tight">Protech</span>
          </div>

          <!-- Navigation Links (Desktop) -->
          <nav class="hidden md:flex space-x-8">
            <a routerLink="/" class="text-text-primary font-medium transition-all duration-200 hover:text-accent-primary hover:-translate-y-0.5 cursor-pointer">Catálogo</a>
            <a href="#" class="text-text-secondary transition-all duration-200 hover:text-text-primary hover:-translate-y-0.5 cursor-pointer">Categorías</a>
            <a href="#" class="text-text-secondary transition-all duration-200 hover:text-text-primary hover:-translate-y-0.5 cursor-pointer">Marcas</a>
            <a href="#" class="text-text-secondary transition-all duration-200 hover:text-text-primary hover:-translate-y-0.5 cursor-pointer">Nosotros</a>
          </nav>

          <!-- Icons -->
          <div class="flex items-center space-x-5">
            <button class="text-text-secondary hover:text-text-primary transition-all duration-200 hover:scale-110 active:scale-95 focus:outline-none cursor-pointer" aria-label="Buscar">
              <lucide-icon [img]="Search" [size]="20"></lucide-icon>
            </button>
            
            <!-- Login / Profile -->
            <button 
              *ngIf="!authService.isAuthenticated()"
              class="text-text-secondary hover:text-text-primary transition-all duration-200 hover:scale-110 active:scale-95 focus:outline-none cursor-pointer" 
              aria-label="Iniciar sesión"
              routerLink="/auth/login"
            >
              <lucide-icon [img]="User" [size]="20"></lucide-icon>
            </button>

            <div *ngIf="authService.isAuthenticated()" class="flex items-center space-x-4">
              <button 
                *ngIf="authService.isAdmin()"
                class="text-accent-primary hover:text-accent-hover transition-all duration-200 hover:scale-110 active:scale-95 focus:outline-none cursor-pointer" 
                aria-label="Panel de Administración"
                routerLink="/admin"
              >
                <lucide-icon [img]="User" [size]="20"></lucide-icon>
              </button>

              <button 
                (click)="authService.logout()"
                class="text-text-secondary hover:text-red-400 transition-all duration-200 hover:scale-110 active:scale-95 focus:outline-none cursor-pointer" 
                aria-label="Cerrar sesión"
              >
                <lucide-icon [img]="LogOut" [size]="20"></lucide-icon>
              </button>
            </div>

            <!-- Cart Toggle -->
            <button 
              (click)="isCartOpen.set(true)"
              class="relative text-text-secondary hover:text-text-primary transition-all duration-200 hover:scale-110 active:scale-95 focus:outline-none group cursor-pointer" 
              aria-label="Carrito"
            >
              <lucide-icon [img]="ShoppingBag" [size]="20"></lucide-icon>
              <!-- Cart Badge -->
              <span 
                *ngIf="cartService.totalItems() > 0"
                class="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent-primary text-[10px] font-bold text-text-inverse ring-2 ring-bg-main group-hover:scale-110 transition-transform"
              >
                {{ cartService.totalItems() }}
              </span>
            </button>

            <!-- Mobile Menu -->
            <button class="md:hidden text-text-secondary hover:text-text-primary focus:outline-none ml-2" aria-label="Menú">
              <lucide-icon [img]="Menu" [size]="24"></lucide-icon>
            </button>
          </div>
        </div>
      </header>

      <!-- Main Content Area -->
      <main class="flex-grow">
        <router-outlet></router-outlet>
      </main>

      <!-- Footer -->
      <footer class="bg-bg-surface border-t border-border-subtle pt-16 pb-8">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div class="md:col-span-1">
              <div class="flex items-center mb-4">
                <div class="w-6 h-6 rounded-sm bg-accent-primary flex items-center justify-center mr-2">
                  <span class="text-text-inverse font-bold text-xs tracking-tighter">PR</span>
                </div>
                <span class="text-lg font-bold">Protech</span>
              </div>
              <p class="text-text-secondary text-sm leading-relaxed">
                Equipamiento premium para el profesional moderno. Elegancia, rendimiento y calidad inigualable en cada dispositivo.
              </p>
            </div>
            
            <div>
              <h4 class="text-text-primary font-bold mb-4">Tienda</h4>
              <ul class="space-y-2 text-sm text-text-secondary">
                <li><a href="#" class="hover:text-accent-primary transition-colors">Todos los productos</a></li>
                <li><a href="#" class="hover:text-accent-primary transition-colors">Nuevos ingresos</a></li>
                <li><a href="#" class="hover:text-accent-primary transition-colors">Ofertas</a></li>
              </ul>
            </div>
            
            <div>
              <h4 class="text-text-primary font-bold mb-4">Soporte</h4>
              <ul class="space-y-2 text-sm text-text-secondary">
                <li><a href="#" class="hover:text-accent-primary transition-colors">Preguntas Frecuentes</a></li>
                <li><a href="#" class="hover:text-accent-primary transition-colors">Envíos y Devoluciones</a></li>
                <li><a href="#" class="hover:text-accent-primary transition-colors">Contáctanos</a></li>
              </ul>
            </div>

            <div>
              <h4 class="text-text-primary font-bold mb-4">Mantente al día</h4>
              <p class="text-text-secondary text-sm mb-4">Suscríbete a nuestro boletín para lanzamientos exclusivos.</p>
              <div class="flex">
                <input type="email" placeholder="Correo electrónico" class="bg-bg-main border border-border-subtle rounded-l-sm px-4 py-2 text-sm w-full focus:outline-none focus:border-accent-primary text-text-primary">
                <button class="bg-accent-primary text-text-inverse font-medium px-4 py-2 rounded-r-sm hover:bg-accent-hover transition-colors text-sm">
                  Suscribirse
                </button>
              </div>
            </div>
          </div>
          
          <div class="border-t border-border-subtle pt-8 flex flex-col md:flex-row justify-between items-center text-xs text-text-secondary">
            <p>&copy; 2026 Protech Inc. Todos los derechos reservados.</p>
            <div class="flex space-x-4 mt-4 md:mt-0">
              <a href="#" class="hover:text-text-primary">Política de Privacidad</a>
              <a href="#" class="hover:text-text-primary">Términos de Servicio</a>
            </div>
          </div>
        </div>
      </footer>
      
      <!-- Shopping Cart Sidebar -->
      <app-cart-sidebar [isOpen]="isCartOpen()" (close)="isCartOpen.set(false)"></app-cart-sidebar>
    </div>
  `,
  styles: []
})
export class PublicLayoutComponent {
  cartService = inject(CartService);
  authService = inject(AuthService);
  isCartOpen = signal(false);

  readonly Search = Search;
  readonly ShoppingBag = ShoppingBag;
  readonly User = User;
  readonly Menu = Menu;
  readonly LogOut = LogOut;
}

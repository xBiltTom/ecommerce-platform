import { Component, HostListener, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { LucideAngularModule, Search, ShoppingBag, User, Menu, LogOut, ChevronDown, X } from 'lucide-angular';
import { CartService } from '../../../core/services/cart.service';
import { AuthService } from '../../../core/services/auth.service';
import { CartSidebarComponent } from '../../../shared/components/cart-sidebar/cart-sidebar.component';
import { Categoria, Marca, ProductService } from '../../../core/services/product.service';

@Component({
  selector: 'app-public-layout',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterOutlet, RouterModule, LucideAngularModule, CartSidebarComponent],
  template: `
    <div class="min-h-screen flex flex-col bg-bg-main text-text-primary">

      <!-- Navbar -->
      <header class="sticky top-0 z-50 bg-bg-main/90 backdrop-blur-md border-b border-border-subtle">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">

          <!-- Logo -->
          <div class="flex-shrink-0 flex items-center cursor-pointer" routerLink="/" (click)="closeNavigationLayers()">
            <div class="w-8 h-8 rounded-sm bg-accent-primary flex items-center justify-center mr-3">
              <span class="text-text-inverse font-bold font-sans tracking-tighter">PR</span>
            </div>
            <span class="text-xl font-bold tracking-tight">Protech</span>
          </div>

          <!-- Navigation Links (Desktop) -->
          <nav class="hidden md:flex items-center space-x-7">
            <button
              type="button"
              class="transition-all duration-200 hover:text-accent-primary hover:-translate-y-0.5 cursor-pointer"
              [ngClass]="isOnCatalogRoute() ? 'text-text-primary font-medium' : 'text-text-secondary'"
              (click)="navigateToCatalog()"
            >
              Catálogo
            </button>

            <div class="relative">
              <button
                type="button"
                class="inline-flex items-center gap-1 transition-all duration-200 hover:text-text-primary hover:-translate-y-0.5 cursor-pointer"
                [ngClass]="isCategoryMenuOpen() ? 'text-text-primary' : 'text-text-secondary'"
                (click)="toggleCategoryMenu()"
              >
                Categorías
                <lucide-icon [img]="ChevronDown" [size]="14" class="transition-transform" [ngClass]="isCategoryMenuOpen() ? 'rotate-180' : ''"></lucide-icon>
              </button>

              <div *ngIf="isCategoryMenuOpen()" class="absolute left-0 top-9 w-60 rounded-card border border-border-subtle bg-bg-surface p-2 shadow-2xl">
                <button
                  *ngFor="let category of categorias(); trackBy: trackById"
                  type="button"
                  class="w-full text-left px-3 py-2 rounded-sm text-sm text-text-secondary hover:text-text-primary hover:bg-bg-main transition-colors"
                  (click)="navigateToCategory(category.id)"
                >
                  {{ category.nombre }}
                </button>
              </div>
            </div>

            <div class="relative">
              <button
                type="button"
                class="inline-flex items-center gap-1 transition-all duration-200 hover:text-text-primary hover:-translate-y-0.5 cursor-pointer"
                [ngClass]="isBrandMenuOpen() ? 'text-text-primary' : 'text-text-secondary'"
                (click)="toggleBrandMenu()"
              >
                Marcas
                <lucide-icon [img]="ChevronDown" [size]="14" class="transition-transform" [ngClass]="isBrandMenuOpen() ? 'rotate-180' : ''"></lucide-icon>
              </button>

              <div *ngIf="isBrandMenuOpen()" class="absolute left-0 top-9 w-60 rounded-card border border-border-subtle bg-bg-surface p-2 shadow-2xl">
                <button
                  *ngFor="let brand of marcas(); trackBy: trackById"
                  type="button"
                  class="w-full text-left px-3 py-2 rounded-sm text-sm text-text-secondary hover:text-text-primary hover:bg-bg-main transition-colors"
                  (click)="navigateToBrand(brand.id)"
                >
                  {{ brand.nombre }}
                </button>
              </div>
            </div>

            <button
              type="button"
              class="text-text-secondary transition-all duration-200 hover:text-text-primary hover:-translate-y-0.5 cursor-pointer"
              (click)="scrollToFooter()"
            >
              Nosotros
            </button>
          </nav>

          <!-- Icons -->
          <div class="flex items-center space-x-5">
            <button
              class="text-text-secondary hover:text-text-primary transition-all duration-200 hover:scale-110 active:scale-95 focus:outline-none cursor-pointer"
              [ngClass]="isSearchOpen() ? 'text-accent-primary' : ''"
              aria-label="Buscar"
              type="button"
              (click)="toggleSearch()"
            >
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
                class="text-text-secondary transition-all duration-200 hover:text-text-primary hover:scale-110 active:scale-95 focus:outline-none cursor-pointer"
                [ngClass]="isOnProfileRoute() ? 'text-accent-primary' : ''"
                aria-label="Mi perfil"
                routerLink="/mi-perfil"
                (click)="closeNavigationLayers()"
              >
                <lucide-icon [img]="User" [size]="20"></lucide-icon>
              </button>

              <button
                *ngIf="authService.isAdmin()"
                class="text-accent-primary hover:text-accent-hover transition-all duration-200 hover:scale-110 active:scale-95 focus:outline-none cursor-pointer"
                aria-label="Panel de Administración"
                routerLink="/admin"
                (click)="closeNavigationLayers()"
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
            <button
              class="md:hidden text-text-secondary hover:text-text-primary focus:outline-none ml-2"
              aria-label="Menú"
              type="button"
              (click)="toggleMobileMenu()"
            >
              <lucide-icon [img]="isMobileMenuOpen() ? X : Menu" [size]="24"></lucide-icon>
            </button>
          </div>
        </div>

        <div *ngIf="isSearchOpen()" class="border-t border-border-subtle bg-bg-surface/90">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-3">
            <input
              type="search"
              class="w-full bg-bg-main border border-border-subtle rounded-pill px-4 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-primary"
              placeholder="Busca por nombre o SKU..."
              [ngModel]="headerSearch()"
              (ngModelChange)="headerSearch.set($event)"
              (keyup.enter)="submitHeaderSearch()"
            >
            <button class="text-sm px-4 py-2 rounded-pill bg-accent-primary text-text-inverse font-medium hover:bg-accent-hover transition-colors" type="button" (click)="submitHeaderSearch()">
              Buscar
            </button>
          </div>
        </div>

        <div *ngIf="isMobileMenuOpen()" class="md:hidden border-t border-border-subtle bg-bg-surface/95">
          <div class="max-w-7xl mx-auto px-4 py-4 space-y-5">
            <button type="button" class="w-full text-left text-text-primary font-medium" (click)="navigateToCatalog()">Catálogo</button>

            <button
              *ngIf="authService.isAuthenticated()"
              type="button"
              class="w-full text-left text-text-secondary hover:text-text-primary"
              (click)="goToProfile()"
            >
              Mi perfil
            </button>

            <div>
              <p class="text-xs uppercase tracking-wider text-text-secondary mb-2">Categorías</p>
              <div class="grid grid-cols-2 gap-2">
                <button
                  *ngFor="let category of categorias(); trackBy: trackById"
                  type="button"
                  class="text-left text-sm px-3 py-2 rounded-sm border border-border-subtle text-text-secondary hover:text-text-primary hover:border-accent-primary/50"
                  (click)="navigateToCategory(category.id)"
                >
                  {{ category.nombre }}
                </button>
              </div>
            </div>

            <div>
              <p class="text-xs uppercase tracking-wider text-text-secondary mb-2">Marcas</p>
              <div class="grid grid-cols-2 gap-2">
                <button
                  *ngFor="let brand of marcas(); trackBy: trackById"
                  type="button"
                  class="text-left text-sm px-3 py-2 rounded-sm border border-border-subtle text-text-secondary hover:text-text-primary hover:border-accent-primary/50"
                  (click)="navigateToBrand(brand.id)"
                >
                  {{ brand.nombre }}
                </button>
              </div>
            </div>

            <button type="button" class="w-full text-left text-text-secondary hover:text-text-primary" (click)="scrollToFooter()">Nosotros</button>
          </div>
        </div>
      </header>

      <!-- Main Content Area -->
      <main class="flex-grow">
        <router-outlet></router-outlet>
      </main>

      <!-- Footer -->
      <footer id="site-footer" class="bg-bg-surface border-t border-border-subtle pt-16 pb-8">
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
                <li><button type="button" class="hover:text-accent-primary transition-colors cursor-pointer" (click)="navigateToCatalog()">Todos los productos</button></li>
                <li><button type="button" class="hover:text-accent-primary transition-colors cursor-pointer" (click)="navigateToCatalog('reciente')">Nuevos ingresos</button></li>
                <li><button type="button" class="hover:text-accent-primary transition-colors cursor-pointer" (click)="navigateToCatalog('precio_desc')">Premium</button></li>
              </ul>
            </div>

            <div>
              <h4 class="text-text-primary font-bold mb-4">Soporte</h4>
              <ul class="space-y-2 text-sm text-text-secondary">
                <li><a href="#site-footer" class="hover:text-accent-primary transition-colors">Preguntas Frecuentes</a></li>
                <li><a href="#site-footer" class="hover:text-accent-primary transition-colors">Envíos y Devoluciones</a></li>
                <li><a href="#site-footer" class="hover:text-accent-primary transition-colors">Contáctanos</a></li>
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
export class PublicLayoutComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly router = inject(Router);
  private readonly productService = inject(ProductService);

  cartService = inject(CartService);
  authService = inject(AuthService);
  isCartOpen = signal(false);
  isSearchOpen = signal(false);
  isMobileMenuOpen = signal(false);
  isCategoryMenuOpen = signal(false);
  isBrandMenuOpen = signal(false);
  headerSearch = signal('');
  categorias = signal<Categoria[]>([]);
  marcas = signal<Marca[]>([]);

  readonly Search = Search;
  readonly ShoppingBag = ShoppingBag;
  readonly User = User;
  readonly Menu = Menu;
  readonly LogOut = LogOut;
  readonly ChevronDown = ChevronDown;
  readonly X = X;

  ngOnInit() {
    this.productService
      .getCategorias()
      .pipe(takeUntil(this.destroy$))
      .subscribe((res) => this.categorias.set(res.items));

    this.productService
      .getMarcas()
      .pipe(takeUntil(this.destroy$))
      .subscribe((res) => this.marcas.set(res.items));
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  @HostListener('document:keydown.escape')
  onEscapePressed() {
    this.closeNavigationLayers();
  }

  isOnCatalogRoute(): boolean {
    const currentPath = this.router.url.split('?')[0].split('#')[0];
    return currentPath === '/';
  }

  isOnProfileRoute(): boolean {
    const currentPath = this.router.url.split('?')[0].split('#')[0];
    return currentPath === '/mi-perfil';
  }

  toggleSearch() {
    this.isSearchOpen.update((value) => !value);
    this.isMobileMenuOpen.set(false);
    this.isCategoryMenuOpen.set(false);
    this.isBrandMenuOpen.set(false);
  }

  toggleMobileMenu() {
    this.isMobileMenuOpen.update((value) => !value);
    this.isSearchOpen.set(false);
    this.isCategoryMenuOpen.set(false);
    this.isBrandMenuOpen.set(false);
  }

  toggleCategoryMenu() {
    this.isCategoryMenuOpen.update((value) => !value);
    this.isBrandMenuOpen.set(false);
    this.isSearchOpen.set(false);
    this.isMobileMenuOpen.set(false);
  }

  toggleBrandMenu() {
    this.isBrandMenuOpen.update((value) => !value);
    this.isCategoryMenuOpen.set(false);
    this.isSearchOpen.set(false);
    this.isMobileMenuOpen.set(false);
  }

  closeNavigationLayers() {
    this.isSearchOpen.set(false);
    this.isMobileMenuOpen.set(false);
    this.isCategoryMenuOpen.set(false);
    this.isBrandMenuOpen.set(false);
  }

  submitHeaderSearch() {
    const term = this.headerSearch().trim();
    this.closeNavigationLayers();

    void this.router.navigate(['/'], {
      queryParams: {
        buscar: term || null,
        page: null,
      },
    });
  }

  navigateToCatalog(orden: 'reciente' | 'precio_desc' = 'reciente') {
    this.closeNavigationLayers();

    void this.router.navigate(['/'], {
      queryParams: orden === 'reciente' ? {} : { orden, page: null },
    });
  }

  goToProfile() {
    this.closeNavigationLayers();
    void this.router.navigate(['/mi-perfil']);
  }

  navigateToCategory(categoryId: number) {
    this.closeNavigationLayers();

    void this.router.navigate(['/'], {
      queryParams: {
        categoria_id: categoryId,
        page: null,
      },
    });
  }

  navigateToBrand(brandId: number) {
    this.closeNavigationLayers();

    void this.router.navigate(['/'], {
      queryParams: {
        marca_id: brandId,
        page: null,
      },
    });
  }

  scrollToFooter() {
    this.closeNavigationLayers();

    void this.router.navigate(['/'], {
      fragment: 'site-footer',
    }).then(() => {
      window.setTimeout(() => {
        const footer = document.getElementById('site-footer');
        footer?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 30);
    });
  }

  trackById(index: number, item: { id: number }) {
    return item.id;
  }
}

import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { LucideAngularModule, ArrowLeft, Truck, ShieldCheck, ChevronRight, Plus, Minus, AlertCircle } from 'lucide-angular';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import { ProductService, ProductoDetallePublico } from '../../../core/services/product.service';
import { SeoService } from '../../../core/services/seo.service';
import { CartService } from '../../../core/services/cart.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule, ButtonComponent, BadgeComponent],
  template: `
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <!-- Breadcrumbs -->
      <nav class="flex items-center text-sm text-text-secondary mb-10">
        <a routerLink="/" class="hover:text-accent-primary transition-all duration-200 hover:-translate-y-0.5 cursor-pointer flex items-center gap-2">
          <lucide-icon [img]="ArrowLeft" [size]="16"></lucide-icon> Catálogo
        </a>
        <lucide-icon [img]="ChevronRight" [size]="14" class="mx-2 opacity-50"></lucide-icon>
        <span class="cursor-default">{{ product()?.categoria_nombre || 'Categoría' }}</span>
        <lucide-icon [img]="ChevronRight" [size]="14" class="mx-2 opacity-50"></lucide-icon>
        <span class="text-text-primary font-medium truncate cursor-default">{{ product()?.nombre || 'Cargando...' }}</span>
      </nav>

      <!-- Skeleton Loading -->
      <div *ngIf="loading()" class="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
        <div class="aspect-square bg-bg-surface animate-pulse rounded-card"></div>
        <div class="space-y-6">
          <div class="h-8 bg-bg-surface animate-pulse w-3/4 rounded"></div>
          <div class="h-6 bg-bg-surface animate-pulse w-1/4 rounded"></div>
          <div class="h-32 bg-bg-surface animate-pulse w-full rounded"></div>
          <div class="h-12 bg-bg-surface animate-pulse w-1/2 rounded"></div>
        </div>
      </div>

      <!-- Error State -->
      <div *ngIf="!loading() && error()" class="flex flex-col items-center justify-center py-24 text-center">
        <div class="w-16 h-16 mb-5 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
          <lucide-icon [img]="AlertCircle" [size]="28"></lucide-icon>
        </div>
        <h2 class="text-2xl font-bold text-text-primary mb-2">Producto no encontrado</h2>
        <p class="text-text-secondary mb-6">{{ error() }}</p>
        <a routerLink="/">
          <app-button variant="secondary">Volver al catálogo</app-button>
        </a>
      </div>

      <!-- Main Content -->
      <div *ngIf="!loading() && product()" class="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
        
        <!-- Image Gallery -->
        <div class="flex flex-col gap-4">
          <div 
            class="w-full aspect-square border border-border-subtle rounded-card overflow-hidden flex items-center justify-center p-8 transition-transform duration-300"
            [ngClass]="requiresWhiteBg() ? 'bg-white' : 'bg-bg-surface'"
          >
            <img 
              [src]="product()?.imagen_url || 'https://placehold.co/800x800/1E293B/38BDF8?text=SIN+IMAGEN'" 
              [alt]="product()?.nombre" 
              class="w-full h-full object-contain hover:scale-110 transition-transform duration-500 cursor-zoom-in"
              (error)="onImageError($event)"
            >
          </div>
          <!-- Thumbnails -->
          <div class="grid grid-cols-4 gap-4">
            <div 
              class="aspect-square border-2 border-accent-primary rounded-sm opacity-100 p-2 cursor-pointer transition-transform duration-200 active:scale-95"
              [ngClass]="requiresWhiteBg() ? 'bg-white' : 'bg-bg-surface'"
            >
              <img [src]="product()?.imagen_url || 'https://placehold.co/400x400/1E293B/38BDF8?text=IMG'" [alt]="product()?.nombre" class="w-full h-full object-contain" (error)="onImageError($event)">
            </div>
            <div *ngFor="let i of [1,2,3]" class="aspect-square bg-bg-surface border border-border-subtle rounded-sm opacity-50 hover:opacity-100 transition-all duration-200 hover:border-accent-primary/50 p-2 cursor-pointer active:scale-95" [ngClass]="requiresWhiteBg() ? 'bg-white' : 'bg-bg-surface'">
               <img [src]="product()?.imagen_url || 'https://placehold.co/400x400/1E293B/38BDF8?text=IMG'" [alt]="product()?.nombre" class="w-full h-full object-contain grayscale hover:grayscale-0 transition-all duration-300" (error)="onImageError($event)">
            </div>
          </div>
        </div>

        <!-- Product Info -->
        <div class="flex flex-col">
          <!-- Labels & Brand -->
          <div class="flex items-center gap-3 mb-4">
            <span class="text-sm font-bold tracking-wider uppercase text-text-secondary cursor-default">{{ product()?.marca_nombre }}</span>
            <app-badge *ngIf="product()?.precio_oferta" variant="default">Oferta</app-badge>
            <app-badge *ngIf="(product()?.stock_disponible ?? 0) < 5 && (product()?.stock_disponible ?? 0) > 0" variant="outline" class="text-rose-400 border-rose-500/30">Poco Stock</app-badge>
          </div>

          <h1 class="text-3xl sm:text-4xl lg:text-5xl font-bold text-text-primary tracking-tight mb-4 cursor-default">
            {{ product()?.nombre }}
          </h1>

          <!-- Price -->
          <div class="flex items-end gap-4 mb-8 cursor-default">
            <span class="text-4xl font-bold text-text-primary">
              {{ (product()?.precio_oferta || product()?.precio) | currency:'PEN':'S/ ' }}
            </span>
            <span *ngIf="product()?.precio_oferta" class="text-xl text-text-secondary line-through mb-1">
              {{ product()?.precio | currency:'PEN':'S/ ' }}
            </span>
          </div>

          <p class="text-text-secondary text-base leading-relaxed mb-10 cursor-default">
            {{ product()?.descripcion || 'Sin descripción disponible.' }}
          </p>

          <!-- Add to Cart / Actions -->
          <div class="border-y border-border-subtle py-8 mb-8 space-y-6">
            <div class="flex flex-col sm:flex-row gap-4">
              <!-- Quantity -->
              <div class="flex items-center justify-between border border-border-subtle rounded-sm bg-bg-surface w-full sm:w-32">
                <button 
                  (click)="decreaseQuantity()"
                  class="p-4 text-text-secondary hover:text-text-primary transition-all duration-200 active:scale-90 disabled:opacity-50 disabled:hover:scale-100 focus:outline-none cursor-pointer"
                  [disabled]="quantity() <= 1"
                >
                  <lucide-icon [img]="Minus" [size]="16"></lucide-icon>
                </button>
                <span class="font-medium text-text-primary cursor-default">{{ quantity() }}</span>
                <button 
                  (click)="increaseQuantity()"
                  class="p-4 text-text-secondary hover:text-text-primary transition-all duration-200 active:scale-90 disabled:opacity-50 disabled:hover:scale-100 focus:outline-none cursor-pointer"
                  [disabled]="quantity() >= (product()?.stock_disponible ?? 0)"
                >
                  <lucide-icon [img]="Plus" [size]="16"></lucide-icon>
                </button>
              </div>

              <!-- Add to Cart Button -->
              <app-button 
                variant="primary" 
                size="lg" 
                class="flex-grow"
                (onClick)="addToCart()"
                [disabled]="(product()?.stock_disponible ?? 0) === 0"
              >
                {{ (product()?.stock_disponible ?? 0) === 0 ? 'Agotado' : 'Añadir al carrito' }}
              </app-button>
            </div>
          </div>

          <!-- Feature Highlights -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-10">
            <div class="flex items-start gap-4">
              <div class="p-2 rounded-full bg-bg-surface border border-border-subtle text-text-primary">
                <lucide-icon [img]="Truck" [size]="20"></lucide-icon>
              </div>
              <div>
                <h4 class="font-bold text-sm text-text-primary">Envío Express</h4>
                <p class="text-xs text-text-secondary mt-1">Entrega garantizada en 24-48 horas laborables.</p>
              </div>
            </div>
            <div class="flex items-start gap-4">
              <div class="p-2 rounded-full bg-bg-surface border border-border-subtle text-text-primary">
                <lucide-icon [img]="ShieldCheck" [size]="20"></lucide-icon>
              </div>
              <div>
                <h4 class="font-bold text-sm text-text-primary">Garantía Extendida</h4>
                <p class="text-xs text-text-secondary mt-1">2 años de cobertura contra defectos de fábrica.</p>
              </div>
            </div>
          </div>

          <!-- Specifications -->
          <div *ngIf="product()?.especificaciones?.length" class="mt-auto">
            <h3 class="text-lg font-bold text-text-primary border-b border-border-subtle pb-4 mb-4">Especificaciones Técnicas</h3>
            <dl class="space-y-4">
              <div *ngFor="let spec of product()?.especificaciones" class="grid grid-cols-3 gap-4">
                <dt class="text-sm text-text-secondary">{{ spec.clave }}</dt>
                <dd class="text-sm font-medium text-text-primary col-span-2">{{ spec.valor }}</dd>
              </div>
            </dl>
          </div>

          <!-- SKU Info -->
          <p class="mt-8 text-xs text-text-secondary/60 cursor-default">SKU: {{ product()?.sku }}</p>
        </div>
      </div>
      
    </div>
  `,
  styles: []
})
export class ProductDetailComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private productService = inject(ProductService);
  private cartService = inject(CartService);
  private toast = inject(ToastService);
  private seoService = inject(SeoService);
  private destroy$ = new Subject<void>();

  loading = signal<boolean>(true);
  product = signal<ProductoDetallePublico | null>(null);
  error = signal<string | null>(null);
  quantity = signal<number>(1);

  readonly ArrowLeft = ArrowLeft;
  readonly ChevronRight = ChevronRight;
  readonly Truck = Truck;
  readonly ShieldCheck = ShieldCheck;
  readonly Plus = Plus;
  readonly Minus = Minus;
  readonly AlertCircle = AlertCircle;

  ngOnInit() {
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const slug = params.get('slug');
      if (slug) {
        this.fetchProductDetail(slug);
      }
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  fetchProductDetail(slug: string) {
    this.loading.set(true);
    this.error.set(null);
    this.product.set(null);
    this.quantity.set(1);

    this.productService.getProductoBySlug(slug).subscribe({
      next: (data) => {
        this.product.set(data);
        this.seoService.setProductSeo(data);
        this.loading.set(false);
      },
      error: (err) => {
        const msg = err?.error?.detail || 'No se pudo cargar el producto. Intenta de nuevo.';
        this.error.set(msg);
        this.seoService.setNoIndex('Producto no encontrado', msg);
        this.loading.set(false);
      }
    });
  }

  requiresWhiteBg(): boolean {
    const cat = this.product()?.categoria_nombre;
    return cat === 'Wearables' || cat === 'Audio';
  }

  onImageError(event: Event) {
    const img = event.target as HTMLImageElement;
    img.src = 'https://placehold.co/800x800/1E293B/38BDF8?text=SIN+IMAGEN';
  }

  increaseQuantity() {
    const max = this.product()?.stock_disponible ?? 1;
    if (this.quantity() < max) {
      this.quantity.update(q => q + 1);
    }
  }

  decreaseQuantity() {
    if (this.quantity() > 1) {
      this.quantity.update(q => q - 1);
    }
  }

  addToCart() {
    const p = this.product();
    if (p && p.stock_disponible > 0) {
      const cartItem = {
        id: p.id,
        nombre: p.nombre,
        precio: p.precio,
        precio_oferta: p.precio_oferta ?? undefined,
        imagen_url: p.imagen_url ?? undefined,
        categoria_nombre: p.categoria_nombre ?? undefined,
        stock_disponible: p.stock_disponible,
      };
      this.cartService.addToCart(cartItem, this.quantity());
    } else if (p) {
      this.toast.warning('Este producto está agotado.', 'Carrito');
    }
  }
}

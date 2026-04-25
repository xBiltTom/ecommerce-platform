import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { LucideAngularModule, ArrowLeft, Truck, ShieldCheck, ChevronRight, Plus, Minus } from 'lucide-angular';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import { ProductService } from '../../../core/services/product.service';
import { CartService } from '../../../core/services/cart.service';

export interface ProductoDetalle {
  id: number;
  sku: string;
  nombre: string;
  slug: string;
  descripcion: string;
  precio: number;
  precio_oferta?: number;
  stock_disponible: number;
  categoria_nombre?: string;
  marca_nombre?: string;
  imagen_url?: string;
  activo: boolean;
  especificaciones: { clave: string, valor: string }[];
}

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule, ButtonComponent, BadgeComponent],
  template: `
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <!-- Breadcrumbs -->
      <nav class="flex items-center text-sm text-text-secondary mb-10">
        <a routerLink="/" class="hover:text-accent-primary transition-colors flex items-center gap-2">
          <lucide-icon [img]="ArrowLeft" [size]="16"></lucide-icon> Catálogo
        </a>
        <lucide-icon [img]="ChevronRight" [size]="14" class="mx-2 opacity-50"></lucide-icon>
        <span>{{ product()?.categoria_nombre || 'Categoría' }}</span>
        <lucide-icon [img]="ChevronRight" [size]="14" class="mx-2 opacity-50"></lucide-icon>
        <span class="text-text-primary font-medium truncate">{{ product()?.nombre || 'Cargando...' }}</span>
      </nav>

      <!-- Skeleton Loading -->
      <div *ngIf="loading()" class="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
        <div class="aspect-square bg-bg-surface animate-pulse rounded-card"></div>
        <div class="space-y-6">
          <div class="h-8 bg-bg-surface animate-pulse w-3/4 rounded"></div>
          <div class="h-6 bg-bg-surface animate-pulse w-1/4 rounded"></div>
          <div class="h-32 bg-bg-surface animate-pulse w-full rounded"></div>
        </div>
      </div>

      <!-- Main Content -->
      <div *ngIf="!loading() && product()" class="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
        
        <!-- Image Gallery (Simplified for now) -->
        <div class="flex flex-col gap-4">
          <div 
            class="w-full aspect-square bg-bg-surface border border-border-subtle rounded-card overflow-hidden flex items-center justify-center p-8"
            [ngClass]="requiresWhiteBg() ? 'bg-white' : 'bg-bg-surface'"
          >
            <img [src]="product()?.imagen_url || 'assets/placeholder.png'" [alt]="product()?.nombre" class="w-full h-full object-contain">
          </div>
          <!-- Thumbnails placeholder if there were multiple images -->
          <div class="grid grid-cols-4 gap-4">
            <div class="aspect-square bg-bg-surface border-2 border-accent-primary rounded-sm opacity-100 p-2 cursor-pointer" [ngClass]="requiresWhiteBg() ? 'bg-white' : 'bg-bg-surface'">
              <img [src]="product()?.imagen_url || 'assets/placeholder.png'" [alt]="product()?.nombre" class="w-full h-full object-contain">
            </div>
            <!-- Mock other angles -->
            <div *ngFor="let i of [1,2,3]" class="aspect-square bg-bg-surface border border-border-subtle rounded-sm opacity-50 hover:opacity-100 transition-opacity p-2 cursor-pointer" [ngClass]="requiresWhiteBg() ? 'bg-white' : 'bg-bg-surface'">
               <img [src]="product()?.imagen_url || 'assets/placeholder.png'" [alt]="product()?.nombre" class="w-full h-full object-contain grayscale">
            </div>
          </div>
        </div>

        <!-- Product Info -->
        <div class="flex flex-col">
          <!-- Labels & Brand -->
          <div class="flex items-center gap-3 mb-4">
            <span class="text-sm font-bold tracking-wider uppercase text-text-secondary">{{ product()?.marca_nombre }}</span>
            <app-badge *ngIf="product()?.precio_oferta" variant="default">Oferta</app-badge>
            <app-badge *ngIf="product()?.stock_disponible! < 5" variant="outline" class="text-red-400 border-red-500/30">Poco Stock</app-badge>
          </div>

          <h1 class="text-3xl sm:text-4xl lg:text-5xl font-bold text-text-primary tracking-tight mb-4">
            {{ product()?.nombre }}
          </h1>

          <!-- Price -->
          <div class="flex items-end gap-4 mb-8">
            <span class="text-4xl font-bold text-text-primary">
              {{ (product()?.precio_oferta || product()?.precio) | currency:'USD' }}
            </span>
            <span *ngIf="product()?.precio_oferta" class="text-xl text-text-secondary line-through mb-1">
              {{ product()?.precio | currency:'USD' }}
            </span>
          </div>

          <p class="text-text-secondary text-base leading-relaxed mb-10">
            {{ product()?.descripcion }}
          </p>

          <!-- Add to Cart / Actions -->
          <div class="border-y border-border-subtle py-8 mb-8 space-y-6">
            <div class="flex flex-col sm:flex-row gap-4">
              <!-- Quantity -->
              <div class="flex items-center justify-between border border-border-subtle rounded-sm bg-bg-surface w-full sm:w-32">
                <button 
                  (click)="decreaseQuantity()"
                  class="p-4 text-text-secondary hover:text-text-primary transition-colors focus:outline-none disabled:opacity-50"
                  [disabled]="quantity() <= 1"
                >
                  <lucide-icon [img]="Minus" [size]="16"></lucide-icon>
                </button>
                <span class="font-medium text-text-primary">{{ quantity() }}</span>
                <button 
                  (click)="increaseQuantity()"
                  class="p-4 text-text-secondary hover:text-text-primary transition-colors focus:outline-none disabled:opacity-50"
                  [disabled]="quantity() >= product()!.stock_disponible"
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
                [disabled]="product()?.stock_disponible === 0"
              >
                {{ product()?.stock_disponible === 0 ? 'Agotado' : 'Añadir al carrito' }}
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
          <div class="mt-auto">
            <h3 class="text-lg font-bold text-text-primary border-b border-border-subtle pb-4 mb-4">Especificaciones Técnicas</h3>
            <dl class="space-y-4">
              <div *ngFor="let spec of product()?.especificaciones" class="grid grid-cols-3 gap-4">
                <dt class="text-sm text-text-secondary">{{ spec.clave }}</dt>
                <dd class="text-sm font-medium text-text-primary col-span-2">{{ spec.valor }}</dd>
              </div>
            </dl>
          </div>

        </div>
      </div>
      
    </div>
  `,
  styles: []
})
export class ProductDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private cartService = inject(CartService);

  loading = signal<boolean>(true);
  product = signal<ProductoDetalle | null>(null);
  quantity = signal<number>(1);

  readonly ArrowLeft = ArrowLeft;
  readonly ChevronRight = ChevronRight;
  readonly Truck = Truck;
  readonly ShieldCheck = ShieldCheck;
  readonly Plus = Plus;
  readonly Minus = Minus;

  ngOnInit() {
    // Escuchar el slug de la URL
    this.route.paramMap.subscribe(params => {
      const slug = params.get('slug');
      if (slug) {
        this.fetchProductDetail(slug);
      }
    });
  }

  fetchProductDetail(slug: string) {
    this.loading.set(true);
    // Simulación hasta conectar con backend HTTP
    setTimeout(() => {
      // Mock data
      this.product.set({
        id: 1,
        sku: 'AUD-001',
        slug: slug,
        nombre: 'CyberX Pro Headphones with Active Noise Cancelling',
        descripcion: 'Experimenta el sonido puro con la tecnología de cancelación de ruido activa de última generación. Los CyberX Pro están diseñados acústicamente para ofrecer agudos cristalinos y graves profundos sin distorsión. Batería de 40 horas, carga rápida y diseño ultraligero para comodidad durante todo el día.',
        precio: 299.99,
        precio_oferta: 249.99,
        stock_disponible: 45,
        categoria_nombre: 'Audio',
        marca_nombre: 'Sony',
        imagen_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80&auto=format&fit=crop',
        activo: true,
        especificaciones: [
          { clave: 'Cancelación de Ruido', valor: 'Activa Híbrida (ANC)' },
          { clave: 'Duración Batería', valor: 'Hasta 40 horas' },
          { clave: 'Conectividad', valor: 'Bluetooth 5.3, Multipunto' },
          { clave: 'Peso', valor: '254 gramos' }
        ]
      });
      this.loading.set(false);
    }, 600);
  }

  requiresWhiteBg(): boolean {
    const cat = this.product()?.categoria_nombre;
    // Lógica similar al catalog component para forzar fondo blanco a fotos con fondo blanco cocinado
    return cat === 'Wearables' || cat === 'Audio';
  }

  increaseQuantity() {
    const max = this.product()?.stock_disponible || 1;
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
    if (p) {
      // Mapear ProductoDetalle a ProductData para el CartService
      const cartItem = {
        id: p.id,
        nombre: p.nombre,
        precio: p.precio,
        precio_oferta: p.precio_oferta,
        imagen_url: p.imagen_url,
        categoria_nombre: p.categoria_nombre
      };
      this.cartService.addToCart(cartItem, this.quantity());
    }
  }
}

import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BadgeComponent } from '../badge/badge.component';
import { LucideAngularModule, ShoppingCart } from 'lucide-angular';

import { RouterModule } from '@angular/router';

export interface ProductData {
  id: number;
  slug?: string;
  nombre: string;
  precio: number;
  precio_oferta?: number;
  imagen_url?: string;
  categoria_nombre?: string;
  stock_disponible?: number;
}

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CommonModule, BadgeComponent, LucideAngularModule, RouterModule],
  template: `
    <div 
      class="group relative flex flex-col bg-bg-surface border border-border-subtle rounded-card overflow-hidden transition-all duration-300 hover:border-accent-primary hover:shadow-[0_0_15px_rgba(223,227,29,0.15)] h-full"
    >
      <!-- Badges flotantes -->
      <div class="absolute top-3 left-3 z-10 flex flex-col gap-2">
        <app-badge *ngIf="product.precio_oferta" variant="default">Oferta</app-badge>
        <app-badge *ngIf="isNew" variant="glass">Nuevo</app-badge>
      </div>

      <div
        *ngIf="isOutOfStock(product)"
        class="absolute top-3 left-1/2 -translate-x-1/2 z-30 px-3 py-1 rounded-pill bg-rose-500/90 text-white text-[11px] font-semibold uppercase tracking-[0.14em] shadow-lg"
      >
        Agotado
      </div>

      <!-- Contenedor de imagen -->
      <div 
        class="relative w-full aspect-square flex items-center justify-center p-6 overflow-hidden cursor-pointer"
        [ngClass]="requiresWhiteBg ? 'bg-white' : 'bg-transparent'"
        [routerLink]="['/producto', getProductSlug(product)]"
      >
        <img 
          [src]="product.imagen_url || 'https://placehold.co/400x400/1E293B/38BDF8?text=NO+IMG'" 
          [alt]="product.nombre"
          class="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105"
        />
        <!-- Overlay oscuro sutil (si no requiere fondo blanco) -->
        <div *ngIf="!requiresWhiteBg" class="absolute inset-0 bg-gradient-to-t from-bg-surface/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        
        <!-- Descuento Circular -->
        <div *ngIf="product.precio_oferta" class="absolute top-3 right-3 z-20 w-12 h-12 flex items-center justify-center rounded-full bg-accent-primary text-text-inverse font-bold text-sm shadow-lg transform rotate-[-10deg] group-hover:scale-110 transition-transform">
          -{{ getDiscountPercentage(product) }}%
        </div>
      </div>

      <!-- Detalles del producto -->
      <div class="p-5 flex flex-col flex-grow">
        <span class="text-xs font-medium text-text-secondary mb-1 uppercase tracking-wider">{{ product.categoria_nombre || 'Categoría' }}</span>
        
        <h3 
          class="text-lg font-bold text-text-primary leading-tight mb-2 cursor-pointer hover:text-accent-primary transition-colors line-clamp-2"
          [routerLink]="['/producto', getProductSlug(product)]"
        >
          {{ product.nombre }}
        </h3>
        
        <div class="mt-auto flex items-end justify-between pt-4">
          <div class="flex flex-col">
            <span *ngIf="product.precio_oferta" class="text-sm text-text-secondary line-through">
              {{ product.precio | currency:'PEN':'S/ ' }}
            </span>
            <span class="text-xl font-bold text-text-primary">
              {{ (product.precio_oferta || product.precio) | currency:'PEN':'S/ ' }}
            </span>
          </div>
          
          <button 
            class="p-2.5 rounded-full border border-border-subtle bg-transparent text-text-primary group-hover:bg-accent-primary group-hover:text-text-inverse group-hover:border-accent-primary transition-all duration-300 hover:scale-110 active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent-primary disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:group-hover:bg-transparent disabled:group-hover:text-text-primary"
            (click)="onAddToCart.emit(product); $event.stopPropagation()"
            aria-label="Add to cart"
            [disabled]="isOutOfStock(product)"
          >
            <lucide-icon [img]="ShoppingCart" [size]="18"></lucide-icon>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class ProductCardComponent {
  @Input() product!: ProductData;
  @Input() requiresWhiteBg: boolean = false;
  @Input() isNew: boolean = false;

  @Output() onAddToCart = new EventEmitter<ProductData>();
  @Output() onClick = new EventEmitter<ProductData>();
  
  readonly ShoppingCart = ShoppingCart;

  isOutOfStock(product: ProductData): boolean {
    return typeof product.stock_disponible === 'number' && product.stock_disponible <= 0;
  }

  getProductSlug(product: ProductData): string {
    if (product.slug && product.slug.trim()) {
      return product.slug;
    }

    return product.nombre
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }

  getDiscountPercentage(product: ProductData): number {
    if (!product.precio_oferta || product.precio_oferta >= product.precio) {
      return 0;
    }
    return Math.round((1 - (product.precio_oferta / product.precio)) * 100);
  }
}

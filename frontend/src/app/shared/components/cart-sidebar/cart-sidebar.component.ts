import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, X, Trash2, Plus, Minus, ArrowRight, ShoppingCart } from 'lucide-angular';
import { CartService } from '../../../core/services/cart.service';
import { ButtonComponent } from '../button/button.component';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-cart-sidebar',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, ButtonComponent, RouterModule],
  template: `
    <!-- Overlay -->
    <div 
      *ngIf="isOpen" 
      class="fixed inset-0 bg-bg-main/80 backdrop-blur-sm z-50 transition-opacity"
      (click)="close.emit()"
    ></div>

    <!-- Sidebar -->
    <div 
      class="fixed top-0 right-0 h-full w-full sm:w-[400px] bg-bg-surface border-l border-border-subtle z-50 transform transition-transform duration-300 ease-in-out flex flex-col shadow-2xl"
      [class.translate-x-0]="isOpen"
      [class.translate-x-full]="!isOpen"
    >
      <!-- Header -->
      <div class="px-6 py-5 border-b border-border-subtle flex items-center justify-between">
        <h2 class="text-lg font-bold text-text-primary flex items-center gap-2">
          Carrito 
          <span class="text-sm font-normal text-text-secondary">({{ cartService.totalItems() }})</span>
        </h2>
        <button 
          (click)="close.emit()" 
          class="p-2 -mr-2 text-text-secondary hover:text-text-primary hover:bg-bg-main rounded-full transition-all duration-300 hover:rotate-90 active:scale-90 focus:outline-none cursor-pointer"
        >
          <lucide-icon [img]="X" [size]="20"></lucide-icon>
        </button>
      </div>

      <!-- Carrito Vacío -->
      <div *ngIf="cartService.items().length === 0" class="flex-grow flex flex-col items-center justify-center p-8 text-center">
        <div class="w-16 h-16 rounded-full bg-bg-main flex items-center justify-center text-text-secondary mb-4">
          <lucide-icon [img]="ShoppingCart" [size]="24"></lucide-icon>
        </div>
        <h3 class="text-lg font-bold text-text-primary mb-2">Tu carrito está vacío</h3>
        <p class="text-text-secondary mb-6">Parece que aún no has agregado productos a tu carrito.</p>
        <app-button variant="primary" (onClick)="close.emit()">
          Continuar comprando
        </app-button>
      </div>

      <!-- Lista de Items -->
      <div *ngIf="cartService.items().length > 0" class="flex-grow overflow-y-auto p-6 space-y-6">
        <div *ngFor="let item of cartService.items()" class="flex gap-4">
          <!-- Imagen -->
          <div class="w-20 h-20 rounded-sm bg-white p-2 flex-shrink-0 border border-border-subtle cursor-pointer hover:border-accent-primary transition-colors">
            <img [src]="item.producto.imagen_url || 'assets/placeholder.png'" [alt]="item.producto.nombre" class="w-full h-full object-contain">
          </div>
          
          <!-- Detalles -->
          <div class="flex-grow flex flex-col">
            <div class="flex justify-between items-start mb-1">
              <h4 class="text-sm font-bold text-text-primary line-clamp-2 pr-4 cursor-pointer hover:text-accent-primary transition-colors">{{ item.producto.nombre }}</h4>
              <button 
                (click)="cartService.removeFromCart(item.producto.id)"
                class="text-text-secondary hover:text-red-500 transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer"
                aria-label="Eliminar"
              >
                <lucide-icon [img]="Trash2" [size]="16"></lucide-icon>
              </button>
            </div>
            
            <span class="text-text-primary font-medium text-sm mb-auto">
              {{ (item.producto.precio_oferta || item.producto.precio) | currency:'PEN':'S/ ' }}
            </span>
            
            <!-- Controles de Cantidad -->
            <div class="flex items-center gap-3 mt-2">
              <div class="flex items-center border border-border-subtle rounded-sm bg-bg-main">
                <button 
                  (click)="cartService.updateQuantity(item.producto.id, item.cantidad - 1)"
                  class="p-1 text-text-secondary hover:text-text-primary transition-all duration-200 active:scale-90 disabled:opacity-50 disabled:hover:scale-100 cursor-pointer"
                  [disabled]="item.cantidad <= 1"
                >
                  <lucide-icon [img]="Minus" [size]="14"></lucide-icon>
                </button>
                <span class="w-8 text-center text-sm font-medium text-text-primary">{{ item.cantidad }}</span>
                <button 
                  (click)="cartService.updateQuantity(item.producto.id, item.cantidad + 1)"
                  class="p-1 text-text-secondary hover:text-text-primary transition-all duration-200 active:scale-90 cursor-pointer"
                >
                  <lucide-icon [img]="Plus" [size]="14"></lucide-icon>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer / Totales -->
      <div *ngIf="cartService.items().length > 0" class="border-t border-border-subtle p-6 bg-bg-surface">
        <div class="flex items-center justify-between mb-4">
          <span class="text-text-secondary">Subtotal</span>
          <span class="text-lg font-bold text-text-primary">{{ cartService.totalAmount() | currency:'PEN':'S/ ' }}</span>
        </div>
        <p class="text-xs text-text-secondary mb-4">El costo de envío y los impuestos se calculan al pagar.</p>
        
        <app-button 
          variant="primary" 
          class="w-full justify-center" 
          size="lg"
          (onClick)="close.emit()"
          routerLink="/checkout"
        >
          Proceder al pago <lucide-icon [img]="ArrowRight" class="ml-2" [size]="18"></lucide-icon>
        </app-button>
      </div>
    </div>
  `,
  styles: []
})
export class CartSidebarComponent {
  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();

  cartService = inject(CartService);

  readonly X = X;
  readonly Trash2 = Trash2;
  readonly Plus = Plus;
  readonly Minus = Minus;
  readonly ArrowRight = ArrowRight;
  readonly ShoppingCart = ShoppingCart;
}

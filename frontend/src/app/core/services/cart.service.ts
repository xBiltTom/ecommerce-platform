import { Injectable, signal, computed, inject } from '@angular/core';
import { ProductData } from '../../shared/components/product-card/product-card.component';
import { ToastService } from './toast.service';

export interface CartItem {
  producto: ProductData;
  cantidad: number;
  subtotal: number;
}

@Injectable({
  providedIn: 'root'
})
export class CartService {
  // Estado reactivo centralizado usando Signals (Angular 16+)
  private cartItemsSignal = signal<CartItem[]>([]);
  private readonly toast = inject(ToastService);

  // Señales computadas (derivadas) para fácil consumo en la UI
  public readonly items = this.cartItemsSignal.asReadonly();
  
  public readonly totalItems = computed(() => {
    return this.cartItemsSignal().reduce((acc, item) => acc + item.cantidad, 0);
  });

  public readonly totalAmount = computed(() => {
    return this.cartItemsSignal().reduce((acc, item) => acc + item.subtotal, 0);
  });

  constructor() {
    this.loadFromLocalStorage();
  }

  public addToCart(producto: ProductData, cantidad: number = 1): void {
    this.cartItemsSignal.update(items => {
      const existingItemIndex = items.findIndex(item => item.producto.id === producto.id);
      const currentPrice = producto.precio_oferta || producto.precio;
      
      let updatedItems = [...items];
      
      if (existingItemIndex > -1) {
        // Actualiza cantidad y subtotal
        const existingItem = updatedItems[existingItemIndex];
        const newCantidad = existingItem.cantidad + cantidad;
        updatedItems[existingItemIndex] = {
          ...existingItem,
          cantidad: newCantidad,
          subtotal: newCantidad * currentPrice
        };
      } else {
        // Nuevo item
        updatedItems.push({
          producto,
          cantidad,
          subtotal: cantidad * currentPrice
        });
      }
      
      this.saveToLocalStorage(updatedItems);
      this.toast.success(`Se agregó "${producto.nombre}" al carrito.`, 'Carrito');
      return updatedItems;
    });
  }

  public removeFromCart(productoId: number): void {
    this.cartItemsSignal.update(items => {
      const updatedItems = items.filter(item => item.producto.id !== productoId);
      this.saveToLocalStorage(updatedItems);
      this.toast.info('Producto eliminado del carrito.', 'Carrito');
      return updatedItems;
    });
  }

  public updateQuantity(productoId: number, cantidad: number): void {
    if (cantidad <= 0) {
      this.removeFromCart(productoId);
      return;
    }

    this.cartItemsSignal.update(items => {
      const updatedItems = items.map(item => {
        if (item.producto.id === productoId) {
          const currentPrice = item.producto.precio_oferta || item.producto.precio;
          return {
            ...item,
            cantidad,
            subtotal: cantidad * currentPrice
          };
        }
        return item;
      });
      this.saveToLocalStorage(updatedItems);
      return updatedItems;
    });
  }

  public clearCart(): void {
    this.cartItemsSignal.set([]);
    this.saveToLocalStorage([]);
  }

  private saveToLocalStorage(items: CartItem[]): void {
    try {
      localStorage.setItem('protech_cart', JSON.stringify(items));
    } catch (e) {
      console.error('Error saving cart to local storage', e);
    }
  }

  private loadFromLocalStorage(): void {
    try {
      const stored = localStorage.getItem('protech_cart');
      if (stored) {
        this.cartItemsSignal.set(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Error loading cart from local storage', e);
    }
  }
}

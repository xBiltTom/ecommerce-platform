import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { catchError, forkJoin, map, of } from 'rxjs';
import { ProductData } from '../../shared/components/product-card/product-card.component';
import { ToastService } from './toast.service';
import { AuthService } from './auth.service';
import { SKIP_ERROR_TOAST } from '../interceptors/http-context-tokens';

export interface CartItem {
  cartItemId?: number;
  producto: ProductData;
  cantidad: number;
  subtotal: number;
}

interface BackendCartItem {
  id: number;
  producto_id: number;
  producto_nombre?: string | null;
  producto_imagen?: string | null;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

interface BackendCartResponse {
  id: number;
  estado: string;
  items: BackendCartItem[];
  total: number;
  fecha_creacion: string;
}

@Injectable({
  providedIn: 'root'
})
export class CartService {
  // Estado reactivo centralizado usando Signals (Angular 16+)
  private cartItemsSignal = signal<CartItem[]>([]);
  private readonly toast = inject(ToastService);
  private readonly authService = inject(AuthService);
  private readonly http = inject(HttpClient);

  private readonly guestStorageKey = 'protech_cart_guest';
  private readonly cartApiUrl = 'http://localhost:8000/api/v1/carrito';

  private activeUserId: string | null = null;

  // Señales computadas (derivadas) para fácil consumo en la UI
  public readonly items = this.cartItemsSignal.asReadonly();
  
  public readonly totalItems = computed(() => {
    return this.cartItemsSignal().reduce((acc, item) => acc + item.cantidad, 0);
  });

  public readonly totalAmount = computed(() => {
    return this.cartItemsSignal().reduce((acc, item) => acc + item.subtotal, 0);
  });

  private guestCartMigrated = false;
  private guestCartSyncInProgress = false;

  constructor() {
    effect(
      () => {
        const authResolved = this.authService.authResolved();
        const currentUser = this.authService.currentUser();
        const currentUserId = currentUser?.id ?? null;

        if (!authResolved) {
          return;
        }

        if (currentUserId) {
          if (this.activeUserId !== currentUserId) {
            this.activeUserId = currentUserId;
            this.syncAuthenticatedCart();
          }
          return;
        }

        this.activeUserId = null;
        this.guestCartMigrated = false;
        this.loadGuestFromLocalStorage();
      },
      { allowSignalWrites: true }
    );
  }

  private getGuestCartFromStorage(): CartItem[] {
    try {
      const stored = localStorage.getItem(this.guestStorageKey);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private syncAuthenticatedCart(): void {
    const guestItems = this.getGuestCartFromStorage();
    if (guestItems.length === 0 || this.guestCartMigrated || this.guestCartSyncInProgress) {
      this.loadRemoteCart();
      return;
    }

    this.migrateGuestCart(guestItems);
  }

  private migrateGuestCart(guestItems: CartItem[]): void {
    if (guestItems.length === 0) {
      this.loadRemoteCart();
      return;
    }

    this.guestCartSyncInProgress = true;

    const requests = guestItems.map((item) =>
      this.http.post<BackendCartResponse>(
        `${this.cartApiUrl}/items`,
        {
          producto_id: item.producto.id,
          cantidad: item.cantidad,
        },
        { context: this.getSkipToastContext() }
      ).pipe(
        map(() => item.producto.id),
        catchError(() => of<number | null>(null))
      )
    );

    forkJoin(requests).subscribe((results) => {
      const migratedProductIds = new Set(
        results.filter((productId): productId is number => productId !== null)
      );
      const failedItems = guestItems.filter(
        (item) => !migratedProductIds.has(item.producto.id)
      );

      if (failedItems.length === 0) {
        localStorage.removeItem(this.guestStorageKey);
        this.guestCartMigrated = true;
        this.toast.info('Tu carrito ha sido sincronizado.', 'Carrito');
      } else {
        this.saveGuestToLocalStorage(failedItems);
        this.guestCartMigrated = false;
      }

      this.guestCartSyncInProgress = false;
      this.loadRemoteCart();
    });
  }

  public addToCart(producto: ProductData, cantidad: number = 1): void {
    if (this.isAuthenticatedCustomer()) {
      this.http.post<BackendCartResponse>(`${this.cartApiUrl}/items`, {
        producto_id: producto.id,
        cantidad,
      }).subscribe({
        next: (cart) => {
          this.setItemsFromBackendCart(cart);
          this.toast.success(`Se agregó "${producto.nombre}" al carrito.`, 'Carrito');
        },
        error: () => {},
      });
      return;
    }

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
      
      this.saveGuestToLocalStorage(updatedItems);
      this.toast.success(`Se agregó "${producto.nombre}" al carrito.`, 'Carrito');
      return updatedItems;
    });
  }

  public removeFromCart(productoId: number): void {
    if (this.isAuthenticatedCustomer()) {
      const item = this.cartItemsSignal().find(entry => entry.producto.id === productoId);
      if (!item?.cartItemId) {
        this.loadRemoteCart();
        return;
      }

      this.http.delete<{ message: string }>(`${this.cartApiUrl}/items/${item.cartItemId}`).subscribe({
        next: () => {
          this.cartItemsSignal.update(items => items.filter(entry => entry.producto.id !== productoId));
          this.toast.info('Producto eliminado del carrito.', 'Carrito');
          this.loadRemoteCart(true);
        },
        error: () => {},
      });
      return;
    }

    this.cartItemsSignal.update(items => {
      const updatedItems = items.filter(item => item.producto.id !== productoId);
      this.saveGuestToLocalStorage(updatedItems);
      this.toast.info('Producto eliminado del carrito.', 'Carrito');
      return updatedItems;
    });
  }

  public updateQuantity(productoId: number, cantidad: number): void {
    if (cantidad <= 0) {
      this.removeFromCart(productoId);
      return;
    }

    if (this.isAuthenticatedCustomer()) {
      const item = this.cartItemsSignal().find(entry => entry.producto.id === productoId);
      if (!item?.cartItemId) {
        this.loadRemoteCart();
        return;
      }

      this.http.put<BackendCartResponse>(`${this.cartApiUrl}/items/${item.cartItemId}`, { cantidad }).subscribe({
        next: (cart) => {
          this.setItemsFromBackendCart(cart);
        },
        error: () => {},
      });
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
      this.saveGuestToLocalStorage(updatedItems);
      return updatedItems;
    });
  }

  public clearCart(): void {
    if (this.isAuthenticatedCustomer()) {
      this.cartItemsSignal.set([]);

      this.http.delete<{ message: string }>(`${this.cartApiUrl}`, {
        context: this.getSkipToastContext(),
      }).pipe(
        catchError(() => of(null))
      ).subscribe(() => {
        this.loadRemoteCart(true);
      });
      return;
    }

    this.cartItemsSignal.set([]);
    this.saveGuestToLocalStorage([]);
  }

  public reloadCart(): void {
    if (this.isAuthenticatedCustomer()) {
      this.loadRemoteCart();
      return;
    }

    this.loadGuestFromLocalStorage();
  }

  private isAuthenticatedCustomer(): boolean {
    return this.authService.isAuthenticated() && !!this.authService.currentUser()?.id;
  }

  private getSkipToastContext(): HttpContext {
    return new HttpContext().set(SKIP_ERROR_TOAST, true);
  }

  private loadRemoteCart(silent = false): void {
    this.http.get<BackendCartResponse>(`${this.cartApiUrl}`, {
      context: this.getSkipToastContext(),
    }).pipe(
      catchError(() => of<BackendCartResponse | null>(null))
    ).subscribe((cart) => {
      if (!cart) {
        if (!silent) {
          this.cartItemsSignal.set([]);
        }
        return;
      }

      this.setItemsFromBackendCart(cart);
    });
  }

  private setItemsFromBackendCart(cart: BackendCartResponse): void {
    const mappedItems: CartItem[] = (cart.items ?? []).map((item) => ({
      cartItemId: item.id,
      producto: {
        id: item.producto_id,
        nombre: item.producto_nombre || `Producto #${item.producto_id}`,
        precio: Number(item.precio_unitario),
        imagen_url: item.producto_imagen ?? undefined,
      },
      cantidad: item.cantidad,
      subtotal: Number(item.subtotal),
    }));

    this.cartItemsSignal.set(mappedItems);
  }

  private saveGuestToLocalStorage(items: CartItem[]): void {
    try {
      localStorage.setItem(this.guestStorageKey, JSON.stringify(items));
    } catch (e) {
      console.error('Error saving cart to local storage', e);
    }
  }

  private loadGuestFromLocalStorage(): void {
    try {
      const stored = localStorage.getItem(this.guestStorageKey);
      if (stored) {
        this.cartItemsSignal.set(JSON.parse(stored));
      } else {
        this.cartItemsSignal.set([]);
      }
    } catch (e) {
      console.error('Error loading cart from local storage', e);
    }
  }
}

import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { catchError, firstValueFrom, forkJoin, map, Observable, of } from 'rxjs';
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
  producto_stock_disponible?: number | null;
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
  private cartItemsSignal = signal<CartItem[]>([]);
  private readonly toast = inject(ToastService);
  private readonly authService = inject(AuthService);
  private readonly http = inject(HttpClient);

  private readonly guestStorageKey = 'protech_cart_guest';
  private readonly cartApiUrl = 'http://localhost:8000/api/v1/carrito';
  private readonly remoteSyncDelayMs = 1200;
  private readonly remoteSyncRetryDelayMs = 3000;

  private activeUserId: string | null = null;
  private guestCartMigrated = false;
  private guestCartSyncInProgress = false;
  private remoteSyncTimer: ReturnType<typeof setTimeout> | null = null;
  private remoteSyncInProgress = false;
  private pendingRemoteSnapshot: CartItem[] | null = null;
  private pendingSyncPromise: Promise<void> | null = null;

  public readonly items = this.cartItemsSignal.asReadonly();

  public readonly totalItems = computed(() => {
    return this.cartItemsSignal().reduce((acc, item) => acc + item.cantidad, 0);
  });

  public readonly totalAmount = computed(() => {
    return this.cartItemsSignal().reduce((acc, item) => acc + item.subtotal, 0);
  });

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
        this.cancelPendingRemoteSync();
        this.guestCartMigrated = false;
        this.loadGuestFromLocalStorage();
      },
      { allowSignalWrites: true }
    );
  }

  public addToCart(producto: ProductData, cantidad: number = 1): void {
    const availableStock = this.getAvailableStock(producto);
    if (availableStock !== null && availableStock <= 0) {
      this.toast.warning('Este producto está agotado.', 'Carrito');
      return;
    }

    if (this.isAuthenticatedCustomer()) {
      const result = this.mergeLocalCartItem(this.cartItemsSignal(), producto, cantidad);
      if (!result.updated) {
        this.toast.warning(result.message, 'Carrito');
        return;
      }

      this.cartItemsSignal.set(result.items);
      this.scheduleAuthenticatedSync();
      this.toast.success(`Se agregó "${producto.nombre}" al carrito.`, 'Carrito');
      return;
    }

    this.cartItemsSignal.update((items) => {
      const result = this.mergeLocalCartItem(items, producto, cantidad);
      if (!result.updated) {
        this.toast.warning(result.message, 'Carrito');
        return items;
      }

      this.saveGuestToLocalStorage(result.items);
      this.toast.success(`Se agregó "${producto.nombre}" al carrito.`, 'Carrito');
      return result.items;
    });
  }

  public removeFromCart(productoId: number): void {
    if (this.isAuthenticatedCustomer()) {
      this.cartItemsSignal.update((items) => items.filter((entry) => entry.producto.id !== productoId));
      this.scheduleAuthenticatedSync();
      this.toast.info('Producto eliminado del carrito.', 'Carrito');
      return;
    }

    this.cartItemsSignal.update((items) => {
      const updatedItems = items.filter((item) => item.producto.id !== productoId);
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
      this.cartItemsSignal.update((items) => items.map((item) => {
        if (item.producto.id === productoId) {
          const allowed = this.clampToStock(item.producto, cantidad, item.cantidad);
          if (allowed !== cantidad) {
            this.toast.warning('Stock insuficiente para esa cantidad.', 'Carrito');
          }
          return {
            ...item,
            cantidad: allowed,
            subtotal: this.calculateSubtotal(item.producto, allowed),
          };
        }
        return item;
      }));
      this.scheduleAuthenticatedSync();
      return;
    }

    this.cartItemsSignal.update((items) => {
      const updatedItems = items.map((item) => {
        if (item.producto.id === productoId) {
          const allowed = this.clampToStock(item.producto, cantidad, item.cantidad);
          if (allowed !== cantidad) {
            this.toast.warning('Stock insuficiente para esa cantidad.', 'Carrito');
          }
          return {
            ...item,
            cantidad: allowed,
            subtotal: this.calculateSubtotal(item.producto, allowed),
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
      this.cancelPendingRemoteSync();
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
      if (this.hasPendingRemoteChanges()) {
        void this.flushPendingSync().catch(() => {});
        return;
      }

      this.loadRemoteCart();
      return;
    }

    this.loadGuestFromLocalStorage();
  }

  public async flushPendingSync(): Promise<void> {
    if (!this.isAuthenticatedCustomer()) {
      this.cancelPendingRemoteSync();
      return;
    }

    this.clearRemoteSyncTimer();

    if (this.remoteSyncInProgress) {
      await this.pendingSyncPromise;
      if (this.pendingRemoteSnapshot) {
        return this.flushPendingSync();
      }
      return;
    }

    if (!this.pendingRemoteSnapshot) {
      return;
    }

    const syncUserId = this.activeUserId;
    const snapshot = this.cloneCartItems(this.pendingRemoteSnapshot);
    this.pendingRemoteSnapshot = null;
    this.remoteSyncInProgress = true;

    const syncPromise = this.syncRemoteCartSnapshot(syncUserId, snapshot)
      .catch((error) => {
        if (syncUserId && syncUserId === this.activeUserId && this.isAuthenticatedCustomer() && !this.pendingRemoteSnapshot) {
          this.pendingRemoteSnapshot = this.cloneCartItems(this.cartItemsSignal());
        }
        if (syncUserId && syncUserId === this.activeUserId && this.isAuthenticatedCustomer()) {
          this.scheduleAuthenticatedSync(this.remoteSyncRetryDelayMs, false);
        }
        throw error;
      })
      .finally(() => {
        this.remoteSyncInProgress = false;
        this.pendingSyncPromise = null;
      });

    this.pendingSyncPromise = syncPromise;
    await syncPromise;
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

  private isAuthenticatedCustomer(): boolean {
    return this.authService.isAuthenticated() && !!this.authService.currentUser()?.id;
  }

  private hasPendingRemoteChanges(): boolean {
    return !!this.pendingRemoteSnapshot || !!this.remoteSyncTimer || this.remoteSyncInProgress;
  }

  private scheduleAuthenticatedSync(delayMs = this.remoteSyncDelayMs, captureSnapshot = true): void {
    if (!this.isAuthenticatedCustomer()) {
      return;
    }

    if (captureSnapshot) {
      this.pendingRemoteSnapshot = this.cloneCartItems(this.cartItemsSignal());
    }

    this.clearRemoteSyncTimer();
    this.remoteSyncTimer = setTimeout(() => {
      void this.flushPendingSync().catch(() => {});
    }, delayMs);
  }

  private clearRemoteSyncTimer(): void {
    if (this.remoteSyncTimer) {
      clearTimeout(this.remoteSyncTimer);
      this.remoteSyncTimer = null;
    }
  }

  private cancelPendingRemoteSync(): void {
    this.clearRemoteSyncTimer();
    this.pendingRemoteSnapshot = null;
    this.pendingSyncPromise = null;
    this.remoteSyncInProgress = false;
  }

  private getSkipToastContext(): HttpContext {
    return new HttpContext().set(SKIP_ERROR_TOAST, true);
  }

  private async syncRemoteCartSnapshot(syncUserId: string | null, snapshot: CartItem[]): Promise<void> {
    if (!syncUserId) {
      return;
    }

    const remoteCart = await firstValueFrom(
      this.http.get<BackendCartResponse>(`${this.cartApiUrl}`, {
        context: this.getSkipToastContext(),
      })
    );

    const operations = this.buildRemoteSyncOperations(remoteCart.items ?? [], snapshot);
    if (operations.length > 0) {
      await firstValueFrom(forkJoin(operations));
    }

    const refreshedCart = await firstValueFrom(
      this.http.get<BackendCartResponse>(`${this.cartApiUrl}`, {
        context: this.getSkipToastContext(),
      })
    );

    if (syncUserId !== this.activeUserId || !this.isAuthenticatedCustomer()) {
      return;
    }

    this.setItemsFromBackendCart(refreshedCart);
  }

  private buildRemoteSyncOperations(remoteItems: BackendCartItem[], desiredItems: CartItem[]): Observable<unknown>[] {
    const remoteByProductId = new Map<number, BackendCartItem>(
      remoteItems.map((item) => [item.producto_id, item])
    );
    const desiredProductIds = new Set(desiredItems.map((item) => item.producto.id));
    const operations: Observable<unknown>[] = [];

    desiredItems.forEach((item) => {
      const remoteItem = remoteByProductId.get(item.producto.id);
      if (!remoteItem) {
        operations.push(
          this.http.post<BackendCartResponse>(
            `${this.cartApiUrl}/items`,
            {
              producto_id: item.producto.id,
              cantidad: item.cantidad,
            },
            { context: this.getSkipToastContext() }
          )
        );
        return;
      }

      if (remoteItem.cantidad !== item.cantidad) {
        operations.push(
          this.http.put<BackendCartResponse>(
            `${this.cartApiUrl}/items/${remoteItem.id}`,
            { cantidad: item.cantidad },
            { context: this.getSkipToastContext() }
          )
        );
      }
    });

    remoteItems.forEach((item) => {
      if (!desiredProductIds.has(item.producto_id)) {
        operations.push(
          this.http.delete<{ message: string }>(
            `${this.cartApiUrl}/items/${item.id}`,
            { context: this.getSkipToastContext() }
          )
        );
      }
    });

    return operations;
  }

  private loadRemoteCart(silent = false): void {
    const requestUserId = this.activeUserId;

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

      if (this.hasPendingRemoteChanges()) {
        return;
      }

      if (!requestUserId || requestUserId !== this.activeUserId || !this.isAuthenticatedCustomer()) {
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
        stock_disponible:
          typeof item.producto_stock_disponible === 'number'
            ? item.producto_stock_disponible
            : undefined,
      },
      cantidad: item.cantidad,
      subtotal: Number(item.subtotal),
    }));

    this.cartItemsSignal.set(mappedItems);
  }

  private mergeLocalCartItem(
    items: CartItem[],
    producto: ProductData,
    cantidad: number
  ): { items: CartItem[]; updated: boolean; message: string } {
    const existingItemIndex = items.findIndex((item) => item.producto.id === producto.id);
    const availableStock = this.getAvailableStock(producto);
    if (existingItemIndex === -1) {
      if (availableStock !== null && cantidad > availableStock) {
        return {
          items,
          updated: false,
          message: `Stock insuficiente. Disponible: ${availableStock}`,
        };
      }
      return {
        items: [
          ...items,
          {
            producto,
            cantidad,
            subtotal: this.calculateSubtotal(producto, cantidad),
          },
        ],
        updated: true,
        message: '',
      };
    }

    const updatedItems = [...items];
    const existingItem = updatedItems[existingItemIndex];
    const nextCantidad = existingItem.cantidad + cantidad;
    const resolvedStock = this.getAvailableStock(producto, existingItem.producto);
    if (resolvedStock !== null && nextCantidad > resolvedStock) {
      return {
        items,
        updated: false,
        message: `Stock insuficiente. Disponible: ${resolvedStock}`,
      };
    }
    updatedItems[existingItemIndex] = {
      ...existingItem,
      producto: {
        ...existingItem.producto,
        ...producto,
      },
      cantidad: nextCantidad,
      subtotal: this.calculateSubtotal({
        ...existingItem.producto,
        ...producto,
      }, nextCantidad),
    };
    return { items: updatedItems, updated: true, message: '' };
  }

  private getAvailableStock(producto: ProductData, fallback?: ProductData): number | null {
    if (typeof producto.stock_disponible === 'number') {
      return producto.stock_disponible;
    }
    if (fallback && typeof fallback.stock_disponible === 'number') {
      return fallback.stock_disponible;
    }
    return null;
  }

  private clampToStock(producto: ProductData, desired: number, current: number): number {
    const availableStock = this.getAvailableStock(producto);
    if (availableStock === null) {
      return desired;
    }
    if (desired <= current) {
      return desired;
    }
    if (availableStock <= current) {
      return current;
    }
    return Math.min(desired, availableStock);
  }

  private calculateSubtotal(producto: ProductData, cantidad: number): number {
    const currentPrice = producto.precio_oferta || producto.precio;
    return cantidad * currentPrice;
  }

  private cloneCartItems(items: CartItem[]): CartItem[] {
    return items.map((item) => ({
      cartItemId: item.cartItemId,
      producto: { ...item.producto },
      cantidad: item.cantidad,
      subtotal: item.subtotal,
    }));
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

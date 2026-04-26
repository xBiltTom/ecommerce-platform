import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Observable, of, catchError } from 'rxjs';
import { ProductData } from '../../shared/components/product-card/product-card.component';
import { SKIP_ERROR_TOAST } from '../interceptors/http-context-tokens';

export type ProductoOrden =
  | 'reciente'
  | 'antiguo'
  | 'precio_asc'
  | 'precio_desc'
  | 'nombre_asc'
  | 'nombre_desc';

export interface GetProductosParams {
  page?: number;
  page_size?: number;
  categoria_id?: number | null;
  marca_id?: number | null;
  precio_min?: number | null;
  precio_max?: number | null;
  buscar?: string;
  orden?: ProductoOrden;
}

export interface ProductoDetallePublico {
  id: number;
  sku: string;
  nombre: string;
  slug: string;
  descripcion?: string | null;
  precio: number;
  precio_oferta?: number | null;
  stock_fisico: number;
  stock_reservado: number;
  stock_disponible: number;
  stock_minimo: number;
  categoria_id?: number | null;
  marca_id?: number | null;
  categoria_nombre?: string | null;
  marca_nombre?: string | null;
  imagen_url?: string | null;
  activo: boolean;
  especificaciones: { clave: string; valor: string }[];
  fecha_creacion: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface Categoria {
  id: number;
  nombre: string;
  slug: string;
}

export interface Marca {
  id: number;
  nombre: string;
  slug: string;
}

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:8000/api/v1';

  // Opcional: estado cacheado si se desea usar signals para categorias/marcas
  public categorias = signal<Categoria[]>([]);
  public marcas = signal<Marca[]>([]);

  constructor() {}

  private toHttpParams(params: GetProductosParams = {}): HttpParams {
    let httpParams = new HttpParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        httpParams = httpParams.set(key, String(value));
      }
    });

    return httpParams;
  }

  getProductos(params: GetProductosParams = {}): Observable<PaginatedResponse<ProductData>> {
    const httpParams = this.toHttpParams(params);
    const context = new HttpContext().set(SKIP_ERROR_TOAST, true);

    return this.http.get<PaginatedResponse<ProductData>>(`${this.baseUrl}/productos`, { params: httpParams, context }).pipe(
      catchError(error => {
        console.error('Error fetching products', error);
        // Fallback a datos mockeados si el backend no está corriendo, para no romper la UI en desarrollo
        return of({
          items: [
            { id: 1, slug: 'cyberx-pro-headphones', nombre: 'CyberX Pro Headphones', precio: 299.99, precio_oferta: 249.99, categoria_nombre: 'Audio', imagen_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&q=80&auto=format&fit=crop' },
            { id: 2, slug: 'quantum-smartwatch', nombre: 'Quantum Smartwatch', precio: 399.00, categoria_nombre: 'Wearables', imagen_url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&q=80&auto=format&fit=crop' },
            { id: 3, slug: 'mechanical-keyboard-k3', nombre: 'Mechanical Keyboard K3', precio: 159.00, categoria_nombre: 'Peripherals', imagen_url: 'https://images.unsplash.com/photo-1595225476474-87563907a212?w=500&q=80&auto=format&fit=crop' },
            { id: 4, slug: 'ultravision-4k-monitor', nombre: 'UltraVision 4K Monitor', precio: 699.99, precio_oferta: 599.99, categoria_nombre: 'Monitors', imagen_url: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=500&q=80&auto=format&fit=crop' }
          ],
          total: 4,
          page: 1,
          page_size: 10,
          total_pages: 1
        });
      })
    );
  }

  getCategorias(): Observable<PaginatedResponse<Categoria>> {
    return this.http.get<PaginatedResponse<Categoria>>(
      `${this.baseUrl}/categorias`,
      { context: new HttpContext().set(SKIP_ERROR_TOAST, true) }
    ).pipe(
      catchError(() => of({ items: [{id: 1, nombre: 'Audio', slug: 'audio'}, {id: 2, nombre: 'Wearables', slug: 'wearables'}], total: 2, page: 1, page_size: 10, total_pages: 1 }))
    );
  }

  getProductoBySlug(slug: string): Observable<ProductoDetallePublico> {
    return this.http.get<ProductoDetallePublico>(
      `${this.baseUrl}/productos/${slug}`,
      { context: new HttpContext().set(SKIP_ERROR_TOAST, true) }
    );
  }

  getMarcas(): Observable<PaginatedResponse<Marca>> {
    return this.http.get<PaginatedResponse<Marca>>(
      `${this.baseUrl}/marcas`,
      { context: new HttpContext().set(SKIP_ERROR_TOAST, true) }
    ).pipe(
      catchError(() => of({ items: [{id: 1, nombre: 'Sony', slug: 'sony'}, {id: 2, nombre: 'Apple', slug: 'apple'}], total: 2, page: 1, page_size: 10, total_pages: 1 }))
    );
  }
}

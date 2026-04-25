import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, catchError } from 'rxjs';
import { ProductData } from '../../shared/components/product-card/product-card.component';

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
  private baseUrl = 'http://localhost:8000/api/v1';

  // Opcional: estado cacheado si se desea usar signals para categorias/marcas
  public categorias = signal<Categoria[]>([]);
  public marcas = signal<Marcas[]>([]);

  constructor() {}

  getProductos(params: any = {}): Observable<PaginatedResponse<ProductData>> {
    let httpParams = new HttpParams();
    Object.keys(params).forEach(key => {
      if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
        httpParams = httpParams.set(key, params[key]);
      }
    });

    return this.http.get<PaginatedResponse<ProductData>>(`${this.baseUrl}/productos`, { params: httpParams }).pipe(
      catchError(error => {
        console.error('Error fetching products', error);
        // Fallback a datos mockeados si el backend no está corriendo, para no romper la UI en desarrollo
        return of({
          items: [
            { id: 1, nombre: 'CyberX Pro Headphones', precio: 299.99, precio_oferta: 249.99, categoria_nombre: 'Audio', imagen_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&q=80&auto=format&fit=crop' },
            { id: 2, nombre: 'Quantum Smartwatch', precio: 399.00, categoria_nombre: 'Wearables', imagen_url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&q=80&auto=format&fit=crop' },
            { id: 3, nombre: 'Mechanical Keyboard K3', precio: 159.00, categoria_nombre: 'Peripherals', imagen_url: 'https://images.unsplash.com/photo-1595225476474-87563907a212?w=500&q=80&auto=format&fit=crop' },
            { id: 4, nombre: 'UltraVision 4K Monitor', precio: 699.99, precio_oferta: 599.99, categoria_nombre: 'Monitors', imagen_url: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=500&q=80&auto=format&fit=crop' }
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
    return this.http.get<PaginatedResponse<Categoria>>(`${this.baseUrl}/categorias`).pipe(
      catchError(() => of({ items: [{id: 1, nombre: 'Audio', slug: 'audio'}, {id: 2, nombre: 'Wearables', slug: 'wearables'}], total: 2, page: 1, page_size: 10, total_pages: 1 }))
    );
  }

  getMarcas(): Observable<PaginatedResponse<Marca>> {
    return this.http.get<PaginatedResponse<Marca>>(`${this.baseUrl}/marcas`).pipe(
      catchError(() => of({ items: [{id: 1, nombre: 'Sony', slug: 'sony'}, {id: 2, nombre: 'Apple', slug: 'apple'}], total: 2, page: 1, page_size: 10, total_pages: 1 }))
    );
  }
}

interface Marcas {
  id: number;
  nombre: string;
  slug: string;
}

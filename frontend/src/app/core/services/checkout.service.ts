import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SKIP_ERROR_TOAST } from '../interceptors/http-context-tokens';

export type EstadoPedido =
  | 'pendiente'
  | 'pagado'
  | 'en_preparacion'
  | 'enviado'
  | 'entregado'
  | 'cancelado';

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface Direccion {
  id: number;
  titulo: string;
  direccion: string;
  ciudad: string;
  pais: string;
  codigo_postal?: string;
  es_principal: boolean;
}

export interface PedidoRequest {
  direccion_id: number;
  metodo_pago: string;
}

export interface PedidoHistorialItem {
  id: string;
  total: number;
  estado: EstadoPedido;
  fecha_creacion: string;
  total_items: number;
}

export interface PedidoItemDetalle {
  id: number;
  producto_id?: number | null;
  sku_producto: string;
  nombre_producto: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

export interface PedidoDetalle {
  id: string;
  nombre_destinatario: string;
  direccion_envio: string;
  ciudad_envio: string;
  pais_envio: string;
  subtotal: number;
  descuento: number;
  costo_envio: number;
  total: number;
  estado: EstadoPedido;
  items: PedidoItemDetalle[];
  fecha_creacion: string;
}

@Injectable({
  providedIn: 'root'
})
export class CheckoutService {
  private http = inject(HttpClient);
  private readonly API_URL = 'http://localhost:8000/api/v1';

  private toParams(params: Record<string, string | number | boolean | null | undefined>): HttpParams {
    let httpParams = new HttpParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        httpParams = httpParams.set(key, String(value));
      }
    });

    return httpParams;
  }

  // -- Direcciones --
  
  getDirecciones(): Observable<Direccion[]> {
    return this.http.get<Direccion[]>(
      `${this.API_URL}/direcciones`,
      { context: new HttpContext().set(SKIP_ERROR_TOAST, true) }
    );
  }

  crearDireccion(direccion: Omit<Direccion, 'id'>): Observable<Direccion> {
    return this.http.post<Direccion>(
      `${this.API_URL}/direcciones`,
      direccion,
      { context: new HttpContext().set(SKIP_ERROR_TOAST, true) }
    );
  }

  // -- Pedidos --
  
  procesarCheckout(pedido: PedidoRequest): Observable<any> {
    return this.http.post<PedidoDetalle>(
      `${this.API_URL}/pedidos`,
      pedido,
      { context: new HttpContext().set(SKIP_ERROR_TOAST, true) }
    );
  }

  getPedidos(page = 1, pageSize = 8): Observable<PaginatedResponse<PedidoHistorialItem>> {
    const params = this.toParams({ page, page_size: pageSize });

    return this.http.get<PaginatedResponse<PedidoHistorialItem>>(
      `${this.API_URL}/pedidos`,
      {
        params,
        context: new HttpContext().set(SKIP_ERROR_TOAST, true),
      }
    );
  }

  getPedidoDetalle(pedidoId: string): Observable<PedidoDetalle> {
    return this.http.get<PedidoDetalle>(`${this.API_URL}/pedidos/${pedidoId}`, {
      context: new HttpContext().set(SKIP_ERROR_TOAST, true),
    });
  }

  cancelarPedido(pedidoId: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.API_URL}/pedidos/${pedidoId}/cancelar`, null, {
      context: new HttpContext().set(SKIP_ERROR_TOAST, true),
    });
  }
}

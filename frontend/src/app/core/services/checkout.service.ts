import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SKIP_ERROR_TOAST } from '../interceptors/http-context-tokens';

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

@Injectable({
  providedIn: 'root'
})
export class CheckoutService {
  private http = inject(HttpClient);
  private readonly API_URL = 'http://localhost:8000/api/v1';

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
    return this.http.post(
      `${this.API_URL}/pedidos`,
      pedido,
      { context: new HttpContext().set(SKIP_ERROR_TOAST, true) }
    );
  }
}

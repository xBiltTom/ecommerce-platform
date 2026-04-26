import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private http = inject(HttpClient);
  private readonly API_URL = 'http://localhost:8000/api/v1/admin';

  // -- Dashboard --
  getKpis(): Observable<any> {
    return this.http.get(`${this.API_URL}/dashboard/kpis`);
  }

  getVentas(periodo: string = 'mes'): Observable<any> {
    return this.http.get(`${this.API_URL}/dashboard/ventas?periodo=${periodo}`);
  }

  getProductosTop(): Observable<any> {
    return this.http.get(`${this.API_URL}/dashboard/productos-top`);
  }

  getPedidosPorEstado(): Observable<any> {
    return this.http.get(`${this.API_URL}/dashboard/pedidos-por-estado`);
  }

  // -- Gestión (Mocks para la UI) --
  // En un caso real estos usarían interfaces tipadas y parámetros de paginación
  getUsuarios(): Observable<any> {
    return this.http.get(`${this.API_URL}/usuarios`);
  }

  getPedidos(): Observable<any> {
    return this.http.get(`${this.API_URL}/pedidos`);
  }

  // Reporte PDF
  descargarReporteVentas(): Observable<Blob> {
    return this.http.get(`${this.API_URL}/reportes/ventas/pdf`, { responseType: 'blob' });
  }
}

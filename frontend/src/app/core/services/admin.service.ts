import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export type DashboardPeriodo = 'dia' | 'semana' | 'mes';
export type UsuarioRol = 'admin' | 'cliente';
export type EstadoPedido = 'pendiente' | 'pagado' | 'en_preparacion' | 'enviado' | 'entregado' | 'cancelado';

export interface DashboardKPIs {
  ventas_totales: number;
  total_pedidos: number;
  ticket_promedio: number;
  usuarios_registrados: number;
  usuarios_nuevos_mes: number;
  productos_activos: number;
  productos_bajo_stock: number;
}

export interface VentasPorPeriodo {
  periodo: string;
  total: number;
  cantidad_pedidos: number;
}

export interface ProductoTop {
  producto_id: number;
  nombre: string;
  sku: string;
  cantidad_vendida: number;
  ingresos: number;
}

export interface PedidosPorEstado {
  estado: EstadoPedido;
  cantidad: number;
}

export interface ProductoBajoStock {
  id: number;
  sku: string;
  nombre: string;
  stock_fisico: number;
  stock_reservado: number;
  stock_disponible: number;
  stock_minimo: number;
}

export interface AdminUsuario {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  telefono?: string | null;
  rol: UsuarioRol;
  activo: boolean;
  fecha_creacion: string;
  fecha_actualizacion: string;
  ultimo_login?: string | null;
}

export interface AdminPedido {
  id: string;
  total: number;
  estado: EstadoPedido;
  fecha_creacion: string;
  total_items: number;
}

export interface ProductoCatalogo {
  id: number;
  nombre: string;
  slug: string;
}

export interface AdminProductoList {
  id: number;
  sku: string;
  nombre: string;
  slug: string;
  precio: number;
  precio_oferta?: number | null;
  stock_disponible: number;
  categoria_nombre?: string | null;
  marca_nombre?: string | null;
  imagen_url?: string | null;
  activo: boolean;
}

export interface EspecificacionProducto {
  clave: string;
  valor: string;
}

export interface AdminProductoDetail extends AdminProductoList {
  descripcion?: string | null;
  stock_fisico: number;
  stock_reservado: number;
  stock_minimo: number;
  categoria_id?: number | null;
  marca_id?: number | null;
  especificaciones: EspecificacionProducto[];
  fecha_creacion: string;
}

export interface ProductoCreatePayload {
  sku: string;
  nombre: string;
  descripcion?: string;
  precio: number;
  precio_oferta?: number | null;
  stock_fisico?: number;
  stock_minimo?: number;
  categoria_id?: number | null;
  marca_id?: number | null;
  imagen_url?: string | null;
  especificaciones?: EspecificacionProducto[];
}

export interface ProductoUpdatePayload {
  nombre?: string;
  descripcion?: string;
  precio?: number;
  precio_oferta?: number | null;
  stock_minimo?: number;
  categoria_id?: number | null;
  marca_id?: number | null;
  imagen_url?: string | null;
  activo?: boolean;
  especificaciones?: EspecificacionProducto[];
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private http = inject(HttpClient);
  private readonly BASE_URL = 'http://localhost:8000/api/v1';
  private readonly ADMIN_URL = `${this.BASE_URL}/admin`;
  private readonly PRODUCTOS_URL = `${this.BASE_URL}/productos`;
  private readonly CATEGORIAS_URL = `${this.BASE_URL}/categorias`;
  private readonly MARCAS_URL = `${this.BASE_URL}/marcas`;

  private toParams(
    params: Record<string, string | number | boolean | null | undefined>
  ): HttpParams {
    let httpParams = new HttpParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        httpParams = httpParams.set(key, String(value));
      }
    });

    return httpParams;
  }

  // -- Dashboard --
  getKpis(): Observable<DashboardKPIs> {
    return this.http.get<DashboardKPIs>(`${this.ADMIN_URL}/dashboard/kpis`);
  }

  getVentas(periodo: DashboardPeriodo = 'mes'): Observable<VentasPorPeriodo[]> {
    const params = this.toParams({ periodo });
    return this.http.get<VentasPorPeriodo[]>(`${this.ADMIN_URL}/dashboard/ventas`, { params });
  }

  getProductosTop(limit = 5): Observable<ProductoTop[]> {
    const params = this.toParams({ limit });
    return this.http.get<ProductoTop[]>(`${this.ADMIN_URL}/dashboard/productos-top`, { params });
  }

  getPedidosPorEstado(): Observable<PedidosPorEstado[]> {
    return this.http.get<PedidosPorEstado[]>(`${this.ADMIN_URL}/dashboard/pedidos-por-estado`);
  }

  getProductosBajoStock(page = 1, pageSize = 5): Observable<PaginatedResponse<ProductoBajoStock>> {
    const params = this.toParams({ page, page_size: pageSize });
    return this.http.get<PaginatedResponse<ProductoBajoStock>>(`${this.ADMIN_URL}/dashboard/productos-bajo-stock`, { params });
  }

  // -- Usuarios --
  getUsuarios(params: {
    page?: number;
    page_size?: number;
    rol?: UsuarioRol | '';
    activo?: boolean | null;
    buscar?: string;
  } = {}): Observable<PaginatedResponse<AdminUsuario>> {
    const query = this.toParams({
      page: params.page ?? 1,
      page_size: params.page_size ?? 10,
      rol: params.rol,
      activo: params.activo,
      buscar: params.buscar,
    });

    return this.http.get<PaginatedResponse<AdminUsuario>>(`${this.ADMIN_URL}/usuarios`, { params: query });
  }

  updateUsuarioEstado(usuarioId: string, activo: boolean): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.ADMIN_URL}/usuarios/${usuarioId}/estado`, { activo });
  }

  // -- Pedidos --
  getPedidos(params: {
    page?: number;
    page_size?: number;
    estado?: EstadoPedido | '';
  } = {}): Observable<PaginatedResponse<AdminPedido>> {
    const query = this.toParams({
      page: params.page ?? 1,
      page_size: params.page_size ?? 10,
      estado: params.estado,
    });

    return this.http.get<PaginatedResponse<AdminPedido>>(`${this.ADMIN_URL}/pedidos`, { params: query });
  }

  updatePedidoEstado(
    pedidoId: string,
    payload: { estado: EstadoPedido; comentario?: string }
  ): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.ADMIN_URL}/pedidos/${pedidoId}/estado`, payload);
  }

  getPedidoDetalle(pedidoId: string): Observable<any> {
    return this.http.get<any>(`${this.ADMIN_URL}/pedidos/${pedidoId}`);
  }

  // -- Productos (CRUD) --
  getProductos(params: {
    page?: number;
    page_size?: number;
    buscar?: string;
    categoria_id?: number | null;
    marca_id?: number | null;
    orden?: string;
    activo?: boolean | null | '';
  } = {}): Observable<PaginatedResponse<AdminProductoList>> {
    const query = this.toParams({
      page: params.page ?? 1,
      page_size: params.page_size ?? 10,
      buscar: params.buscar,
      categoria_id: params.categoria_id,
      marca_id: params.marca_id,
      orden: params.orden ?? 'reciente',
      activo: params.activo,
    });

    return this.http.get<PaginatedResponse<AdminProductoList>>(this.PRODUCTOS_URL, { params: query });
  }

  getProductoDetalle(slug: string): Observable<AdminProductoDetail> {
    return this.http.get<AdminProductoDetail>(`${this.PRODUCTOS_URL}/${slug}`);
  }

  createProducto(payload: ProductoCreatePayload): Observable<AdminProductoDetail> {
    return this.http.post<AdminProductoDetail>(this.PRODUCTOS_URL, payload);
  }

  updateProducto(productoId: number, payload: ProductoUpdatePayload): Observable<AdminProductoDetail> {
    return this.http.put<AdminProductoDetail>(`${this.PRODUCTOS_URL}/${productoId}`, payload);
  }

  deleteProducto(productoId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.PRODUCTOS_URL}/${productoId}`);
  }

  getCategorias(pageSize = 100): Observable<PaginatedResponse<ProductoCatalogo>> {
    const params = this.toParams({ page: 1, page_size: pageSize });
    return this.http.get<PaginatedResponse<ProductoCatalogo>>(this.CATEGORIAS_URL, { params });
  }

  getCategoriasPaginadas(page = 1, pageSize = 10, activo?: boolean | null | ''): Observable<PaginatedResponse<any>> {
    const params = this.toParams({ page, page_size: pageSize, activo });
    return this.http.get<PaginatedResponse<any>>(this.CATEGORIAS_URL, { params });
  }

  createCategoria(payload: { nombre: string; descripcion?: string }): Observable<any> {
    return this.http.post<any>(this.CATEGORIAS_URL, payload);
  }

  updateCategoria(id: number, payload: { nombre?: string; descripcion?: string; activo?: boolean }): Observable<any> {
    return this.http.put<any>(`${this.CATEGORIAS_URL}/${id}`, payload);
  }

  deleteCategoria(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.CATEGORIAS_URL}/${id}`);
  }

  getMarcas(pageSize = 100): Observable<PaginatedResponse<ProductoCatalogo>> {
    const params = this.toParams({ page: 1, page_size: pageSize });
    return this.http.get<PaginatedResponse<ProductoCatalogo>>(this.MARCAS_URL, { params });
  }

  getMarcasPaginadas(page = 1, pageSize = 10, activo?: boolean | null | ''): Observable<PaginatedResponse<any>> {
    const params = this.toParams({ page, page_size: pageSize, activo });
    return this.http.get<PaginatedResponse<any>>(this.MARCAS_URL, { params });
  }

  createMarca(payload: { nombre: string }): Observable<any> {
    return this.http.post<any>(this.MARCAS_URL, payload);
  }

  updateMarca(id: number, payload: { nombre?: string; activo?: boolean }): Observable<any> {
    return this.http.put<any>(`${this.MARCAS_URL}/${id}`, payload);
  }

  deleteMarca(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.MARCAS_URL}/${id}`);
  }

  // Reporte PDF
  descargarReporteVentas(): Observable<Blob> {
    return this.http.get(`${this.ADMIN_URL}/reportes/ventas/pdf`, { responseType: 'blob' });
  }
}

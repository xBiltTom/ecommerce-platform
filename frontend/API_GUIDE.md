# Guía de Integración API (Backend ↔ Frontend)

Esta guía documenta cómo el frontend (Angular) debe interactuar con la API REST del backend en FastAPI. Está diseñada para servir como referencia técnica principal para el desarrollo de los servicios HTTP en Angular.

## 1. Configuración Base

*   **Base URL:** `http://localhost:8000/api/v1`
*   **Formato de Intercambio:** `application/json`
*   **Autenticación:** JWT (JSON Web Tokens) transmitidos por el header `Authorization: Bearer <token>`.

### Interceptor HTTP Sugerido (Angular)
Se debe implementar un `HttpInterceptor` que:
1.  Adjunte el `access_token` en el header `Authorization` a todas las peticiones (excepto a `/auth/login` y `/auth/register`).
2.  Capture errores `401 Unauthorized`. Si ocurre un 401 y hay un `refresh_token` almacenado, debe llamar a `/auth/refresh` silenciosamente, actualizar los tokens y reintentar la petición original.
3.  Si el refresh falla, redirigir al login y limpiar el LocalStorage/SessionStorage.

---

## 2. Autenticación y Perfil (`/auth`)

| Endpoint | Método | Auth | Descripción | Payload Sugerido / Tipo de Retorno |
| :--- | :--- | :--- | :--- | :--- |
| `/auth/login` | `POST` | No | Iniciar sesión | Req: `{ email, password }` <br> Res: `{ access_token, refresh_token, token_type }` |
| `/auth/register`| `POST` | No | Registro de cliente | Req: `{ email, password, nombre, apellido }` |
| `/auth/refresh` | `POST` | No | Renovar token | Req: `{ refresh_token }` <br> Res: `{ access_token, token_type }` |
| `/auth/logout` | `POST` | Sí | Cerrar sesión | Limpia el refresh token en BD. |
| `/auth/me` | `GET` | Sí | Perfil actual | Res: `UsuarioDetailResponse` (incluye `rol`) |
| `/auth/me` | `PUT` | Sí | Actualizar datos | Req: `{ nombre?, apellido?, telefono? }` |

*Nota: Guardar el `rol` del usuario (`cliente` o `admin`) en el estado del frontend para implementar los **Route Guards** de Angular y ocultar menús no autorizados.*

---

## 3. Catálogo Público (Tienda)

Endpoints para mostrar productos, filtros y menús. No requieren autenticación.

| Endpoint | Método | Auth | Descripción | Query Params / Retorno |
| :--- | :--- | :--- | :--- | :--- |
| `/categorias` | `GET` | No | Lista de categorías | Res: `PaginatedResponse<Categoria>` |
| `/marcas` | `GET` | No | Lista de marcas | Res: `PaginatedResponse<Marca>` |
| `/productos` | `GET` | No | Listado de productos | Param: `page, page_size, categoria_id, marca_id, precio_min, precio_max, buscar, orden (precio_asc, precio_desc, recientes)` <br> Res: `PaginatedResponse<ProductoList>` |
| `/productos/{slug}`| `GET` | No | Detalle del producto | Res: `ProductoDetail` (incluye array de especificaciones) |

---

## 4. Flujo de Compra (Cliente)

Requieren rol de `cliente` (o `admin` comportándose como cliente).

### 4.1 Carrito de Compras (`/carrito`)
El carrito se persiste en BD. El usuario puede iniciar sesión en otro dispositivo y recuperar su carrito.

| Endpoint | Método | Descripción | Payload / Retorno |
| :--- | :--- | :--- | :--- |
| `/carrito` | `GET` | Obtener carrito activo | Res: `{ items: [], total: number }` |
| `/carrito/items` | `POST` | Añadir producto | Req: `{ producto_id, cantidad }` |
| `/carrito/items/{id}`| `PUT` | Cambiar cantidad | Req: `{ cantidad }` |
| `/carrito/items/{id}`| `DELETE` | Eliminar del carrito | - |

### 4.2 Checkout y Pedidos (`/pedidos`)
Para finalizar la compra, el cliente necesita una dirección y confirmar el carrito.

| Endpoint | Método | Descripción | Payload / Retorno |
| :--- | :--- | :--- | :--- |
| `/direcciones` | `GET` | Listar direcciones | Res: `Direccion[]` |
| `/direcciones` | `POST` | Crear dirección | Req: `{ titulo, direccion, ciudad, pais, es_principal... }` |
| `/pedidos` | `POST` | Procesar checkout | Req: `{ direccion_id, metodo_pago }` <br> Transforma el carrito activo en un Pedido. |
| `/pedidos` | `GET` | Historial de compras | Res: `PaginatedResponse<PedidoList>` |
| `/pedidos/{id}` | `GET` | Detalle del pedido | Incluye items, subtotales e historial de estados. |

---

## 5. Panel de Administración (`/admin`)

Requieren autenticación con rol `admin`. Recomendado usar *Lazy Loading* en Angular para aislar este módulo.

### 5.1 Dashboard (KPIs)
Para pintar gráficos y estadísticas de la pantalla inicial.

| Endpoint | Método | Descripción |
| :--- | :--- | :--- |
| `/admin/dashboard/kpis` | `GET` | Tarjetas superiores: Ventas, Pedidos, Ticket promedio, etc. |
| `/admin/dashboard/ventas` | `GET` | Gráfico lineal/barras de ventas. `?periodo=(dia|semana|mes)` |
| `/admin/dashboard/productos-top` | `GET` | Lista/Gráfico de productos más vendidos. |
| `/admin/dashboard/pedidos-por-estado`| `GET` | Gráfico de torta (Donut chart) de estado de pedidos. |

### 5.2 Gestión de Entidades
Se usarán Tablas y Formularios Reactivos en Angular para administrar el ecommerce.

*   **Usuarios**: `/admin/usuarios` (`GET`, paginado), `/admin/usuarios/{id}/estado` (`PUT` para banear/activar).
*   **Pedidos**: `/admin/pedidos` (`GET`), `/admin/pedidos/{id}/estado` (`PUT` para avanzar a enviado, entregado, etc.).
*   **Productos (CRUD Completo)**: Las operaciones `POST /productos` y `PUT /productos/{id}` requieren el rol de admin.
*   **Reportes PDF**: `/admin/reportes/ventas/pdf` (`GET`). El frontend debe manejar la respuesta como `Blob` y crear un link de descarga forzada.

---

## 6. Modelos Typescript Sugeridos (Interfaces)

Crea estos modelos en Angular (ej: `src/app/core/models/`) para tipado estricto.

```typescript
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface Producto {
  id: number;
  sku: string;
  nombre: string;
  slug: string;
  precio: number;
  precio_oferta?: number;
  stock_disponible: number;
  categoria_nombre?: string;
  marca_nombre?: string;
  imagen_url?: string;
  activo: boolean;
}

export interface ProductoDetalle extends Producto {
  descripcion: string;
  stock_fisico: number;
  stock_minimo: number;
  especificaciones: { clave: string, valor: string }[];
}

export interface Usuario {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  telefono?: string;
  rol: 'admin' | 'cliente';
  activo: boolean;
}

export interface CarritoItem {
  id: number;
  producto_id: number;
  producto_nombre: string;
  producto_slug: string;
  producto_imagen?: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

export interface Carrito {
  items: CarritoItem[];
  total: number;
}
```

## 7. Manejo de Errores Estandarizado
El backend siempre devolverá los errores (4xx, 5xx) con la misma estructura JSON:
```json
{
  "error": "NOT_FOUND",
  "detail": "El producto solicitado no existe"
}
```
*El servicio global de manejo de errores en Angular debe leer estas propiedades para mostrar Toast/Snackbars consistentes al usuario.*

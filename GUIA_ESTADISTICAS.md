Objetivo del Desarrollo
Integrar las funcionalidades de un Dashboard analítico y generación de reportes PDF (exigidos en la Guía 1) directamente en el panel de administrador en Angular, utilizando FastAPI como motor de cálculo y generación.

Fase 1: Motor de Estadísticas en el Backend (FastAPI)
Responsabilidad: El backend debe hacer todo el trabajo pesado de base de datos. Angular no debe recibir listas masivas de pedidos para calcular; FastAPI debe devolver los números ya procesados.

1. Creación de Esquemas (Schemas):

Qué hacer: Definir modelos de datos que estructuren la respuesta del dashboard.

Qué poner: Un esquema principal que contenga cuatro bloques clave:

Métricas generales (totales numéricos).

Distribución por categorías (pares de nombre-categoría y cantidad).

Evolución de ventas (lista de fechas con sus respectivos ingresos).

Frecuencia de compras.

2. Lógica de Agregación (Servicios de Base de Datos):

Qué hacer: Crear consultas SQL (vía SQLAlchemy) que agrupen y sumen datos.

Qué poner: * Cálculo del total histórico de ventas.

Cálculo del ticket promedio (promedio de compra por usuario).

Un JOIN entre productos, categorías y detalle de pedidos para saber qué categorías se venden más.

Una agrupación por fecha (truncada por días o meses) para graficar una línea de tiempo de ventas.

3. Endpoints del Dashboard:

Qué hacer: Exponer una ruta protegida (solo para rol admin).

Qué poner: Un endpoint GET /admin/estadisticas/dashboard que devuelva el esquema definido en el paso 1.

Fase 2: Motor de Reportes PDF en el Backend (FastAPI)
Responsabilidad: Utilizar la librería reportlab para dibujar los documentos en memoria y enviarlos al frontend como archivos listos para descargar.

1. Lógica del Reporte Operacional:

Qué hacer: Crear un servicio que genere un PDF enfocado en el día a día.

Qué poner: Debe recibir un rango de fechas. El PDF debe incluir un título, la fecha de generación y una tabla detallada que liste los pedidos de ese rango (ID del pedido, cliente, fecha, estado y total).

2. Lógica del Reporte de Gestión:

Qué hacer: Crear un servicio que genere un PDF enfocado en la toma de decisiones gerenciales.

Qué poner: Este PDF no debe listar pedidos individuales. Debe mostrar KPIs (Indicadores Clave de Rendimiento): ingresos totales del periodo, producto más vendido, ticket promedio, clientes nuevos vs recurrentes, y rentabilidad.

3. Endpoints de Descarga:

Qué hacer: Crear rutas protegidas para la descarga de los archivos.

Qué poner: Dos endpoints tipo GET (/admin/reportes/operacional y /admin/reportes/gestion). Deben aceptar parámetros de consulta (query params) para las fechas y deben retornar una respuesta de tipo StreamingResponse o Response con el tipo MIME application/pdf.

Fase 3: Integración en el Frontend (Angular - Capa de Servicios)
Responsabilidad: Conectar la interfaz gráfica con los nuevos endpoints de FastAPI manejando correctamente la asincronía y los tipos de datos.

1. Servicio del Dashboard:

Qué hacer: Crear un servicio HTTP (admin-dashboard.service.ts).

Qué poner: * Un método estándar que haga un GET para obtener el JSON de las estadísticas.

Dos métodos para descargar los reportes. Regla crítica para el agente: Debe indicarle a Angular que la respuesta de los PDFs será de tipo Blob (archivo binario), de lo contrario, Angular intentará leer el PDF como texto y lo corromperá.

Fase 4: Interfaz de Usuario (Angular - Componente Dashboard)
Responsabilidad: Mostrar la información de forma atractiva e interactiva para el administrador.

1. Tarjetas de KPIs (Key Performance Indicators):

Qué hacer: Diseñar tarjetas en la parte superior de la vista.

Qué poner: Mostrar de forma grande y clara el Total de Ventas, el Promedio de Compra y el Total de Pedidos Activos.

2. Integración de Gráficos (El reemplazo de Streamlit):

Qué hacer: Integrar una librería de gráficos compatible con Angular (se recomienda Chart.js con ng2-charts o ECharts).

Qué poner: * Un gráfico de líneas o barras que muestre la evolución de las ventas en el tiempo.

Un gráfico de pastel (pie chart) que muestre la distribución de ventas por categoría.

3. Panel de Descarga de Reportes:

Qué hacer: Crear una sección dedicada a la exportación de datos.

Qué poner: * Dos selectores de fecha (Fecha de Inicio y Fecha de Fin).

Dos botones claros: "Descargar Reporte Operacional" y "Descargar Reporte de Gestión".

Lógica en el componente para que, al hacer clic, reciba el Blob del backend, cree un enlace temporal en el navegador y fuerce la descarga del archivo .pdf en la computadora del usuario.
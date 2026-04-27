# Guía de Instalación y Despliegue con Docker

Esta guía detalla los pasos necesarios para desplegar la plataforma Ecommerce (Frontend, Backend y Base de Datos) en cualquier entorno utilizando Docker y Docker Compose.

## Requisitos Previos

Asegúrate de tener instalado en el entorno de destino:
1. [Docker](https://docs.docker.com/get-docker/)
2. [Docker Compose](https://docs.docker.com/compose/install/)

## Estructura de Contenedores

La orquestación creará los siguientes contenedores:
- **db** (`postgres:15-alpine`): Base de datos PostgreSQL. Puerto `5432`.
- **backend** (`ecommerce_backend`): API en FastAPI (Python). Expuesto en el puerto `8000`. Incluye la ejecución automática de las migraciones de Alembic al iniciar.
- **frontend** (`ecommerce_frontend`): Aplicación Angular servida estáticamente mediante Nginx. Expuesto en el puerto `80`.

## Pasos para el Despliegue

### 1. Clonar o subir el proyecto al servidor
Si estás en un nuevo entorno, asegúrate de tener el código fuente de todo el proyecto, incluyendo los archivos `Dockerfile` ubicados en las carpetas `frontend/` y `backend/`, así como el archivo `docker-compose.yml` en la raíz.

### 2. Verificar la configuración
El archivo `docker-compose.yml` contiene la configuración predeterminada que unifica la base de datos, el backend y el frontend:
- **Base de datos:** `ecommerce-db` con usuario `postgres` y contraseña `123456`. Los datos persistirán en el volumen `postgres_data`.
- **Backend:** Se conecta automáticamente a la base de datos a través del hostname `db` generado por Docker Compose.
- **Frontend:** Al construirse, Angular generará los archivos estáticos listos para producción y los colocará en un Nginx ligero.

*Nota:* Si necesitas usar credenciales diferentes para la base de datos o claves secretas distintas para el JWT, debes actualizar las variables de entorno dentro del archivo `docker-compose.yml`.

### 3. Construir y levantar los contenedores
Abre una terminal en la raíz del proyecto (donde se encuentra el `docker-compose.yml`) y ejecuta el siguiente comando:

```bash
docker-compose up -d --build
```

Explicación:
- `up`: Levanta los servicios.
- `-d`: (Detached) Ejecuta los contenedores en segundo plano.
- `--build`: Fuerza la construcción de las imágenes a partir de los `Dockerfile` de backend y frontend.

Este proceso puede tomar varios minutos la primera vez, ya que descargará las imágenes base (Node, Python, Postgres, Nginx) y compilará la aplicación de Angular.

### 4. Verificar el estado de los servicios
Comprueba que los tres servicios estén corriendo correctamente:

```bash
docker-compose ps
```
Deberías ver `ecommerce_db`, `ecommerce_backend`, y `ecommerce_frontend` con el estado `Up`.

Puedes revisar los logs en caso de algún error, por ejemplo del backend:
```bash
docker-compose logs -f backend
```

### 5. Acceder a la plataforma
Una vez que todos los contenedores estén inicializados, puedes acceder a:
- **Frontend (Plataforma web):** [http://localhost](http://localhost) (o la IP de tu servidor)
- **Backend API Docs (Swagger):** [http://localhost:8000/docs](http://localhost:8000/docs) (o la IP de tu servidor)

### Datos Adicionales Importantes
- **Volúmenes Persistentes:** La información de tu base de datos no se perderá si apagas los contenedores gracias al volumen configurado (`postgres_data`).
- **Migraciones de Base de Datos:** El contenedor del backend está configurado para correr automáticamente `alembic upgrade head` antes de arrancar. Además, se carga un volcado inicial mediante `schema.sql` en la creación del contenedor PostgreSQL.
- **Nginx y Angular (Routing):** El contenedor del frontend utiliza una configuración Nginx personalizada (`frontend/nginx.conf`) para redirigir siempre todas las rutas no encontradas a `index.html`. Esto previene errores `404` en aplicaciones SPA (Single Page Application) al recargar la página.
- **Conexión API en Producción:** Actualmente, el código de Angular apunta sus servicios a `http://localhost:8000/api/v1`. Para que este entorno funcione adecuadamente desde otros ordenadores, debes acceder al frontend y backend desde la máquina que los aloja (es decir, en local). En un entorno completamente de producción (como un servidor en la nube), se recomienda actualizar la `baseUrl` del backend en el código de Angular con la IP pública del servidor antes de construir las imágenes.

## Comandos Útiles

- **Detener los servicios sin borrar datos:**
  ```bash
  docker-compose stop
  ```
- **Bajar los servicios y eliminar la red (mantiene volúmenes):**
  ```bash
  docker-compose down
  ```
- **Bajar servicios borrando toda la data (¡Precaución!):**
  ```bash
  docker-compose down -v
  ```

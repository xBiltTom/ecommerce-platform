-- ========================================
-- EXTENSIONES
-- ========================================

-- CREAR LA BASE PRIMERO
-- CREATE DATABASE ecommerce-platform

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- ENUMS
-- ========================================
CREATE TYPE rol_usuario AS ENUM ('cliente', 'admin');
CREATE TYPE estado_carrito AS ENUM ('activo', 'finalizado');
CREATE TYPE estado_pedido AS ENUM ('pendiente', 'pagado', 'enviado', 'cancelado');

-- ========================================
-- USUARIOS
-- ========================================
CREATE TABLE usuarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    nombre VARCHAR(100),
    rol rol_usuario NOT NULL DEFAULT 'cliente',
    activo BOOLEAN DEFAULT TRUE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP -- MEJORA: Timestamp de actualización
);

-- ========================================
-- CATEGORIAS
-- ========================================
CREATE TABLE categorias (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    activo BOOLEAN DEFAULT TRUE -- MEJORA: Soft delete para no romper productos
);

-- ========================================
-- MARCAS
-- ========================================
CREATE TABLE marcas (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    activo BOOLEAN DEFAULT TRUE -- MEJORA: Soft delete para no romper productos
);

-- ========================================
-- PRODUCTOS
-- ========================================
CREATE TABLE productos (
    id SERIAL PRIMARY KEY,
    sku VARCHAR(50) UNIQUE NOT NULL, -- MEJORA: Código único de almacén (SKU)
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    precio NUMERIC(10,2) NOT NULL CHECK (precio >= 0),
    stock INT NOT NULL CHECK (stock >= 0),
    categoria_id INT REFERENCES categorias(id),
    marca_id INT REFERENCES marcas(id),
    imagen_url TEXT,
    activo BOOLEAN DEFAULT TRUE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP -- MEJORA
);

-- ========================================
-- ESPECIFICACIONES DE PRODUCTOS
-- (Mantenido como tabla relacional para la tarea)
-- ========================================
CREATE TABLE productos_especificaciones (
    id SERIAL PRIMARY KEY,
    producto_id INT NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
    clave VARCHAR(100) NOT NULL,
    valor VARCHAR(255) NOT NULL
);

-- ========================================
-- DIRECCIONES (Libreta de direcciones del usuario)
-- ========================================
CREATE TABLE direcciones (
    id SERIAL PRIMARY KEY,
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    direccion TEXT NOT NULL,
    ciudad VARCHAR(100),
    pais VARCHAR(100),
    codigo_postal VARCHAR(20)
);

-- ========================================
-- CARRITOS
-- ========================================
CREATE TABLE carritos (
    id SERIAL PRIMARY KEY,
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    estado estado_carrito DEFAULT 'activo',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP -- MEJORA
);

-- ========================================
-- ITEMS DEL CARRITO
-- ========================================
CREATE TABLE carrito_items (
    id SERIAL PRIMARY KEY,
    carrito_id INT NOT NULL REFERENCES carritos(id) ON DELETE CASCADE,
    producto_id INT NOT NULL REFERENCES productos(id),
    cantidad INT NOT NULL CHECK (cantidad > 0),
    precio_unitario NUMERIC(10,2) NOT NULL CHECK (precio_unitario >= 0),
    UNIQUE (carrito_id, producto_id) -- MEJORA: Evita que el mismo producto aparezca en dos filas distintas
);

-- ========================================
-- PEDIDOS
-- ========================================
CREATE TABLE pedidos (
    id SERIAL PRIMARY KEY,
    usuario_id UUID NOT NULL REFERENCES usuarios(id),
    -- MEJORA: Snapshot de la dirección al momento de la compra
    direccion_envio TEXT NOT NULL,
    ciudad_envio VARCHAR(100),
    pais_envio VARCHAR(100),
    codigo_postal_envio VARCHAR(20),
    --
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- MEJORA
    total NUMERIC(10,2) NOT NULL CHECK (total >= 0),
    estado estado_pedido DEFAULT 'pendiente'
);

-- ========================================
-- ITEMS DEL PEDIDO
-- ========================================
CREATE TABLE pedido_items (
    id SERIAL PRIMARY KEY,
    pedido_id INT NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
    producto_id INT NOT NULL REFERENCES productos(id),
    cantidad INT NOT NULL CHECK (cantidad > 0),
    precio_unitario NUMERIC(10,2) NOT NULL,
    subtotal NUMERIC(10,2) NOT NULL
);

-- ========================================
-- PAGOS (OPCIONAL)
-- ========================================
CREATE TABLE pagos (
    id SERIAL PRIMARY KEY,
    pedido_id INT NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
    monto NUMERIC(10,2) NOT NULL,
    metodo VARCHAR(50),
    estado VARCHAR(50),
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- ÍNDICES (RENDIMIENTO)
-- ========================================
CREATE INDEX idx_productos_categoria ON productos(categoria_id);
CREATE INDEX idx_productos_marca ON productos(marca_id);
CREATE INDEX idx_productos_sku ON productos(sku); -- Nuevo índice para búsquedas rápidas por SKU
CREATE INDEX idx_carritos_usuario ON carritos(usuario_id);
CREATE INDEX idx_pedidos_usuario ON pedidos(usuario_id);
CREATE INDEX idx_pedido_fecha_creacion ON pedidos(fecha_creacion);
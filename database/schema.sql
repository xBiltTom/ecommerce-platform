-- ========================================
-- EXTENSIONES
-- ========================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- ENUMS
-- ========================================
CREATE TYPE rol_usuario AS ENUM ('cliente', 'admin');
CREATE TYPE estado_carrito AS ENUM ('activo', 'finalizado');
CREATE TYPE estado_pedido AS ENUM ('pendiente', 'pagado', 'enviado', 'entregado', 'cancelado');

-- ========================================
-- USUARIOS (Mantiene el control de acceso sencillo)
-- ========================================
CREATE TABLE usuarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    nombre VARCHAR(100),
    apellido VARCHAR(100),
    rol rol_usuario NOT NULL DEFAULT 'cliente',
    activo BOOLEAN DEFAULT TRUE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- CATEGORIAS
-- ========================================
CREATE TABLE categorias (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    slug VARCHAR(120) NOT NULL UNIQUE, -- MEJORA: Para URLs amigables en Angular
    descripcion TEXT,
    activo BOOLEAN DEFAULT TRUE
);

-- ========================================
-- MARCAS
-- ========================================
CREATE TABLE marcas (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(120) NOT NULL UNIQUE, -- MEJORA
    activo BOOLEAN DEFAULT TRUE
);

-- ========================================
-- PRODUCTOS
-- ========================================
CREATE TABLE productos (
    id SERIAL PRIMARY KEY,
    sku VARCHAR(50) UNIQUE NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    slug VARCHAR(300) NOT NULL UNIQUE, -- MEJORA: URLs profesionales
    descripcion TEXT,
    precio NUMERIC(10,2) NOT NULL CHECK (precio >= 0),
    precio_oferta NUMERIC(10,2) CHECK (precio_oferta >= 0), -- MEJORA: Gestión de descuentos
    
    -- MEJORA PROFESIONAL: Control de inventario concurrente
    stock_fisico INT NOT NULL DEFAULT 0 CHECK (stock_fisico >= 0),
    stock_reservado INT NOT NULL DEFAULT 0 CHECK (stock_reservado >= 0),
    
    categoria_id INT REFERENCES categorias(id),
    marca_id INT REFERENCES marcas(id),
    imagen_url TEXT,
    activo BOOLEAN DEFAULT TRUE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- REGLA: El stock reservado no puede ser mayor al físico
ALTER TABLE productos ADD CONSTRAINT check_stock_coherente CHECK (stock_reservado <= stock_fisico);

-- ========================================
-- ESPECIFICACIONES DE PRODUCTOS
-- ========================================
CREATE TABLE productos_especificaciones (
    id SERIAL PRIMARY KEY,
    producto_id INT NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
    clave VARCHAR(100) NOT NULL,
    valor VARCHAR(255) NOT NULL
);

-- ========================================
-- DIRECCIONES
-- ========================================
CREATE TABLE direcciones (
    id SERIAL PRIMARY KEY,
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    titulo VARCHAR(50) DEFAULT 'Casa', -- Ej: "Casa", "Oficina"
    direccion TEXT NOT NULL,
    ciudad VARCHAR(100) NOT NULL,
    pais VARCHAR(100) NOT NULL,
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
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
    UNIQUE (carrito_id, producto_id)
);

-- ========================================
-- PEDIDOS
-- ========================================
CREATE TABLE pedidos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), -- MEJORA: Evita que adivinen tu volumen de ventas
    usuario_id UUID NOT NULL REFERENCES usuarios(id),
    
    -- Snapshot de la dirección (Inmutable tras la compra)
    direccion_envio TEXT NOT NULL,
    ciudad_envio VARCHAR(100),
    pais_envio VARCHAR(100),
    codigo_postal_envio VARCHAR(20),
    
    subtotal NUMERIC(10,2) NOT NULL CHECK (subtotal >= 0),
    total NUMERIC(10,2) NOT NULL CHECK (total >= 0),
    estado estado_pedido DEFAULT 'pendiente',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- ITEMS DEL PEDIDO
-- ========================================
CREATE TABLE pedido_items (
    id SERIAL PRIMARY KEY,
    pedido_id UUID NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
    producto_id INT NOT NULL REFERENCES productos(id),
    cantidad INT NOT NULL CHECK (cantidad > 0),
    precio_unitario NUMERIC(10,2) NOT NULL,
    subtotal NUMERIC(10,2) NOT NULL
);

-- ========================================
-- HISTORIAL DE ESTADOS (MEJORA PROFESIONAL PARA EL ADMIN)
-- ========================================
CREATE TABLE pedidos_historial (
    id SERIAL PRIMARY KEY,
    pedido_id UUID NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
    estado_anterior estado_pedido,
    estado_nuevo estado_pedido NOT NULL,
    comentario TEXT, -- Ej: "Pago confirmado por pasarela", "Enviado por UPS tracking XYZ"
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- ÍNDICES (RENDIMIENTO)
-- ========================================
CREATE INDEX idx_productos_categoria ON productos(categoria_id);
CREATE INDEX idx_productos_slug ON productos(slug);
CREATE INDEX idx_pedidos_usuario ON pedidos(usuario_id);
CREATE INDEX idx_pedidos_estado ON pedidos(estado);
-- ========================================
-- EXTENSIONES
-- ========================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS citext;

-- ========================================
-- ENUMS
-- ========================================
CREATE TYPE rol_usuario AS ENUM ('cliente', 'admin');
CREATE TYPE estado_carrito AS ENUM ('activo', 'finalizado', 'abandonado');
CREATE TYPE estado_pedido AS ENUM ('pendiente', 'pagado', 'en_preparacion', 'enviado', 'entregado', 'cancelado');
CREATE TYPE estado_pago AS ENUM ('pendiente', 'autorizado', 'pagado', 'fallido', 'reembolsado', 'cancelado');
CREATE TYPE metodo_pago AS ENUM ('tarjeta', 'transferencia', 'efectivo', 'paypal', 'otro');
CREATE TYPE tipo_movimiento_inventario AS ENUM ('entrada', 'salida', 'reserva', 'liberacion_reserva', 'ajuste');

-- ========================================
-- FUNCIONES DE SOPORTE
-- ========================================
CREATE OR REPLACE FUNCTION actualizar_fecha_actualizacion()
RETURNS TRIGGER AS $$
BEGIN
    NEW.fecha_actualizacion = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- USUARIOS
-- ========================================
CREATE TABLE usuarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email CITEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    telefono VARCHAR(30),
    rol rol_usuario NOT NULL DEFAULT 'cliente',
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    ultimo_login TIMESTAMPTZ,
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_email_no_vacio CHECK (btrim(email::text) <> ''),
    CONSTRAINT check_nombre_no_vacio CHECK (btrim(nombre) <> ''),
    CONSTRAINT check_apellido_no_vacio CHECK (btrim(apellido) <> '')
);

-- ========================================
-- CATEGORIAS
-- ========================================
CREATE TABLE categorias (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    slug VARCHAR(120) NOT NULL UNIQUE,
    descripcion TEXT,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_categoria_nombre_no_vacio CHECK (btrim(nombre) <> ''),
    CONSTRAINT check_categoria_slug_no_vacio CHECK (btrim(slug) <> '')
);

-- ========================================
-- MARCAS
-- ========================================
CREATE TABLE marcas (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(120) NOT NULL UNIQUE,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_marca_nombre_no_vacio CHECK (btrim(nombre) <> ''),
    CONSTRAINT check_marca_slug_no_vacio CHECK (btrim(slug) <> '')
);

-- ========================================
-- PRODUCTOS
-- ========================================
CREATE TABLE productos (
    id SERIAL PRIMARY KEY,
    sku VARCHAR(50) NOT NULL UNIQUE,
    nombre VARCHAR(255) NOT NULL,
    slug VARCHAR(300) NOT NULL UNIQUE,
    descripcion TEXT,
    precio NUMERIC(10,2) NOT NULL CHECK (precio >= 0),
    precio_oferta NUMERIC(10,2) CHECK (precio_oferta >= 0),
    stock_fisico INT NOT NULL DEFAULT 0 CHECK (stock_fisico >= 0),
    stock_reservado INT NOT NULL DEFAULT 0 CHECK (stock_reservado >= 0),
    stock_minimo INT NOT NULL DEFAULT 0 CHECK (stock_minimo >= 0),
    categoria_id INT REFERENCES categorias(id) ON DELETE SET NULL,
    marca_id INT REFERENCES marcas(id) ON DELETE SET NULL,
    imagen_url TEXT,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_producto_nombre_no_vacio CHECK (btrim(nombre) <> ''),
    CONSTRAINT check_producto_sku_no_vacio CHECK (btrim(sku) <> ''),
    CONSTRAINT check_producto_slug_no_vacio CHECK (btrim(slug) <> ''),
    CONSTRAINT check_precio_oferta_menor_igual_precio CHECK (precio_oferta IS NULL OR precio_oferta <= precio),
    CONSTRAINT check_stock_coherente CHECK (stock_reservado <= stock_fisico)
);

-- ========================================
-- ESPECIFICACIONES DE PRODUCTOS
-- ========================================
CREATE TABLE productos_especificaciones (
    id SERIAL PRIMARY KEY,
    producto_id INT NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
    clave VARCHAR(100) NOT NULL,
    valor VARCHAR(255) NOT NULL,
    CONSTRAINT uq_producto_especificacion UNIQUE (producto_id, clave),
    CONSTRAINT check_especificacion_clave_no_vacia CHECK (btrim(clave) <> ''),
    CONSTRAINT check_especificacion_valor_no_vacio CHECK (btrim(valor) <> '')
);

-- ========================================
-- DIRECCIONES
-- ========================================
CREATE TABLE direcciones (
    id SERIAL PRIMARY KEY,
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    titulo VARCHAR(50) NOT NULL DEFAULT 'Casa',
    destinatario_nombre VARCHAR(120),
    telefono_contacto VARCHAR(30),
    direccion TEXT NOT NULL,
    ciudad VARCHAR(100) NOT NULL,
    pais VARCHAR(100) NOT NULL,
    codigo_postal VARCHAR(20),
    referencia TEXT,
    es_principal BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_direccion_titulo_no_vacio CHECK (btrim(titulo) <> ''),
    CONSTRAINT check_direccion_no_vacia CHECK (btrim(direccion) <> ''),
    CONSTRAINT check_ciudad_no_vacia CHECK (btrim(ciudad) <> ''),
    CONSTRAINT check_pais_no_vacio CHECK (btrim(pais) <> '')
);

-- ========================================
-- CARRITOS
-- ========================================
CREATE TABLE carritos (
    id SERIAL PRIMARY KEY,
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    estado estado_carrito NOT NULL DEFAULT 'activo',
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
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
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_carrito_producto UNIQUE (carrito_id, producto_id)
);

-- ========================================
-- PEDIDOS
-- ========================================
CREATE TABLE pedidos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id),
    carrito_id INT UNIQUE REFERENCES carritos(id) ON DELETE SET NULL,
    direccion_id INT REFERENCES direcciones(id) ON DELETE SET NULL,
    nombre_destinatario VARCHAR(120) NOT NULL,
    telefono_contacto VARCHAR(30),
    direccion_envio TEXT NOT NULL,
    ciudad_envio VARCHAR(100) NOT NULL,
    pais_envio VARCHAR(100) NOT NULL,
    codigo_postal_envio VARCHAR(20),
    referencia_envio TEXT,
    subtotal NUMERIC(10,2) NOT NULL CHECK (subtotal >= 0),
    descuento NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (descuento >= 0),
    costo_envio NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (costo_envio >= 0),
    total NUMERIC(10,2) NOT NULL CHECK (total >= 0),
    estado estado_pedido NOT NULL DEFAULT 'pendiente',
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_pedido_destinatario_no_vacio CHECK (btrim(nombre_destinatario) <> ''),
    CONSTRAINT check_pedido_direccion_no_vacia CHECK (btrim(direccion_envio) <> ''),
    CONSTRAINT check_pedido_ciudad_no_vacia CHECK (btrim(ciudad_envio) <> ''),
    CONSTRAINT check_pedido_pais_no_vacio CHECK (btrim(pais_envio) <> ''),
    CONSTRAINT check_pedido_total_coherente CHECK (total = subtotal - descuento + costo_envio)
);

-- ========================================
-- ITEMS DEL PEDIDO
-- ========================================
CREATE TABLE pedido_items (
    id SERIAL PRIMARY KEY,
    pedido_id UUID NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
    producto_id INT REFERENCES productos(id) ON DELETE SET NULL,
    sku_producto VARCHAR(50) NOT NULL,
    nombre_producto VARCHAR(255) NOT NULL,
    cantidad INT NOT NULL CHECK (cantidad > 0),
    precio_unitario NUMERIC(10,2) NOT NULL CHECK (precio_unitario >= 0),
    subtotal NUMERIC(10,2) NOT NULL CHECK (subtotal >= 0),
    CONSTRAINT check_pedido_item_sku_no_vacio CHECK (btrim(sku_producto) <> ''),
    CONSTRAINT check_pedido_item_nombre_no_vacio CHECK (btrim(nombre_producto) <> ''),
    CONSTRAINT check_pedido_item_subtotal_coherente CHECK (subtotal = cantidad * precio_unitario)
);

-- ========================================
-- HISTORIAL DE ESTADOS DEL PEDIDO
-- ========================================
CREATE TABLE pedidos_historial (
    id SERIAL PRIMARY KEY,
    pedido_id UUID NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
    estado_anterior estado_pedido,
    estado_nuevo estado_pedido NOT NULL,
    comentario TEXT,
    creado_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    fecha_registro TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- PAGOS
-- ========================================
CREATE TABLE pagos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pedido_id UUID NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
    metodo metodo_pago NOT NULL,
    estado estado_pago NOT NULL DEFAULT 'pendiente',
    monto NUMERIC(10,2) NOT NULL CHECK (monto >= 0),
    moneda CHAR(3) NOT NULL DEFAULT 'PEN',
    referencia_externa VARCHAR(150),
    detalle_respuesta TEXT,
    fecha_pago TIMESTAMPTZ,
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_pagos_referencia_externa UNIQUE (referencia_externa),
    CONSTRAINT check_pago_moneda_formato CHECK (moneda = UPPER(moneda))
);

-- ========================================
-- MOVIMIENTOS DE INVENTARIO
-- ========================================
CREATE TABLE movimientos_inventario (
    id BIGSERIAL PRIMARY KEY,
    producto_id INT NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
    tipo tipo_movimiento_inventario NOT NULL,
    cantidad INT NOT NULL CHECK (cantidad > 0),
    stock_fisico_anterior INT NOT NULL CHECK (stock_fisico_anterior >= 0),
    stock_fisico_nuevo INT NOT NULL CHECK (stock_fisico_nuevo >= 0),
    stock_reservado_anterior INT NOT NULL CHECK (stock_reservado_anterior >= 0),
    stock_reservado_nuevo INT NOT NULL CHECK (stock_reservado_nuevo >= 0),
    motivo TEXT,
    pedido_id UUID REFERENCES pedidos(id) ON DELETE SET NULL,
    realizado_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_movimiento_stock_fisico_coherente CHECK (stock_reservado_nuevo <= stock_fisico_nuevo)
);

-- ========================================
-- SESIONES / REFRESH TOKENS
-- ========================================
CREATE TABLE sesiones_usuario (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    refresh_token_hash TEXT NOT NULL,
    user_agent TEXT,
    ip_address INET,
    expira_en TIMESTAMPTZ NOT NULL,
    revocado_en TIMESTAMPTZ,
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_sesion_expiracion_valida CHECK (expira_en > fecha_creacion)
);

-- ========================================
-- AUDITORIA ADMINISTRATIVA
-- ========================================
CREATE TABLE admin_auditoria (
    id BIGSERIAL PRIMARY KEY,
    admin_usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    entidad VARCHAR(80) NOT NULL,
    entidad_id VARCHAR(80) NOT NULL,
    accion VARCHAR(80) NOT NULL,
    detalle JSONB,
    ip_address INET,
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_admin_auditoria_entidad_no_vacia CHECK (btrim(entidad) <> ''),
    CONSTRAINT check_admin_auditoria_entidad_id_no_vacia CHECK (btrim(entidad_id) <> ''),
    CONSTRAINT check_admin_auditoria_accion_no_vacia CHECK (btrim(accion) <> '')
);

-- ========================================
-- TRIGGERS DE FECHA ACTUALIZACION
-- ========================================
CREATE TRIGGER trg_usuarios_fecha_actualizacion
BEFORE UPDATE ON usuarios
FOR EACH ROW
EXECUTE FUNCTION actualizar_fecha_actualizacion();

CREATE TRIGGER trg_categorias_fecha_actualizacion
BEFORE UPDATE ON categorias
FOR EACH ROW
EXECUTE FUNCTION actualizar_fecha_actualizacion();

CREATE TRIGGER trg_marcas_fecha_actualizacion
BEFORE UPDATE ON marcas
FOR EACH ROW
EXECUTE FUNCTION actualizar_fecha_actualizacion();

CREATE TRIGGER trg_productos_fecha_actualizacion
BEFORE UPDATE ON productos
FOR EACH ROW
EXECUTE FUNCTION actualizar_fecha_actualizacion();

CREATE TRIGGER trg_direcciones_fecha_actualizacion
BEFORE UPDATE ON direcciones
FOR EACH ROW
EXECUTE FUNCTION actualizar_fecha_actualizacion();

CREATE TRIGGER trg_carritos_fecha_actualizacion
BEFORE UPDATE ON carritos
FOR EACH ROW
EXECUTE FUNCTION actualizar_fecha_actualizacion();

CREATE TRIGGER trg_carrito_items_fecha_actualizacion
BEFORE UPDATE ON carrito_items
FOR EACH ROW
EXECUTE FUNCTION actualizar_fecha_actualizacion();

CREATE TRIGGER trg_pedidos_fecha_actualizacion
BEFORE UPDATE ON pedidos
FOR EACH ROW
EXECUTE FUNCTION actualizar_fecha_actualizacion();

CREATE TRIGGER trg_pagos_fecha_actualizacion
BEFORE UPDATE ON pagos
FOR EACH ROW
EXECUTE FUNCTION actualizar_fecha_actualizacion();

-- ========================================
-- INDICES
-- ========================================
CREATE INDEX idx_usuarios_rol ON usuarios(rol);
CREATE INDEX idx_usuarios_activo ON usuarios(activo);

CREATE INDEX idx_categorias_activo ON categorias(activo);
CREATE INDEX idx_marcas_activo ON marcas(activo);

CREATE INDEX idx_productos_categoria ON productos(categoria_id);
CREATE INDEX idx_productos_marca ON productos(marca_id);
CREATE INDEX idx_productos_slug ON productos(slug);
CREATE INDEX idx_productos_activo ON productos(activo);
CREATE INDEX idx_productos_stock_minimo ON productos(stock_minimo);

CREATE INDEX idx_direcciones_usuario ON direcciones(usuario_id);
CREATE UNIQUE INDEX uq_direccion_principal_por_usuario
    ON direcciones(usuario_id)
    WHERE es_principal = TRUE;

CREATE INDEX idx_carritos_usuario ON carritos(usuario_id);
CREATE INDEX idx_carritos_usuario_estado ON carritos(usuario_id, estado);
CREATE UNIQUE INDEX uq_carrito_activo_por_usuario
    ON carritos(usuario_id)
    WHERE estado = 'activo';

CREATE INDEX idx_carrito_items_carrito ON carrito_items(carrito_id);
CREATE INDEX idx_carrito_items_producto ON carrito_items(producto_id);

CREATE INDEX idx_pedidos_usuario ON pedidos(usuario_id);
CREATE INDEX idx_pedidos_estado ON pedidos(estado);
CREATE INDEX idx_pedidos_fecha_creacion ON pedidos(fecha_creacion);

CREATE INDEX idx_pedido_items_pedido ON pedido_items(pedido_id);
CREATE INDEX idx_pedido_items_producto ON pedido_items(producto_id);

CREATE INDEX idx_pedidos_historial_pedido ON pedidos_historial(pedido_id);
CREATE INDEX idx_pedidos_historial_fecha ON pedidos_historial(fecha_registro);

CREATE INDEX idx_pagos_pedido ON pagos(pedido_id);
CREATE INDEX idx_pagos_estado ON pagos(estado);
CREATE INDEX idx_pagos_fecha_pago ON pagos(fecha_pago);

CREATE INDEX idx_movimientos_inventario_producto ON movimientos_inventario(producto_id);
CREATE INDEX idx_movimientos_inventario_tipo ON movimientos_inventario(tipo);
CREATE INDEX idx_movimientos_inventario_fecha ON movimientos_inventario(fecha_creacion);

CREATE INDEX idx_sesiones_usuario ON sesiones_usuario(usuario_id);
CREATE INDEX idx_sesiones_expira_en ON sesiones_usuario(expira_en);

CREATE INDEX idx_admin_auditoria_admin ON admin_auditoria(admin_usuario_id);
CREATE INDEX idx_admin_auditoria_fecha ON admin_auditoria(fecha_creacion);

-- ========================================
-- DATOS INICIALES (SEMILLA)
-- ========================================

-- Insertar Categorías
INSERT INTO categorias (nombre, slug, descripcion) VALUES
('Laptops', 'laptops', 'Computadoras portátiles de alto rendimiento'),
('Smartphones', 'smartphones', 'Teléfonos inteligentes de última generación'),
('Televisores', 'televisores', 'Smart TVs y pantallas de alta resolución'),
('Audio', 'audio', 'Audífonos, parlantes y equipos de sonido'),
('Tablets', 'tablets', 'Tabletas para productividad y entretenimiento'),
('Smartwatches', 'smartwatches', 'Relojes inteligentes y wearables'),
('Monitores', 'monitores', 'Monitores para PC y gaming')
ON CONFLICT (slug) DO NOTHING;

-- Insertar Marcas
INSERT INTO marcas (nombre, slug) VALUES
('Apple', 'apple'),
('Samsung', 'samsung'),
('Sony', 'sony'),
('LG', 'lg'),
('Asus', 'asus'),
('HP', 'hp'),
('Dell', 'dell'),
('Lenovo', 'lenovo'),
('Xiaomi', 'xiaomi'),
('Bose', 'bose'),
('JBL', 'jbl')
ON CONFLICT (nombre) DO NOTHING;

-- Insertar Productos
INSERT INTO productos (sku, nombre, slug, descripcion, precio, stock_fisico, stock_reservado, stock_minimo, categoria_id, marca_id, imagen_url) VALUES
('APP-MBP-14', 'MacBook Pro 14"', 'macbook-pro-14', 'Chip M3 Pro, 16GB RAM, 512GB SSD', 1999.00, 50, 0, 5, (SELECT id FROM categorias WHERE slug='laptops'), (SELECT id FROM marcas WHERE slug='apple'), 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80'),
('APP-IPH-15P', 'iPhone 15 Pro', 'iphone-15-pro', 'Titanio, A17 Pro, 256GB', 1099.00, 100, 0, 10, (SELECT id FROM categorias WHERE slug='smartphones'), (SELECT id FROM marcas WHERE slug='apple'), 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?auto=format&fit=crop&w=800&q=80'),
('SAM-S24-U', 'Samsung Galaxy S24 Ultra', 'samsung-galaxy-s24-ultra', 'Snapdragon 8 Gen 3, 256GB, 12GB RAM', 1299.00, 80, 0, 10, (SELECT id FROM categorias WHERE slug='smartphones'), (SELECT id FROM marcas WHERE slug='samsung'), 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=800&q=80'),
('SON-WH1000XM5', 'Sony WH-1000XM5', 'sony-wh-1000xm5', 'Audífonos inalámbricos con cancelación de ruido', 349.00, 150, 0, 20, (SELECT id FROM categorias WHERE slug='audio'), (SELECT id FROM marcas WHERE slug='sony'), 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?auto=format&fit=crop&w=800&q=80'),
('LG-OLED-65', 'LG OLED TV 65" C3', 'lg-oled-tv-65-c3', 'Smart TV 4K UHD, 120Hz', 1599.00, 30, 0, 5, (SELECT id FROM categorias WHERE slug='televisores'), (SELECT id FROM marcas WHERE slug='lg'), 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&w=800&q=80'),
('ASU-ROG-G15', 'Asus ROG Strix G15', 'asus-rog-strix-g15', 'Ryzen 9, RTX 4070, 16GB RAM, 1TB SSD', 1499.00, 40, 0, 5, (SELECT id FROM categorias WHERE slug='laptops'), (SELECT id FROM marcas WHERE slug='asus'), 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&w=800&q=80'),
('APP-IPAD-PRO', 'iPad Pro 12.9"', 'ipad-pro-12-9', 'Chip M2, Pantalla Liquid Retina XDR', 1099.00, 60, 0, 10, (SELECT id FROM categorias WHERE slug='tablets'), (SELECT id FROM marcas WHERE slug='apple'), 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&w=800&q=80'),
('SAM-TAB-S9', 'Samsung Galaxy Tab S9', 'samsung-galaxy-tab-s9', 'AMOLED 11", Snapdragon 8 Gen 2', 799.00, 75, 0, 10, (SELECT id FROM categorias WHERE slug='tablets'), (SELECT id FROM marcas WHERE slug='samsung'), 'https://images.unsplash.com/photo-1589739900266-43b2843f4c12?auto=format&fit=crop&w=800&q=80'),
('APP-AW-U2', 'Apple Watch Ultra 2', 'apple-watch-ultra-2', 'Caja de titanio de 49mm, resistente al agua', 799.00, 40, 0, 5, (SELECT id FROM categorias WHERE slug='smartwatches'), (SELECT id FROM marcas WHERE slug='apple'), 'https://images.unsplash.com/photo-1434493789847-2902a52dda56?auto=format&fit=crop&w=800&q=80'),
('SAM-GW-6', 'Samsung Galaxy Watch 6', 'samsung-galaxy-watch-6', 'Monitoreo avanzado de salud y sueño', 299.00, 90, 0, 10, (SELECT id FROM categorias WHERE slug='smartwatches'), (SELECT id FROM marcas WHERE slug='samsung'), 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?auto=format&fit=crop&w=800&q=80'),
('BOS-QC-ULTRA', 'Bose QuietComfort Ultra', 'bose-qc-ultra', 'Cancelación de ruido de clase mundial', 429.00, 120, 0, 15, (SELECT id FROM categorias WHERE slug='audio'), (SELECT id FROM marcas WHERE slug='bose'), 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=800&q=80'),
('JBL-FLIP-6', 'JBL Flip 6', 'jbl-flip-6', 'Parlante Bluetooth portátil a prueba de agua', 129.00, 200, 0, 30, (SELECT id FROM categorias WHERE slug='audio'), (SELECT id FROM marcas WHERE slug='jbl'), 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=800&q=80'),
('XIA-14-PRO', 'Xiaomi 14 Pro', 'xiaomi-14-pro', 'Lentes Leica, Snapdragon 8 Gen 3', 899.00, 65, 0, 10, (SELECT id FROM categorias WHERE slug='smartphones'), (SELECT id FROM marcas WHERE slug='xiaomi'), 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=800&q=80'),
('DEL-XPS-15', 'Dell XPS 15', 'dell-xps-15', 'Intel Core i9, 32GB RAM, Pantalla OLED 4K', 2199.00, 25, 0, 5, (SELECT id FROM categorias WHERE slug='laptops'), (SELECT id FROM marcas WHERE slug='dell'), 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=800&q=80'),
('LEN-LEG-5', 'Lenovo Legion 5 Pro', 'lenovo-legion-5-pro', 'Ryzen 7, RTX 4060, 16GB RAM', 1399.00, 45, 0, 5, (SELECT id FROM categorias WHERE slug='laptops'), (SELECT id FROM marcas WHERE slug='lenovo'), 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&w=800&q=80'),
('HP-OMEN-16', 'HP Omen 16', 'hp-omen-16', 'Intel Core i7, RTX 4070, Pantalla 165Hz', 1599.00, 35, 0, 5, (SELECT id FROM categorias WHERE slug='laptops'), (SELECT id FROM marcas WHERE slug='hp'), 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&w=800&q=80'),
('LG-ULTRAGEAR-27', 'LG UltraGear 27"', 'lg-ultragear-27', 'Monitor Gaming QHD 165Hz Nano IPS', 399.00, 80, 0, 10, (SELECT id FROM categorias WHERE slug='monitores'), (SELECT id FROM marcas WHERE slug='lg'), 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=800&q=80'),
('SAM-ODYSSEY-G7', 'Samsung Odyssey G7 32"', 'samsung-odyssey-g7', 'Monitor Curvo 1000R, QHD 240Hz', 699.00, 40, 0, 5, (SELECT id FROM categorias WHERE slug='monitores'), (SELECT id FROM marcas WHERE slug='samsung'), 'https://images.unsplash.com/photo-1586227740560-8cf2732c1531?auto=format&fit=crop&w=800&q=80'),
('SON-BRAVIA-75', 'Sony Bravia XR 75"', 'sony-bravia-xr-75', 'Mini LED 4K HDR Smart TV', 2499.00, 15, 0, 3, (SELECT id FROM categorias WHERE slug='televisores'), (SELECT id FROM marcas WHERE slug='sony'), 'https://images.unsplash.com/photo-1552831388-6a0b35077328?auto=format&fit=crop&w=800&q=80'),
('APP-AIRPODS-PRO', 'AirPods Pro 2', 'airpods-pro-2', 'Audio espacial y cancelación de ruido activa', 249.00, 300, 0, 50, (SELECT id FROM categorias WHERE slug='audio'), (SELECT id FROM marcas WHERE slug='apple'), 'https://images.unsplash.com/photo-1606220588913-b3aecb492097?auto=format&fit=crop&w=800&q=80')
ON CONFLICT (sku) DO NOTHING;

-- Insertar Especificaciones
INSERT INTO productos_especificaciones (producto_id, clave, valor) VALUES
((SELECT id FROM productos WHERE sku='APP-MBP-14'), 'Procesador', 'M3 Pro'),
((SELECT id FROM productos WHERE sku='APP-MBP-14'), 'RAM', '16GB Unified'),
((SELECT id FROM productos WHERE sku='APP-IPH-15P'), 'Capacidad', '256GB'),
((SELECT id FROM productos WHERE sku='SAM-S24-U'), 'Cámara', '200MP'),
((SELECT id FROM productos WHERE sku='SON-WH1000XM5'), 'Batería', '30 horas'),
((SELECT id FROM productos WHERE sku='APP-IPAD-PRO'), 'Pantalla', '12.9" Liquid Retina XDR'),
((SELECT id FROM productos WHERE sku='SAM-TAB-S9'), 'Pantalla', '11" Dynamic AMOLED 2X'),
((SELECT id FROM productos WHERE sku='APP-AW-U2'), 'Material', 'Titanio de grado aeroespacial'),
((SELECT id FROM productos WHERE sku='BOS-QC-ULTRA'), 'Cancelación de ruido', 'Activa adaptativa'),
((SELECT id FROM productos WHERE sku='DEL-XPS-15'), 'Gráficos', 'NVIDIA RTX 4070')
ON CONFLICT (producto_id, clave) DO NOTHING;

-- Insertar Movimientos de Inventario (Entrada inicial)
INSERT INTO movimientos_inventario (producto_id, tipo, cantidad, stock_fisico_anterior, stock_fisico_nuevo, stock_reservado_anterior, stock_reservado_nuevo, motivo)
SELECT id, 'entrada', stock_fisico, 0, stock_fisico, 0, 0, 'Stock inicial masivo'
FROM productos
WHERE id NOT IN (SELECT DISTINCT producto_id FROM movimientos_inventario);


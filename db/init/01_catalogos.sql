-- ============================================================
-- PARTE 1: Catálogos (usuarios, mesas, insumos, productos, recetas)
-- Motor: MariaDB 10.5+ (compatible con MySQL 8). Abrir en HeidiSQL > Archivo > Ejecutar archivo SQL.
-- OJO:   los DROP del inicio borran todo; útil en desarrollo, no en producción.
-- ============================================================

CREATE DATABASE IF NOT EXISTS restaurante CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE restaurante;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS recetas, productos, insumos, mesas, usuarios;
SET FOREIGN_KEY_CHECKS = 1;

-- ---------- USUARIOS (módulo obligatorio: CRUD + login) ----------
CREATE TABLE usuarios (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  nombre         VARCHAR(100) NOT NULL,
  email          VARCHAR(150) NOT NULL UNIQUE,
  password_hash  VARCHAR(255) NOT NULL,                      -- bcrypt, nunca texto plano
  rol            VARCHAR(20)  NOT NULL DEFAULT 'mesero',
  activo         TINYINT(1)   NOT NULL DEFAULT 1,            -- borrado lógico
  creado_en      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_usuarios_rol CHECK (rol IN ('admin', 'mesero', 'cocina'))
) ENGINE=InnoDB;

-- ---------- MESAS ----------
CREATE TABLE mesas (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  numero     INT NOT NULL UNIQUE,
  capacidad  INT NOT NULL DEFAULT 4,
  estado     VARCHAR(10) NOT NULL DEFAULT 'libre',
  activo     TINYINT(1)  NOT NULL DEFAULT 1,
  CONSTRAINT chk_mesas_numero    CHECK (numero > 0),
  CONSTRAINT chk_mesas_capacidad CHECK (capacidad > 0),
  CONSTRAINT chk_mesas_estado    CHECK (estado IN ('libre', 'ocupada'))
) ENGINE=InnoDB;

-- ---------- INSUMOS (inventario real: lo que se gasta con las recetas) ----------
CREATE TABLE insumos (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  nombre        VARCHAR(100)  NOT NULL UNIQUE,
  unidad        VARCHAR(10)   NOT NULL,
  stock         DECIMAL(12,3) NOT NULL DEFAULT 0,
  stock_minimo  DECIMAL(12,3) NOT NULL DEFAULT 0,
  activo        TINYINT(1)    NOT NULL DEFAULT 1,
  CONSTRAINT chk_insumos_unidad CHECK (unidad IN ('g', 'ml', 'unidad')),
  CONSTRAINT chk_insumos_stock  CHECK (stock >= 0),            -- nunca negativo
  CONSTRAINT chk_insumos_min    CHECK (stock_minimo >= 0)
) ENGINE=InnoDB;

-- ---------- PRODUCTOS (lo que se vende: platillos y bebidas) ----------
CREATE TABLE productos (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  nombre     VARCHAR(100) NOT NULL UNIQUE,
  categoria  VARCHAR(30)  NOT NULL DEFAULT 'platillo',
  precio     DECIMAL(10,2) NOT NULL,
  activo     TINYINT(1)   NOT NULL DEFAULT 1,
  CONSTRAINT chk_productos_cat    CHECK (categoria IN ('platillo', 'bebida', 'entrada', 'postre')),
  CONSTRAINT chk_productos_precio CHECK (precio >= 0)
) ENGINE=InnoDB;

-- ---------- RECETAS (cuánto insumo gasta 1 unidad de cada producto) ----------
CREATE TABLE recetas (
  producto_id  INT NOT NULL,
  insumo_id    INT NOT NULL,
  cantidad     DECIMAL(12,3) NOT NULL,
  PRIMARY KEY (producto_id, insumo_id),
  CONSTRAINT fk_recetas_producto FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE,
  CONSTRAINT fk_recetas_insumo   FOREIGN KEY (insumo_id)   REFERENCES insumos(id)   ON DELETE RESTRICT,
  CONSTRAINT chk_recetas_cant    CHECK (cantidad > 0)
) ENGINE=InnoDB;

-- ============================================================
-- PARTE 2: Pedidos, ítems (con comensal) y movimientos de inventario
-- Requiere haber corrido la parte 1. Motor: MariaDB 10.5+.
-- Si vuelves a correr 01_catalogos.sql, corre este archivo de nuevo después.
-- ============================================================
USE restaurante;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS movimientos_inventario, pedido_items, pedidos;
SET FOREIGN_KEY_CHECKS = 1;

-- ---------- PEDIDOS (cabecera) ----------
CREATE TABLE pedidos (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  mesa_id         INT NOT NULL,
  usuario_id      INT NOT NULL,                              -- mesero que lo tomó
  num_comensales  INT NOT NULL DEFAULT 1,
  estado          VARCHAR(20) NOT NULL DEFAULT 'pendiente',
  total           DECIMAL(10,2) NOT NULL DEFAULT 0,          -- lo calcula la API al crear/editar
  notas           VARCHAR(255) NULL,
  creado_en       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_pedidos_mesa    FOREIGN KEY (mesa_id)    REFERENCES mesas(id)    ON DELETE RESTRICT,
  CONSTRAINT fk_pedidos_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE RESTRICT,
  CONSTRAINT chk_pedidos_comensales CHECK (num_comensales >= 1),
  CONSTRAINT chk_pedidos_estado     CHECK (estado IN ('pendiente', 'en_preparacion', 'entregado', 'cancelado')),
  CONSTRAINT chk_pedidos_total      CHECK (total >= 0),
  INDEX idx_pedidos_estado (estado),
  INDEX idx_pedidos_mesa   (mesa_id),
  INDEX idx_pedidos_fecha  (creado_en)
) ENGINE=InnoDB;

-- ---------- PEDIDO_ITEMS (detalle) ----------
-- comensal: 1..num_comensales = de quién es el ítem; NULL = compartido (se reparte en partes iguales)
CREATE TABLE pedido_items (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  pedido_id        INT NOT NULL,
  producto_id      INT NOT NULL,
  cantidad         INT NOT NULL,
  precio_unitario  DECIMAL(10,2) NOT NULL,                   -- precio al momento de vender (no cambia si el producto sube)
  comensal         SMALLINT NULL,
  CONSTRAINT fk_items_pedido   FOREIGN KEY (pedido_id)   REFERENCES pedidos(id)   ON DELETE CASCADE,
  CONSTRAINT fk_items_producto FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE RESTRICT,
  CONSTRAINT chk_items_cantidad  CHECK (cantidad > 0),
  CONSTRAINT chk_items_precio    CHECK (precio_unitario >= 0),
  CONSTRAINT chk_items_comensal  CHECK (comensal IS NULL OR comensal >= 1),
  INDEX idx_items_pedido   (pedido_id),
  INDEX idx_items_producto (producto_id)
) ENGINE=InnoDB;

-- El comensal no puede ser mayor que num_comensales del pedido (regla entre tablas => trigger)
DROP TRIGGER IF EXISTS trg_items_comensal_ins;
DROP TRIGGER IF EXISTS trg_items_comensal_upd;
DELIMITER $$
CREATE TRIGGER trg_items_comensal_ins BEFORE INSERT ON pedido_items
FOR EACH ROW
BEGIN
  IF NEW.comensal IS NOT NULL
     AND NEW.comensal > (SELECT num_comensales FROM pedidos WHERE id = NEW.pedido_id) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El comensal excede num_comensales del pedido';
  END IF;
END$$
CREATE TRIGGER trg_items_comensal_upd BEFORE UPDATE ON pedido_items
FOR EACH ROW
BEGIN
  IF NEW.comensal IS NOT NULL
     AND NEW.comensal > (SELECT num_comensales FROM pedidos WHERE id = NEW.pedido_id) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El comensal excede num_comensales del pedido';
  END IF;
END$$
DELIMITER ;

-- ---------- MOVIMIENTOS_INVENTARIO (historial de todo cambio de stock) ----------
-- cantidad con signo: negativo = sale stock (consumo), positivo = entra (devolución / ajuste +)
CREATE TABLE movimientos_inventario (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  insumo_id         INT NOT NULL,
  tipo              VARCHAR(15) NOT NULL,
  cantidad          DECIMAL(12,3) NOT NULL,
  stock_resultante  DECIMAL(12,3) NOT NULL,                  -- stock del insumo después del movimiento
  pedido_id         INT NULL,                                -- solo para consumo / devolución
  usuario_id        INT NOT NULL,
  motivo            VARCHAR(200) NULL,
  creado_en         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_mov_insumo  FOREIGN KEY (insumo_id)  REFERENCES insumos(id)  ON DELETE RESTRICT,
  CONSTRAINT fk_mov_pedido  FOREIGN KEY (pedido_id)  REFERENCES pedidos(id)  ON DELETE SET NULL,
  CONSTRAINT fk_mov_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE RESTRICT,
  CONSTRAINT chk_mov_tipo     CHECK (tipo IN ('ajuste', 'consumo', 'devolucion')),
  CONSTRAINT chk_mov_cantidad CHECK (cantidad <> 0),
  CONSTRAINT chk_mov_stock    CHECK (stock_resultante >= 0),
  INDEX idx_mov_insumo (insumo_id),
  INDEX idx_mov_pedido (pedido_id),
  INDEX idx_mov_fecha  (creado_en)
) ENGINE=InnoDB;

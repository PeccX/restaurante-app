-- ============================================================
-- Migración para una BD creada antes del pago (ejecutar una vez, como root).
-- En una instalación nueva no hace falta: 02 y 03 ya traen estos cambios.
-- ============================================================
USE restaurante;
SET time_zone = '-06:00';

ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS pagado_en   TIMESTAMP   NULL DEFAULT NULL;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS metodo_pago VARCHAR(20) NULL;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS pagado_por  INT         NULL;
ALTER TABLE pedidos MODIFY COLUMN pagado_en TIMESTAMP NULL DEFAULT NULL;   -- la versión anterior lo creó como DATETIME

ALTER TABLE pedidos DROP CONSTRAINT IF EXISTS chk_pedidos_pago;
ALTER TABLE pedidos ADD CONSTRAINT chk_pedidos_pago CHECK (
  (pagado_en IS NULL AND metodo_pago IS NULL AND pagado_por IS NULL)
  OR (pagado_en IS NOT NULL AND metodo_pago IN ('efectivo', 'tarjeta', 'transferencia') AND estado = 'entregado'));
ALTER TABLE pedidos DROP FOREIGN KEY IF EXISTS fk_pedidos_pagado_por;
ALTER TABLE pedidos ADD CONSTRAINT fk_pedidos_pagado_por FOREIGN KEY (pagado_por) REFERENCES usuarios(id) ON DELETE RESTRICT;
ALTER TABLE pedidos DROP INDEX IF EXISTS idx_pedidos_pagado;
ALTER TABLE pedidos ADD INDEX idx_pedidos_pagado (pagado_en);

-- Entregados antes de existir el pago: se toman como pagados en efectivo
UPDATE pedidos SET pagado_en = actualizado_en, metodo_pago = 'efectivo', actualizado_en = actualizado_en
WHERE estado = 'entregado' AND pagado_en IS NULL;

ALTER TABLE productos DROP CONSTRAINT IF EXISTS chk_productos_precio;
ALTER TABLE productos ADD CONSTRAINT chk_productos_precio CHECK (precio > 0);

CREATE OR REPLACE VIEW v_ventas_diarias AS
SELECT DATE(pagado_en)      AS fecha,
       COUNT(*)             AS num_pedidos,
       SUM(num_comensales)  AS comensales,
       SUM(total)           AS total_ventas
FROM pedidos
WHERE estado = 'entregado' AND pagado_en IS NOT NULL
GROUP BY DATE(pagado_en);

CREATE OR REPLACE VIEW v_productos_mas_vendidos AS
SELECT p.id AS producto_id, p.nombre AS producto, p.categoria,
       SUM(i.cantidad)                      AS unidades_vendidas,
       SUM(i.cantidad * i.precio_unitario)  AS ingresos
FROM pedido_items i
JOIN pedidos   pe ON pe.id = i.pedido_id AND pe.estado = 'entregado' AND pe.pagado_en IS NOT NULL
JOIN productos p  ON p.id  = i.producto_id
GROUP BY p.id, p.nombre, p.categoria;

CREATE OR REPLACE VIEW v_detalle_pedido AS
SELECT pe.id AS pedido_id, m.numero AS mesa, u.nombre AS mesero, pe.estado,
       pe.num_comensales, pe.creado_en, pe.pagado_en, pe.metodo_pago,
       i.id AS item_id, pr.nombre AS producto, i.cantidad, i.precio_unitario,
       (i.cantidad * i.precio_unitario) AS subtotal, i.comensal
FROM pedidos pe
JOIN mesas m          ON m.id  = pe.mesa_id
JOIN usuarios u       ON u.id  = pe.usuario_id
JOIN pedido_items i   ON i.pedido_id = pe.id
JOIN productos pr     ON pr.id = i.producto_id;

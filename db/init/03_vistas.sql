-- ============================================================
-- PARTE 3a: Vistas para reportes y pantallas.
-- Venta = pedido entregado y pagado; se cuenta en la fecha del pago.
-- ============================================================
USE restaurante;

-- Índice compuesto para los reportes por estado y fecha
ALTER TABLE pedidos DROP INDEX IF EXISTS idx_pedidos_estado_fecha;
ALTER TABLE pedidos ADD INDEX idx_pedidos_estado_fecha (estado, creado_en);

-- ---------- Ventas por día (Excel: hoja de ventas) ----------
CREATE OR REPLACE VIEW v_ventas_diarias AS
SELECT DATE(pagado_en)      AS fecha,
       COUNT(*)             AS num_pedidos,
       SUM(num_comensales)  AS comensales,
       SUM(total)           AS total_ventas
FROM pedidos
WHERE estado = 'entregado' AND pagado_en IS NOT NULL
GROUP BY DATE(pagado_en);

-- ---------- Productos más vendidos (Excel: hoja de ranking) ----------
CREATE OR REPLACE VIEW v_productos_mas_vendidos AS
SELECT p.id AS producto_id, p.nombre AS producto, p.categoria,
       SUM(i.cantidad)                      AS unidades_vendidas,
       SUM(i.cantidad * i.precio_unitario)  AS ingresos
FROM pedido_items i
JOIN pedidos   pe ON pe.id = i.pedido_id AND pe.estado = 'entregado' AND pe.pagado_en IS NOT NULL
JOIN productos p  ON p.id  = i.producto_id
GROUP BY p.id, p.nombre, p.categoria;

-- ---------- Insumos en o bajo el mínimo (alertas de inventario) ----------
CREATE OR REPLACE VIEW v_insumos_bajo_minimo AS
SELECT id, nombre, unidad, stock, stock_minimo, (stock_minimo - stock) AS faltante
FROM insumos
WHERE activo = 1 AND stock <= stock_minimo;

-- ---------- Porciones que se pueden preparar con el stock actual (formulario de pedido) ----------
CREATE OR REPLACE VIEW v_porciones_disponibles AS
SELECT p.id AS producto_id, p.nombre AS producto,
       CAST(MIN(FLOOR(i.stock / r.cantidad)) AS UNSIGNED) AS porciones
FROM productos p
JOIN recetas r ON r.producto_id = p.id
JOIN insumos i ON i.id = r.insumo_id
WHERE p.activo = 1
GROUP BY p.id, p.nombre;

-- ---------- Detalle de un pedido (PDF de la cuenta) ----------
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

-- ---------- Cuenta dividida, modo "por consumo" ----------
-- Cada comensal paga lo suyo + su parte de lo compartido (comensal NULL).
-- El último comensal absorbe los centavos de redondeo para que la suma cuadre con el total.
-- El modo "partes iguales" lo calcula la API.
CREATE OR REPLACE VIEW v_cuenta_consumo AS
WITH RECURSIVE nums AS (
  SELECT 1 AS n UNION ALL SELECT n + 1 FROM nums WHERE n < 50
),
base AS (
  SELECT p.id AS pedido_id, p.num_comensales, nums.n AS comensal,
         COALESCE((SELECT SUM(i.cantidad * i.precio_unitario) FROM pedido_items i
                   WHERE i.pedido_id = p.id AND i.comensal = nums.n), 0) AS propio,
         COALESCE((SELECT SUM(i.cantidad * i.precio_unitario) FROM pedido_items i
                   WHERE i.pedido_id = p.id AND i.comensal IS NULL), 0) / p.num_comensales AS compartido
  FROM pedidos p
  JOIN nums ON nums.n <= p.num_comensales
),
ajuste AS (
  SELECT base.*,
         ROUND(propio + compartido, 2)                                   AS total_r,
         SUM(propio + compartido)        OVER w                          AS suma_real,
         SUM(ROUND(propio + compartido, 2)) OVER w                       AS suma_redondeada
  FROM base
  WINDOW w AS (PARTITION BY pedido_id)
)
SELECT pedido_id, comensal,
       ROUND(propio, 2) AS propio,
       ROUND(total_r + IF(comensal = num_comensales, suma_real - suma_redondeada, 0), 2) - ROUND(propio, 2) AS compartido,
       ROUND(total_r + IF(comensal = num_comensales, suma_real - suma_redondeada, 0), 2) AS total_a_pagar
FROM ajuste;

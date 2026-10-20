-- ============================================================
-- PARTE 1 (datos de prueba + pruebas). Correr DESPUÉS de 01_catalogos.sql
-- ============================================================
SET NAMES utf8mb4;
USE restaurante;

-- Usuarios de prueba (hash bcrypt, compatible con bcrypt/bcryptjs de Node)
--   admin@sabor.gt  / Admin123!      mesero@sabor.gt / Mesero123!   (cámbialos antes de desplegar)
INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES
  ('Administrador', 'admin@sabor.gt',  '$2b$10$6WDv5wht1fmopcBwYjzW8ec/mWjzbWDMe9Z2CarCz3xXsmAREdzlu', 'admin'),
  ('Mesero Demo',   'mesero@sabor.gt', '$2b$10$1RiayJMyXFOrgLfLay929e/.AUiKdv51ABgLbhpnrzgxL12CUHmpi', 'mesero');

INSERT INTO mesas (numero, capacidad) VALUES (1,2),(2,2),(3,4),(4,4),(5,6),(6,8);

INSERT INTO insumos (nombre, unidad, stock, stock_minimo) VALUES
  ('Pan de hamburguesa', 'unidad',   40,   10),
  ('Carne molida',       'g',      5000, 1000),
  ('Queso',              'g',      3000,  500),
  ('Lechuga',            'g',      1500,  300),
  ('Tomate',             'g',      2000,  400),
  ('Pollo',              'g',      6000, 1000),
  ('Tortilla',           'unidad',  100,   20),
  ('Frijol',             'g',      3000,  500),
  ('Papa',               'g',      5000, 1000),
  ('Gaseosa',            'unidad',   48,   12);

INSERT INTO productos (nombre, categoria, precio) VALUES
  ('Hamburguesa clásica',    'platillo', 35.00),
  ('Pollo asado con frijol', 'platillo', 45.00),
  ('Papas fritas',           'entrada',  18.00),
  ('Ensalada fresca',        'entrada',  22.00),
  ('Gaseosa',                'bebida',   10.00);

-- Recetas por 1 unidad vendida (se buscan por nombre para no depender de los ids)
INSERT INTO recetas (producto_id, insumo_id, cantidad)
SELECT p.id, i.id, r.cant
FROM (
  SELECT 'Hamburguesa clásica' AS prod, 'Pan de hamburguesa' AS ins,   1 AS cant UNION ALL
  SELECT 'Hamburguesa clásica',    'Carne molida',       150 UNION ALL
  SELECT 'Hamburguesa clásica',    'Queso',               30 UNION ALL
  SELECT 'Hamburguesa clásica',    'Lechuga',             20 UNION ALL
  SELECT 'Hamburguesa clásica',    'Tomate',              30 UNION ALL
  SELECT 'Pollo asado con frijol', 'Pollo',              250 UNION ALL
  SELECT 'Pollo asado con frijol', 'Frijol',             100 UNION ALL
  SELECT 'Pollo asado con frijol', 'Tortilla',             3 UNION ALL
  SELECT 'Papas fritas',           'Papa',               200 UNION ALL
  SELECT 'Ensalada fresca',        'Lechuga',            100 UNION ALL
  SELECT 'Ensalada fresca',        'Tomate',              80 UNION ALL
  SELECT 'Ensalada fresca',        'Queso',               20 UNION ALL
  SELECT 'Gaseosa',                'Gaseosa',              1
) AS r
JOIN productos p ON p.nombre = r.prod
JOIN insumos   i ON i.nombre = r.ins;

-- ============================================================
-- PRUEBAS DE RESTRICCIONES: cada intento DEBE fallar. Resultado: OK / FALLO
-- (en HeidiSQL, ejecuta todo el archivo; la última pestaña de resultados trae la tabla)
-- ============================================================
DROP PROCEDURE IF EXISTS sp_pruebas_catalogos;
DELIMITER $$
CREATE PROCEDURE sp_pruebas_catalogos()
BEGIN
  DECLARE fallo_esperado TINYINT(1);
  DROP TEMPORARY TABLE IF EXISTS resultados_pruebas;
  CREATE TEMPORARY TABLE resultados_pruebas (prueba VARCHAR(60), resultado VARCHAR(6));

  SET fallo_esperado = 0;
  BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION SET fallo_esperado = 1;
    INSERT INTO insumos (nombre, unidad, stock) VALUES ('Prueba', 'g', -1);
  END;
  INSERT INTO resultados_pruebas VALUES ('stock negativo rechazado', IF(fallo_esperado, 'OK', 'FALLO'));

  SET fallo_esperado = 0;
  BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION SET fallo_esperado = 1;
    INSERT INTO usuarios (nombre, email, password_hash) VALUES ('X', 'admin@sabor.gt', 'x');
  END;
  INSERT INTO resultados_pruebas VALUES ('email duplicado rechazado', IF(fallo_esperado, 'OK', 'FALLO'));

  SET fallo_esperado = 0;
  BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION SET fallo_esperado = 1;
    INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES ('X', 'x@x.com', 'x', 'dueño');
  END;
  INSERT INTO resultados_pruebas VALUES ('rol inválido rechazado', IF(fallo_esperado, 'OK', 'FALLO'));

  SET fallo_esperado = 0;
  BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION SET fallo_esperado = 1;
    INSERT INTO recetas (producto_id, insumo_id, cantidad)
    SELECT p.id, i.id, 0 FROM productos p, insumos i WHERE p.nombre = 'Gaseosa' AND i.nombre = 'Pan de hamburguesa';
  END;
  INSERT INTO resultados_pruebas VALUES ('cantidad de receta en 0 rechazada', IF(fallo_esperado, 'OK', 'FALLO'));

  SET fallo_esperado = 0;
  BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION SET fallo_esperado = 1;
    DELETE FROM insumos WHERE nombre = 'Queso';
  END;
  INSERT INTO resultados_pruebas VALUES ('insumo en uso protegido', IF(fallo_esperado, 'OK', 'FALLO'));

  SET fallo_esperado = 0;
  BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION SET fallo_esperado = 1;
    INSERT INTO productos (nombre, precio) VALUES ('Raro', -5);
  END;
  INSERT INTO resultados_pruebas VALUES ('precio negativo rechazado', IF(fallo_esperado, 'OK', 'FALLO'));

  SELECT * FROM resultados_pruebas;
END$$
DELIMITER ;

CALL sp_pruebas_catalogos();
DROP PROCEDURE sp_pruebas_catalogos;

-- ============================================================
-- CONSULTA CLAVE: ¿cuántas porciones de cada producto se pueden preparar
-- con el stock actual de insumos? (el insumo más escaso manda)
-- ============================================================
SELECT p.nombre AS producto,
       CAST(MIN(FLOOR(i.stock / r.cantidad)) AS UNSIGNED) AS porciones_disponibles
FROM productos p
JOIN recetas r ON r.producto_id = p.id
JOIN insumos i ON i.id = r.insumo_id
WHERE p.activo = 1
GROUP BY p.id, p.nombre
ORDER BY p.nombre;

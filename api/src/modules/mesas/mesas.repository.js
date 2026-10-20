import { query } from '../../config/db.js';
import { buildWhere, updateById } from '../../utils/sql.js';

export const findById = async (id) => (await query('SELECT * FROM mesas WHERE id = ?', [id]))[0];
export const findByNumero = async (numero) => (await query('SELECT * FROM mesas WHERE numero = ?', [numero]))[0];

export const list = ({ activo, estado } = {}) => {
  const { sql, params } = buildWhere([activo !== undefined && ['activo = ?', activo ? 1 : 0], estado && ['estado = ?', estado]]);
  return query(`SELECT * FROM mesas ${sql} ORDER BY numero`, params);
};

export const create = async ({ numero, capacidad }) =>
  (await query('INSERT INTO mesas (numero, capacidad) VALUES (?, ?)', [numero, capacidad])).insertId;

export const cuentasPendientes = async (id) => (await query(
  "SELECT COUNT(*) AS n FROM pedidos WHERE mesa_id = ? AND estado <> 'cancelado' AND pagado_en IS NULL", [id]))[0].n;

export const update = (id, fields) => updateById('mesas', id, fields);

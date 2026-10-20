import * as service from './pedidos.service.js';

export const list = async (req, res) => res.json(await service.list(req.valid.query));
export const get = async (req, res) => res.json(await service.get(req.valid.params.id));
export const create = async (req, res) => res.status(201).json(await service.create(req.valid.body, req.user));
export const update = async (req, res) => res.json(await service.update(req.valid.params.id, req.valid.body, req.user));
export const cambiarEstado = async (req, res) => res.json(await service.cambiarEstado(req.valid.params.id, req.valid.body, req.user));
export const cuenta = async (req, res) => res.json(await service.cuenta(req.valid.params.id, req.valid.query));
export const pagar = async (req, res) => res.json(await service.pagar(req.valid.params.id, req.valid.body, req.user));

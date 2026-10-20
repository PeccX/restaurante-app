import * as service from './insumos.service.js';

export const list = async (req, res) => res.json(await service.list(req.valid.query));
export const get = async (req, res) => res.json(await service.get(req.valid.params.id));
export const create = async (req, res) => res.status(201).json(await service.create(req.valid.body, req.user));
export const update = async (req, res) => res.json(await service.update(req.valid.params.id, req.valid.body));
export const remove = async (req, res) => { await service.remove(req.valid.params.id); res.status(204).end(); };
export const ajustar = async (req, res) => res.json(await service.ajustar(req.valid.params.id, req.valid.body, req.user));
export const movimientos = async (req, res) => res.json(await service.movimientos(req.valid.params.id, req.valid.query));

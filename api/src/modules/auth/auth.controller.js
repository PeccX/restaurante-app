import * as service from './auth.service.js';

export const login = async (req, res) => res.json(await service.login(req.valid.body));
export const me = (req, res) => res.json(req.user);

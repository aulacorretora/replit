import { Router } from 'express';
import {
  getInstances,
  getInstance,
  createInstance,
  deleteInstance,
  connectInstanceHandler,
  resetInstanceHandler,
  getQRCode,
  disconnectInstanceHandler
} from '../controllers/instance';

const router = Router();

// GET /api/instances
router.get('/', getInstances);

// GET /api/instances/:id
router.get('/:id', getInstance);

// POST /api/instances
router.post('/', createInstance);

// DELETE /api/instances/:id
router.delete('/:id', deleteInstance);

// POST /api/instances/:id/connect
router.post('/:id/connect', connectInstanceHandler);

// POST /api/instances/:id/reset
router.post('/:id/reset', resetInstanceHandler);

// GET /api/instances/:id/qr
router.get('/:id/qr', getQRCode);

// GET /api/instances/:id/qrcode (alias mantido para compatibilidade)
router.get('/:id/qrcode', getQRCode);

// POST /api/instances/:id/disconnect
router.post('/:id/disconnect', disconnectInstanceHandler);

export default router;
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getTurnServers } from '../utils/ice.js';

const router = Router();

router.get('/', requireAuth, async (req, res, next) => {
  try {
    res.json({ iceServers: await getTurnServers() });
  } catch (err) {
    next(err);
  }
});

export default router;
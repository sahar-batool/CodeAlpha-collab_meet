import { Router } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { Room } from '../models/Room.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { roomCreateLimiter } from '../middleware/rateLimiters.js';

const router = Router();
router.use(requireAuth);

// 32 characters, with look-alikes (l, o, 0, 1) removed.
const ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789';

function part(length) {
  // 256 is divisible by 32, so this has no modulo bias.
  return Array.from(crypto.randomBytes(length), (b) => ALPHABET[b % 32]).join('');
}
const makeCode = () => `${part(3)}-${part(4)}-${part(3)}`;

const createSchema = z.object({ name: z.string().trim().max(60).optional() });

router.post('/', roomCreateLimiter, validate(createSchema), async (req, res, next) => {
  try {
    const name = req.body.name || `${req.user.name}'s meeting`;
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const room = await Room.create({ code: makeCode(), name, owner: req.user._id });
        return res.status(201).json({ room: { code: room.code, name: room.name } });
      } catch (err) {
        if (err.code !== 11000) throw err; // only retry on a duplicate code
      }
    }
    res.status(500).json({ message: 'Could not create a room. Please try again.' });
  } catch (err) {
    next(err);
  }
});

export default router;
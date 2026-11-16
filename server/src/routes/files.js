import { Router } from 'express';
import multer from 'multer';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { File } from '../models/File.js';
import { requireAuth } from '../middleware/auth.js';
import { fileUploadLimiter } from '../middleware/rateLimiters.js';
import { isUserInRoom } from '../sockets/rooms.js';

const router = Router();
router.use(requireAuth);

fs.mkdirSync(env.uploadDir, { recursive: true });

const CODE_RE = /^[a-z0-9]{3}-[a-z0-9]{4}-[a-z0-9]{3}$/;
const BLOCKED = new Set(['.exe', '.msi', '.bat', '.cmd', '.com', '.scr', '.ps1', '.vbs', '.jar', '.apk', '.dll']);

const upload = multer({
  storage: multer.diskStorage({
    destination: env.uploadDir,
    // Random name, no extension: nothing from the client reaches the file system path.
    filename: (req, file, cb) => cb(null, crypto.randomBytes(16).toString('hex')),
  }),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (BLOCKED.has(ext)) {
      return cb(Object.assign(new Error('This file type is not allowed.'), { status: 400, expose: true }));
    }
    cb(null, true);
  },
});

// Only people currently inside the meeting may upload or download.
function requireMember(req, res, next) {
  const code = String(req.params.code || '').toLowerCase();
  if (!CODE_RE.test(code) || !isUserInRoom(code, req.user.id)) {
    return res.status(403).json({ message: 'Join the meeting to share or download files.' });
  }
  req.params.code = code;
  next();
}

function cleanName(name) {
  const base = path.basename(String(name || '')).replace(/[\u0000-\u001f<>:"/\\|?*]/g, '_').trim();
  return (base || 'file').slice(0, 120);
}

router.post('/:code', fileUploadLimiter, requireMember, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file received.' });
    const doc = await File.create({
      room: req.params.code,
      uploader: req.user._id,
      uploaderName: req.user.name,
      originalName: cleanName(req.file.originalname),
      storedName: req.file.filename,
      size: req.file.size,
    });
    const payload = doc.toPublic();
    req.app.get('io').to(req.params.code).emit('file:shared', payload);
    res.status(201).json({ file: payload });
  } catch (err) {
    if (req.file) fs.unlink(req.file.path, () => {});
    next(err);
  }
});

router.get('/:code/:id', requireMember, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: 'File not found.' });
    }
    // The room is part of the lookup, so a file id from another room finds nothing.
    const file = await File.findOne({ _id: req.params.id, room: req.params.code });
    if (!file) return res.status(404).json({ message: 'File not found.' });

    // res.download always sends it as an attachment, so it can never run in the browser.
    res.download(path.join(env.uploadDir, file.storedName), file.originalName, (err) => {
      if (err && !res.headersSent) {
        res.status(404).json({ message: 'That file is no longer available.' });
      }
    });
  } catch (err) {
    next(err);
  }
});

export default router;
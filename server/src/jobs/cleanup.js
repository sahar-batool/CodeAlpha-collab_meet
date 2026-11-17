import fs from 'fs/promises';
import path from 'path';
import { env } from '../config/env.js';
import { File } from '../models/File.js';

const DAYS = Number(process.env.FILE_RETENTION_DAYS) || 7;
const MAX_AGE_MS = DAYS * 24 * 60 * 60 * 1000;
const EVERY_MS = 60 * 60 * 1000; // once an hour

export async function cleanOldFiles() {
  const cutoff = new Date(Date.now() - MAX_AGE_MS);
  const old = await File.find({ createdAt: { $lt: cutoff } }).limit(500);
  const done = [];

  for (const f of old) {
    try {
      // Delete the bytes first. If this fails we keep the record and try again next hour.
      await fs.unlink(path.join(env.uploadDir, f.storedName));
      done.push(f._id);
    } catch (err) {
      if (err.code === 'ENOENT') done.push(f._id); // already gone: just drop the record
      else console.error('Cleanup: could not delete', f.storedName, err.message);
    }
  }

  if (done.length) await File.deleteMany({ _id: { $in: done } });
  return done.length;
}

export function startCleanup() {
  const run = () =>
    cleanOldFiles()
      .then((n) => n && console.log(`Cleanup: removed ${n} expired file(s)`))
      .catch((err) => console.error('Cleanup failed:', err.message));
  run();
  setInterval(run, EVERY_MS).unref(); // unref: this timer never blocks shutdown
}
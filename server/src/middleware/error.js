import { env } from '../config/env.js';

export const notFound = (req, res) =>
  res.status(404).json({ message: 'Route not found' });

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Invalid JSON body' });
  }
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ message: 'Origin not allowed' });
  }
  if (err.name === 'MulterError') {
    const tooBig = err.code === 'LIMIT_FILE_SIZE';
    return res.status(tooBig ? 413 : 400).json({
      message: tooBig ? 'That file is too large (10 MB maximum).' : 'Invalid upload.',
    });
  }
  // Errors we raised on purpose with a message that is safe to show.
  if (err.expose && err.status) {
    return res.status(err.status).json({ message: err.message });
  }
  console.error(err);
  res.status(500).json({
    message: 'Something went wrong',
    ...(env.isProd ? {} : { detail: err.message }),
  });
};
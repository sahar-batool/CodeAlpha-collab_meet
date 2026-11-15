import rateLimit from 'express-rate-limit';

const base = { standardHeaders: true, legacyHeaders: false };

// General limit for every API route, per IP.
export const apiLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  limit: 300,
  message: { message: 'Too many requests. Please try again later.' },
});


export const authLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  message: { message: 'Too many attempts. Please wait 15 minutes and try again.' },
});



// Creating rooms writes to the database, so keep it modest per IP.
export const roomCreateLimiter = rateLimit({
  ...base,
  windowMs: 60 * 60 * 1000,
  limit: 30,
  message: { message: 'You have created too many rooms. Try again later.' },
});
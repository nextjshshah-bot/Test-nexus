import rateLimit, { type Options } from 'express-rate-limit';
import { env } from '../config/env';

const baseOptions: Partial<Options> = {
  windowMs: env.rateLimit.windowMs,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  // Never rate-limit the test suite or the platform health probe.
  skip: (req) => env.isTest || req.path.startsWith('/health'),
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many requests. Please slow down and try again shortly.',
      },
    });
  },
};

export const apiRateLimiter = rateLimit({ ...baseOptions, limit: env.rateLimit.max });

/** Stricter bucket for credential endpoints to blunt brute-force attempts. */
export const authRateLimiter = rateLimit({
  ...baseOptions,
  limit: env.rateLimit.authMax,
  skipSuccessfulRequests: true,
});

export default apiRateLimiter;

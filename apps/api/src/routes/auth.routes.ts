import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { validate } from '../middleware/validate';
import { authenticate, optionalAuthenticate } from '../middleware/authenticate';
import { authRateLimiter } from '../middleware/rate-limit';
import { asyncHandler } from '../utils/async-handler';
import {
  changePasswordSchema,
  loginSchema,
  passwordStrengthSchema,
  refreshSchema,
  registerSchema,
  updateProfileSchema,
} from '../schemas/auth.schema';

const router = Router();

router.post('/register', authRateLimiter, validate({ body: registerSchema }), asyncHandler(authController.register));
router.post('/login', authRateLimiter, validate({ body: loginSchema }), asyncHandler(authController.login));
router.post('/refresh', authRateLimiter, validate({ body: refreshSchema }), asyncHandler(authController.refresh));
router.post('/logout', optionalAuthenticate, asyncHandler(authController.logout));

router.get('/me', authenticate, asyncHandler(authController.me));
router.patch('/me', authenticate, validate({ body: updateProfileSchema }), asyncHandler(authController.updateProfile));
router.post(
  '/change-password',
  authenticate,
  authRateLimiter,
  validate({ body: changePasswordSchema }),
  asyncHandler(authController.changePassword),
);
router.get('/sessions', authenticate, asyncHandler(authController.sessions));
router.delete('/sessions', authenticate, asyncHandler(authController.revokeAllSessions));
router.post(
  '/password-strength',
  validate({ body: passwordStrengthSchema }),
  asyncHandler(authController.passwordStrength),
);

export default router;

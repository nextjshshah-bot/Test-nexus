import { z } from 'zod';

const emailSchema = z
  .string({ required_error: 'Email is required' })
  .trim()
  .toLowerCase()
  .min(5, 'Email is too short')
  .max(255, 'Email must be 255 characters or fewer')
  .email('Enter a valid email address');

const passwordSchema = z
  .string({ required_error: 'Password is required' })
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be 128 characters or fewer')
  .regex(/[A-Za-z]/, 'Password must contain at least one letter')
  .regex(/\d/, 'Password must contain at least one number');

export const registerSchema = z.object({
  name: z
    .string({ required_error: 'Name is required' })
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(80, 'Name must be 80 characters or fewer'),
  email: emailSchema,
  password: passwordSchema,
  company: z.string().trim().max(120, 'Company must be 120 characters or fewer').optional(),
  jobTitle: z.string().trim().max(120, 'Job title must be 120 characters or fewer').optional(),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string({ required_error: 'Password is required' }).min(1, 'Password is required'),
  rememberMe: z.boolean().optional().default(true),
});

export const refreshSchema = z
  .object({
    refreshToken: z.string().min(10, 'Refresh token is required').optional(),
  })
  .optional()
  .default({});

export const updateProfileSchema = z
  .object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80).optional(),
    company: z.string().trim().max(120).nullable().optional(),
    jobTitle: z.string().trim().max(120).nullable().optional(),
    avatarUrl: z.string().trim().url('Avatar URL must be a valid URL').nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update',
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string({ required_error: 'Current password is required' }).min(1, 'Current password is required'),
    newPassword: passwordSchema,
  })
  .refine((value) => value.currentPassword !== value.newPassword, {
    message: 'New password must differ from the current password',
    path: ['newPassword'],
  });

export const passwordStrengthSchema = z.object({
  password: z.string().min(1, 'Password is required'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

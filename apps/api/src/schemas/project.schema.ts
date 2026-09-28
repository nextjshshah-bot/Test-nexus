import { z } from 'zod';
import { PRIORITIES, PROJECT_STATUSES } from '../config/constants';

export const projectStatusSchema = z.enum(PROJECT_STATUSES);
export const prioritySchema = z.enum(PRIORITIES);

const dateSchema = z
  .union([z.string(), z.date(), z.null()])
  .optional()
  .transform((value, ctx) => {
    if (value === undefined) return undefined;
    if (value === null) return null;
    const parsed = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid date value' });
      return z.NEVER;
    }
    return parsed;
  });

const tagSchema = z.string().trim().min(1).max(32);

export const createProjectSchema = z
  .object({
    name: z
      .string({ required_error: 'Project name is required' })
      .trim()
      .min(2, 'Project name must be at least 2 characters')
      .max(120, 'Project name must be 120 characters or fewer'),
    description: z.string().trim().max(2000, 'Description must be 2000 characters or fewer').optional(),
    status: projectStatusSchema.optional().default('PLANNING'),
    priority: prioritySchema.optional().default('MEDIUM'),
    budget: z.coerce.number().min(0, 'Budget cannot be negative').max(1_000_000_000, 'Budget is too large').optional().default(0),
    progress: z.coerce.number().int().min(0, 'Progress cannot be below 0').max(100, 'Progress cannot exceed 100').optional().default(0),
    tags: z.array(tagSchema).max(12, 'Maximum of 12 tags allowed').optional().default([]),
    startDate: dateSchema,
    dueDate: dateSchema,
  })
  .refine(
    (value) => {
      if (!value.startDate || !value.dueDate) return true;
      return new Date(value.startDate).getTime() <= new Date(value.dueDate).getTime();
    },
    { message: 'Due date must be on or after the start date', path: ['dueDate'] },
  );

export const updateProjectSchema = z
  .object({
    name: z.string().trim().min(2, 'Project name must be at least 2 characters').max(120).optional(),
    description: z.string().trim().max(2000).nullable().optional(),
    status: projectStatusSchema.optional(),
    priority: prioritySchema.optional(),
    budget: z.coerce.number().min(0).max(1_000_000_000).optional(),
    progress: z.coerce.number().int().min(0).max(100).optional(),
    tags: z.array(tagSchema).max(12).optional(),
    startDate: dateSchema,
    dueDate: dateSchema,
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'Provide at least one field to update' })
  .refine(
    (value) => {
      if (!value.startDate || !value.dueDate) return true;
      return new Date(value.startDate).getTime() <= new Date(value.dueDate).getTime();
    },
    { message: 'Due date must be on or after the start date', path: ['dueDate'] },
  );

export const projectQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().max(100).optional().default(10),
  search: z.string().trim().max(120).optional(),
  status: z.union([projectStatusSchema, z.literal('ALL')]).optional(),
  priority: z.union([prioritySchema, z.literal('ALL')]).optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'name', 'budget', 'progress', 'dueDate']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export const projectIdParamSchema = z.object({
  id: z.string().trim().min(1, 'Project id is required').max(64),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type ProjectQueryInput = z.infer<typeof projectQuerySchema>;

'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button, Field, Input, Select, Textarea } from '../ui/primitives';
import { Modal } from '../ui/modal';
import { ApiError } from '@/lib/api-client';
import { PRIORITY_ORDER, STATUS_ORDER } from '@/lib/status';
import { toInputDate, titleCase } from '@/lib/format';
import type { Priority, Project, ProjectFormValues, ProjectStatus } from '@/lib/types';

const EMPTY_FORM: ProjectFormValues = {
  name: '',
  description: '',
  status: 'PLANNING',
  priority: 'MEDIUM',
  budget: 0,
  progress: 0,
  tags: '',
  startDate: toInputDate(new Date().toISOString()),
  dueDate: '',
};

function toFormValues(project: Project): ProjectFormValues {
  return {
    name: project.name,
    description: project.description ?? '',
    status: project.status,
    priority: project.priority,
    budget: project.budget,
    progress: project.progress,
    tags: project.tags.join(', '),
    startDate: toInputDate(project.startDate),
    dueDate: toInputDate(project.dueDate),
  };
}

/**
 * Shared create/edit dialog. Client-side validation mirrors the Zod schemas in
 * the API, and server validation errors are mapped back onto the fields.
 */
export function ProjectFormModal({
  open,
  onClose,
  onSubmit,
  project,
  loading = false,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
  project: Project | null;
  loading?: boolean;
}): JSX.Element {
  const [values, setValues] = useState<ProjectFormValues>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const isEdit = project !== null;

  useEffect(() => {
    if (!open) return;
    setValues(project ? toFormValues(project) : EMPTY_FORM);
    setErrors({});
  }, [open, project]);

  const update = <K extends keyof ProjectFormValues>(key: K, value: ProjectFormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      if (!current[key as string]) return current;
      const next = { ...current };
      delete next[key as string];
      return next;
    });
  };

  const tagList = useMemo(
    () =>
      values.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0)
        .slice(0, 12),
    [values.tags],
  );

  const validate = (): boolean => {
    const next: Record<string, string> = {};

    if (values.name.trim().length < 2) next.name = 'Name must be at least 2 characters.';
    if (values.name.trim().length > 120) next.name = 'Name must be 120 characters or fewer.';
    if (values.description.length > 2000) next.description = 'Description must be 2000 characters or fewer.';
    if (values.budget < 0) next.budget = 'Budget cannot be negative.';
    if (values.progress < 0 || values.progress > 100) next.progress = 'Progress must be between 0 and 100.';
    if (values.startDate && values.dueDate && new Date(values.startDate) > new Date(values.dueDate)) {
      next.dueDate = 'Due date must be on or after the start date.';
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      await onSubmit({
        name: values.name.trim(),
        description: values.description.trim() === '' ? null : values.description.trim(),
        status: values.status,
        priority: values.priority,
        budget: Number(values.budget),
        progress: Number(values.progress),
        tags: tagList,
        startDate: values.startDate ? new Date(values.startDate).toISOString() : null,
        dueDate: values.dueDate ? new Date(values.dueDate).toISOString() : null,
      });
      onClose();
    } catch (error) {
      if (error instanceof ApiError) {
        const fieldErrors = error.fieldErrors();
        setErrors(Object.keys(fieldErrors).length > 0 ? fieldErrors : { name: error.message });
      } else {
        setErrors({ name: 'Something went wrong. Please retry.' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? `Edit ${project?.name ?? 'project'}` : 'Create a new project'}
      description={
        isEdit
          ? 'Update delivery details, budget, and status. Changes are written straight to PostgreSQL.'
          : 'Projects track delivery progress, budget, and the analytics attached to this workspace.'
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button type="submit" form="project-form" loading={submitting || loading}>
            {isEdit ? 'Save changes' : 'Create project'}
          </Button>
        </>
      }
    >
      <form id="project-form" onSubmit={handleSubmit} className="space-y-4">
        <Field label="Project name" required error={errors.name}>
          <Input
            value={values.name}
            onChange={(event) => update('name', event.target.value)}
            placeholder="e.g. Atlas Checkout Revamp"
            autoFocus
            maxLength={120}
          />
        </Field>

        <Field label="Description" error={errors.description} hint="Optional. Max 2,000 characters.">
          <Textarea
            value={values.description}
            onChange={(event) => update('description', event.target.value)}
            placeholder="What outcomes does this project deliver?"
            maxLength={2000}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Status">
            <Select value={values.status} onChange={(event) => update('status', event.target.value as ProjectStatus)}>
              {STATUS_ORDER.map((status) => (
                <option key={status} value={status}>
                  {titleCase(status)}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Priority">
            <Select value={values.priority} onChange={(event) => update('priority', event.target.value as Priority)}>
              {PRIORITY_ORDER.map((priority) => (
                <option key={priority} value={priority}>
                  {titleCase(priority)}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Budget (USD)" error={errors.budget}>
            <Input
              type="number"
              min={0}
              step={100}
              value={values.budget}
              onChange={(event) => update('budget', Number(event.target.value))}
            />
          </Field>

          <Field label={`Progress — ${values.progress}%`} error={errors.progress}>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={values.progress}
              onChange={(event) => update('progress', Number(event.target.value))}
              className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-nexus-400"
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Start date">
            <Input type="date" value={values.startDate} onChange={(event) => update('startDate', event.target.value)} />
          </Field>

          <Field label="Due date" error={errors.dueDate}>
            <Input type="date" value={values.dueDate} onChange={(event) => update('dueDate', event.target.value)} />
          </Field>
        </div>

        <Field label="Tags" hint="Comma separated, up to 12.">
          <Input
            value={values.tags}
            onChange={(event) => update('tags', event.target.value)}
            placeholder="payments, q4, experiment"
          />
        </Field>

        {tagList.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {tagList.map((tag) => (
              <span key={tag} className="rounded-md bg-nexus-500/10 px-2 py-0.5 text-[10px] font-medium text-nexus-200">
                {tag}
              </span>
            ))}
          </div>
        ) : null}
      </form>
    </Modal>
  );
}

export default ProjectFormModal;

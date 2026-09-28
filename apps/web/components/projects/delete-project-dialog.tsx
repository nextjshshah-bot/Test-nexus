'use client';

import { useState } from 'react';
import { Button } from '../ui/primitives';
import { Modal } from '../ui/modal';
import type { Project } from '@/lib/types';
import { formatCurrency } from '@/lib/format';

/** Type-the-name confirmation so destructive deletes are deliberate. */
export function DeleteProjectDialog({
  project,
  open,
  onClose,
  onConfirm,
}: {
  project: Project | null;
  open: boolean;
  onClose: () => void;
  onConfirm: (project: Project) => Promise<void>;
}): JSX.Element {
  const [confirmation, setConfirmation] = useState('');
  const [deleting, setDeleting] = useState(false);

  if (!project) return <></>;

  const matches = confirmation.trim() === project.name;

  const handleDelete = async () => {
    if (!matches) return;
    setDeleting(true);
    try {
      await onConfirm(project);
      setConfirmation('');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        setConfirmation('');
        onClose();
      }}
      title="Delete project"
      description="This permanently removes the project and all of its daily metrics."
      size="sm"
      footer={
        <>
          <Button
            variant="ghost"
            type="button"
            onClick={() => {
              setConfirmation('');
              onClose();
            }}
          >
            Keep project
          </Button>
          <Button variant="danger" type="button" disabled={!matches} loading={deleting} onClick={() => void handleDelete()}>
            Delete permanently
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-rose-500/25 bg-rose-500/[0.06] p-3.5">
          <p className="text-xs font-semibold text-rose-200">You are about to delete “{project.name}”.</p>
          <dl className="mt-2.5 grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <dt className="text-rose-200/60">Budget</dt>
              <dd className="font-mono text-slate-200">{formatCurrency(project.budget, { compact: true })}</dd>
            </div>
            <div>
              <dt className="text-rose-200/60">30d revenue</dt>
              <dd className="font-mono text-slate-200">
                {formatCurrency(project.metrics?.revenue30d ?? 0, { compact: true })}
              </dd>
            </div>
          </dl>
        </div>

        <label className="block">
          <span className="mb-1.5 block text-xs text-slate-400">
            Type <span className="font-mono font-semibold text-slate-200">{project.name}</span> to confirm
          </span>
          <input
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            className="w-full rounded-xl border border-white/10 bg-ink-900/70 px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:border-rose-500/50 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
            placeholder={project.name}
          />
        </label>
      </div>
    </Modal>
  );
}

export default DeleteProjectDialog;

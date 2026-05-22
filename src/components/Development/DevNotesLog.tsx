// Thin wrapper around CrmNotesLog — wires the Dev-Project-specific
// note shape.

import type { DevProjectNote } from '../../types';
import { CrmNotesLog } from '../CRM/CrmNotesLog';

interface DevNotesLogProps {
  devProjectId: string;
  notes: DevProjectNote[];
  onSave: (n: DevProjectNote) => void;
  onDelete: (id: string) => void;
}

export function DevNotesLog({
  devProjectId,
  notes,
  onSave,
  onDelete,
}: DevNotesLogProps) {
  return (
    <CrmNotesLog
      notes={notes}
      onDelete={onDelete}
      onCreate={(draft) => {
        const now = new Date().toISOString();
        onSave({
          id: crypto.randomUUID(),
          devProjectId,
          noteType: draft.noteType,
          eventDate: draft.eventDate,
          content: draft.content,
          author: draft.author,
          link: null,
          createdAt: now,
          updatedAt: now,
        });
      }}
    />
  );
}

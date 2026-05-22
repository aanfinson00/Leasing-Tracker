// Thin wrapper around the parent-agnostic CrmContactsPanel — wires
// the Dev-Project-specific link shape.

import type { Contact, DevProjectContact } from '../../types';
import { CrmContactsPanel } from '../CRM/CrmContactsPanel';

interface DevContactsPanelProps {
  allContacts: Contact[];
  links: DevProjectContact[];
  devProjectId: string;
  onSaveContact: (c: Contact) => void;
  onLink: (link: DevProjectContact) => void;
  onUnlink: (linkId: string) => void;
}

export function DevContactsPanel({
  allContacts,
  links,
  devProjectId,
  onSaveContact,
  onLink,
  onUnlink,
}: DevContactsPanelProps) {
  return (
    <CrmContactsPanel
      allContacts={allContacts}
      links={links}
      onSaveContact={onSaveContact}
      onUnlink={onUnlink}
      onLink={(contactId, isPrimary) => {
        const now = new Date().toISOString();
        onLink({
          id: crypto.randomUUID(),
          devProjectId,
          contactId,
          roleOverride: null,
          isPrimary,
          linkNotes: null,
          createdAt: now,
          updatedAt: now,
        });
      }}
    />
  );
}

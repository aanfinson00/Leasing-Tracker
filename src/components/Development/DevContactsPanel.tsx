import { useMemo, useState } from 'react';
import { Plus, X, Phone, Mail, Star, Users } from 'lucide-react';
import type {
  Contact,
  ContactType,
  DevProjectContact,
} from '../../types';
import { ContactTypeEnum, contactDisplayName } from '../../types';

interface DevContactsPanelProps {
  /** All contacts in the system — used for the picker. */
  allContacts: Contact[];
  /** Links for the current project only. */
  links: DevProjectContact[];
  devProjectId: string;
  onSaveContact: (c: Contact) => void;
  onLink: (link: DevProjectContact) => void;
  onUnlink: (linkId: string) => void;
}

function primaryChannel(channels: Contact['phones']): string | null {
  if (channels.length === 0) return null;
  const primary = channels.find((c) => c.isPrimary) ?? channels[0];
  return primary?.value ?? null;
}

function newContactTemplate(type: ContactType): Contact {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    contactType: type,
    firstName: null,
    lastName: null,
    companyName: null,
    title: null,
    phones: [],
    emails: [],
    notes: null,
    createdAt: now,
    updatedAt: now,
  };
}

export function DevContactsPanel({
  allContacts,
  links,
  devProjectId,
  onSaveContact,
  onLink,
  onUnlink,
}: DevContactsPanelProps) {
  const [adding, setAdding] = useState(false);
  const [creating, setCreating] = useState<Contact | null>(null);

  // Quickly resolve a contactId to its full Contact row.
  const contactsById = useMemo(() => {
    const m = new Map<string, Contact>();
    allContacts.forEach((c) => m.set(c.id, c));
    return m;
  }, [allContacts]);

  // Contacts not yet linked to this project — candidates for the picker.
  const linkedIds = useMemo(() => new Set(links.map((l) => l.contactId)), [links]);
  const candidates = useMemo(
    () => allContacts.filter((c) => !linkedIds.has(c.id)),
    [allContacts, linkedIds]
  );

  const handlePickExisting = (contactId: string) => {
    const contact = contactsById.get(contactId);
    if (!contact) return;
    const now = new Date().toISOString();
    onLink({
      id: crypto.randomUUID(),
      devProjectId,
      contactId,
      roleOverride: null,
      isPrimary: links.length === 0, // first contact added becomes primary
      linkNotes: null,
      createdAt: now,
      updatedAt: now,
    });
    setAdding(false);
  };

  const handleStartCreate = (type: ContactType) => {
    setCreating(newContactTemplate(type));
    setAdding(false);
  };

  const handleSaveNew = (contact: Contact) => {
    onSaveContact(contact);
    const now = new Date().toISOString();
    onLink({
      id: crypto.randomUUID(),
      devProjectId,
      contactId: contact.id,
      roleOverride: null,
      isPrimary: links.length === 0,
      linkNotes: null,
      createdAt: now,
      updatedAt: now,
    });
    setCreating(null);
  };

  return (
    <div className="grid grid-cols-1 gap-2">
      {links.length === 0 && !adding && !creating && (
        <p className="text-xs text-fg-subtle italic">
          No contacts linked yet. Click "Add contact" to pick from your library or create a new one.
        </p>
      )}

      {links.map((link) => {
        const contact = contactsById.get(link.contactId);
        if (!contact) {
          // Soft link is dangling — render a stub so the user can still unlink.
          return (
            <div
              key={link.id}
              className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-bg border border-dashed border-border"
            >
              <span className="text-xs text-fg-subtle">
                Unknown contact (id {link.contactId.slice(0, 8)}) — possibly deleted
              </span>
              <button
                type="button"
                onClick={() => onUnlink(link.id)}
                className="p-1 rounded text-fg-subtle hover:text-danger transition-colors"
                aria-label="Unlink"
              >
                <X size={13} strokeWidth={1.75} />
              </button>
            </div>
          );
        }
        const role = link.roleOverride ?? contact.contactType;
        const phone = primaryChannel(contact.phones);
        const email = primaryChannel(contact.emails);
        return (
          <div
            key={link.id}
            className="flex items-start justify-between gap-3 px-3 py-2.5 rounded-lg bg-bg shadow-soft"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-fg truncate">
                  {contactDisplayName(contact)}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded-full bg-accent-tint text-accent border border-accent/30">
                  {role}
                </span>
                {link.isPrimary && (
                  <Star
                    size={11}
                    strokeWidth={1.75}
                    className="text-warning fill-warning"
                  />
                )}
              </div>
              {contact.title && (
                <p className="text-xs text-fg-muted mt-0.5">{contact.title}</p>
              )}
              <div className="flex items-center gap-3 text-xs text-fg-muted mt-1.5 flex-wrap">
                {phone && (
                  <a
                    href={`tel:${phone}`}
                    className="inline-flex items-center gap-1 hover:text-accent"
                  >
                    <Phone size={11} strokeWidth={1.75} />
                    <span className="tabular-nums">{phone}</span>
                  </a>
                )}
                {email && (
                  <a
                    href={`mailto:${email}`}
                    className="inline-flex items-center gap-1 hover:text-accent truncate"
                  >
                    <Mail size={11} strokeWidth={1.75} />
                    <span className="truncate">{email}</span>
                  </a>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => onUnlink(link.id)}
              className="p-1 rounded text-fg-subtle hover:text-danger transition-colors shrink-0"
              aria-label="Unlink"
              title="Unlink from this project"
            >
              <X size={13} strokeWidth={1.75} />
            </button>
          </div>
        );
      })}

      {!adding && !creating && (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="mt-1 inline-flex items-center gap-1.5 self-start px-3 py-1.5 text-xs font-medium text-fg-muted hover:text-fg hover:bg-bg-hover rounded-lg transition-colors"
        >
          <Plus size={13} strokeWidth={2} />
          Add contact
        </button>
      )}

      {adding && (
        <div className="rounded-lg bg-bg shadow-soft p-3">
          <div className="flex items-center justify-between gap-2 mb-2">
            <p className="text-xs font-medium text-fg-muted">
              Add contact — pick existing or create new
            </p>
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="text-fg-subtle hover:text-fg p-1 rounded"
              aria-label="Cancel"
            >
              <X size={13} strokeWidth={1.75} />
            </button>
          </div>
          {candidates.length > 0 && (
            <div className="mb-2">
              <select
                onChange={(e) => {
                  if (e.target.value) handlePickExisting(e.target.value);
                }}
                defaultValue=""
                className="w-full px-2.5 py-1.5 text-sm rounded-lg bg-bg-elevated border border-border text-fg"
              >
                <option value="">Pick from {candidates.length} existing contact{candidates.length === 1 ? '' : 's'}…</option>
                {candidates.map((c) => (
                  <option key={c.id} value={c.id}>
                    {contactDisplayName(c)} — {c.contactType}
                  </option>
                ))}
              </select>
            </div>
          )}
          <p className="text-[11px] text-fg-subtle mb-1.5">…or create new:</p>
          <div className="flex items-center gap-1 flex-wrap">
            {ContactTypeEnum.options.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => handleStartCreate(t)}
                className="px-2 py-1 text-[11px] font-medium rounded-md bg-bg-elevated border border-border text-fg-muted hover:text-fg hover:bg-bg-hover transition-colors"
              >
                + {t}
              </button>
            ))}
          </div>
        </div>
      )}

      {creating && (
        <InlineContactForm
          contact={creating}
          onSave={handleSaveNew}
          onCancel={() => setCreating(null)}
        />
      )}
    </div>
  );
}

interface InlineContactFormProps {
  contact: Contact;
  onSave: (c: Contact) => void;
  onCancel: () => void;
}

const fieldClass =
  'w-full px-2.5 py-1.5 text-sm rounded-lg bg-bg-elevated border border-border text-fg placeholder:text-fg-subtle focus:outline-none focus:ring-2 focus:ring-accent transition-colors';

function InlineContactForm({ contact, onSave, onCancel }: InlineContactFormProps) {
  const [firstName, setFirstName] = useState(contact.firstName ?? '');
  const [lastName, setLastName] = useState(contact.lastName ?? '');
  const [companyName, setCompanyName] = useState(contact.companyName ?? '');
  const [title, setTitle] = useState(contact.title ?? '');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  const handleSubmit = () => {
    const trimmed = {
      firstName: firstName.trim() || null,
      lastName: lastName.trim() || null,
      companyName: companyName.trim() || null,
      title: title.trim() || null,
    };
    if (!trimmed.firstName && !trimmed.lastName && !trimmed.companyName) {
      // Need at least one identifier.
      return;
    }
    onSave({
      ...contact,
      ...trimmed,
      phones:
        phone.trim() === ''
          ? []
          : [{ label: 'mobile', value: phone.trim(), isPrimary: true }],
      emails:
        email.trim() === ''
          ? []
          : [{ label: 'work', value: email.trim(), isPrimary: true }],
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <div className="rounded-lg bg-bg shadow-soft p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-fg-muted">
          New {contact.contactType}
        </p>
        <button
          type="button"
          onClick={onCancel}
          className="text-fg-subtle hover:text-fg p-1 rounded"
          aria-label="Cancel"
        >
          <X size={13} strokeWidth={1.75} />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          placeholder="First name"
          className={fieldClass}
        />
        <input
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          placeholder="Last name"
          className={fieldClass}
        />
        <input
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          placeholder="Company"
          className={fieldClass}
        />
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title (optional)"
          className={fieldClass}
        />
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Phone"
          type="tel"
          className={`${fieldClass} tabular-nums`}
        />
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          type="email"
          className={fieldClass}
        />
      </div>
      <div className="flex items-center justify-end gap-2 mt-2.5">
        <button
          type="button"
          onClick={onCancel}
          className="px-2.5 py-1 text-xs font-medium text-fg-muted hover:text-fg rounded transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold text-accent-fg bg-accent rounded-lg hover:bg-accent-hover transition-colors shadow-soft"
        >
          <Users size={11} strokeWidth={2} />
          Save & link
        </button>
      </div>
    </div>
  );
}

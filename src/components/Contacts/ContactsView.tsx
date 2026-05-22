import { useMemo, useState } from 'react';
import {
  Plus,
  Users,
  Search,
  Phone,
  Mail,
  Star,
  ExternalLink,
} from 'lucide-react';
import type {
  Contact,
  ContactType,
  DevelopmentProject,
  DevProjectContact,
} from '../../types';
import { ContactTypeEnum, contactDisplayName } from '../../types';
import { ContactDrawer } from './ContactDrawer';

interface ContactsViewProps {
  contacts: Contact[];
  devProjectContactLinks: DevProjectContact[];
  devProjects: DevelopmentProject[];
  onSave: (c: Contact) => void;
  onDelete: (id: string) => void;
}

function newContactTemplate(): Contact {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    contactType: 'Broker',
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

function primaryChannel(channels: Contact['phones']): Contact['phones'][number] | null {
  if (channels.length === 0) return null;
  return channels.find((c) => c.isPrimary) ?? channels[0];
}

const TYPE_TONES: Record<ContactType, string> = {
  Owner: 'bg-accent-tint text-accent border-accent/30',
  Broker: 'bg-accent-tint text-accent border-accent/30',
  Attorney: 'bg-fg-subtle/15 text-fg-muted border-fg-subtle/25',
  'Title Agent': 'bg-fg-subtle/15 text-fg-muted border-fg-subtle/25',
  Consultant: 'bg-warning/10 text-warning border-warning/30',
  GC: 'bg-warning/10 text-warning border-warning/30',
  Architect: 'bg-success/10 text-success border-success/30',
  Other: 'bg-bg border-border text-fg-muted',
};

export function ContactsView({
  contacts,
  devProjectContactLinks,
  devProjects,
  onSave,
  onDelete,
}: ContactsViewProps) {
  const [editing, setEditing] = useState<Contact | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<ContactType | 'all'>('all');

  // How many projects each contact is linked to — surfaced in the list.
  const linkCountByContactId = useMemo(() => {
    const m = new Map<string, number>();
    devProjectContactLinks.forEach((l) => {
      m.set(l.contactId, (m.get(l.contactId) ?? 0) + 1);
    });
    return m;
  }, [devProjectContactLinks]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = contacts;
    if (q) {
      list = list.filter((c) =>
        [c.firstName, c.lastName, c.companyName, c.title, c.notes]
          .filter(Boolean)
          .some((s) => s!.toLowerCase().includes(q))
      );
    }
    if (typeFilter !== 'all') {
      list = list.filter((c) => c.contactType === typeFilter);
    }
    return [...list].sort((a, b) => {
      const aLast = (a.lastName ?? a.companyName ?? '').toLowerCase();
      const bLast = (b.lastName ?? b.companyName ?? '').toLowerCase();
      return aLast.localeCompare(bLast);
    });
  }, [contacts, search, typeFilter]);

  return (
    <div className="flex flex-col gap-5 max-w-[1400px] mx-auto w-full">
      <header className="rounded-2xl bg-bg-elevated shadow-soft p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-accent-tint text-accent">
              <Users size={18} strokeWidth={1.75} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-fg tracking-tight">
                Contacts
              </h2>
              <p className="text-xs text-fg-muted mt-0.5">
                {contacts.length} {contacts.length === 1 ? 'contact' : 'contacts'} —
                shared across Dev Pipeline, Tax Appeals, and (soon) Acq + Dispo.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setEditing(newContactTemplate())}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-accent-fg bg-accent rounded-xl hover:bg-accent-hover transition-colors shadow-soft"
          >
            <Plus size={15} strokeWidth={2} />
            New contact
          </button>
        </div>

        <div className="mt-5 flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[240px]">
            <Search
              size={14}
              strokeWidth={1.75}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, company, title, notes…"
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-bg border border-border text-fg placeholder:text-fg-subtle focus:outline-none focus:ring-2 focus:ring-accent transition-colors"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as ContactType | 'all')}
            className="px-3 py-2 text-sm rounded-lg bg-bg border border-border text-fg-muted hover:text-fg transition-colors"
          >
            <option value="all">All types</option>
            {ContactTypeEnum.options.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </header>

      {filtered.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-border rounded-2xl bg-bg-elevated">
          <p className="text-sm text-fg-muted max-w-md mx-auto">
            {contacts.length === 0 ? (
              <>
                No contacts yet. Click <span className="font-medium text-fg">New contact</span>{' '}
                to start your library — or add one from any Dev Pipeline project drawer.
              </>
            ) : (
              <>No contacts match the current filter.</>
            )}
          </p>
        </div>
      ) : (
        <div className="bg-bg-elevated rounded-2xl shadow-soft overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="py-2.5 px-5 text-left text-xs font-medium uppercase tracking-wider text-fg-subtle">
                  Name
                </th>
                <th className="py-2.5 px-3 text-left text-xs font-medium uppercase tracking-wider text-fg-subtle">
                  Type
                </th>
                <th className="py-2.5 px-3 text-left text-xs font-medium uppercase tracking-wider text-fg-subtle">
                  Company / Title
                </th>
                <th className="py-2.5 px-3 text-left text-xs font-medium uppercase tracking-wider text-fg-subtle">
                  Primary contact
                </th>
                <th className="py-2.5 px-3 text-right text-xs font-medium uppercase tracking-wider text-fg-subtle">
                  Linked
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const phone = primaryChannel(c.phones);
                const email = primaryChannel(c.emails);
                const linkCount = linkCountByContactId.get(c.id) ?? 0;
                return (
                  <tr
                    key={c.id}
                    onClick={() => setEditing(c)}
                    className="border-b border-border/60 hover:bg-bg-hover/60 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-5">
                      <span className="font-medium text-fg">
                        {contactDisplayName(c)}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-full border ${TYPE_TONES[c.contactType] ?? TYPE_TONES.Other}`}
                      >
                        {c.contactType}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-fg-muted">
                      {c.companyName ?? '—'}
                      {c.title && (
                        <span className="text-fg-subtle"> · {c.title}</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-fg-muted">
                      <div className="flex flex-col gap-0.5">
                        {phone && (
                          <a
                            href={`tel:${phone.value}`}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 hover:text-accent"
                          >
                            <Phone size={11} strokeWidth={1.75} />
                            <span className="tabular-nums">{phone.value}</span>
                            {phone.isPrimary && (
                              <Star
                                size={9}
                                strokeWidth={1.75}
                                className="text-warning fill-warning"
                              />
                            )}
                          </a>
                        )}
                        {email && (
                          <a
                            href={`mailto:${email.value}`}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 hover:text-accent truncate"
                          >
                            <Mail size={11} strokeWidth={1.75} />
                            <span className="truncate">{email.value}</span>
                          </a>
                        )}
                        {!phone && !email && (
                          <span className="text-fg-subtle text-xs">—</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right">
                      {linkCount > 0 ? (
                        <span className="inline-flex items-center gap-1 text-xs text-fg-muted">
                          <ExternalLink size={11} strokeWidth={1.75} />
                          {linkCount} {linkCount === 1 ? 'project' : 'projects'}
                        </span>
                      ) : (
                        <span className="text-fg-subtle text-xs">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <ContactDrawer
          contact={editing}
          devProjectContactLinks={devProjectContactLinks}
          devProjects={devProjects}
          onClose={() => setEditing(null)}
          onSave={onSave}
          onDelete={onDelete}
        />
      )}
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  X,
  UserSquare,
  Phone,
  Mail,
  NotebookPen,
  Trash2,
  Plus,
  Building,
  Link2,
  Star,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type {
  Contact,
  ContactChannel,
  ContactChannelLabel,
  ContactType,
  DevelopmentProject,
  DevProjectContact,
} from '../../types';
import {
  ContactChannelLabelEnum,
  ContactTypeEnum,
  contactDisplayName,
} from '../../types';

interface ContactDrawerProps {
  contact: Contact | null;
  /** All dev-project ↔ contact links — used to show "Linked to" list. */
  devProjectContactLinks: DevProjectContact[];
  /** Dev projects — for resolving link IDs to display names. */
  devProjects: DevelopmentProject[];
  onClose: () => void;
  onSave: (c: Contact) => void;
  onDelete: (id: string) => void;
}

type FormValues = {
  contactType: ContactType;
  firstName: string;
  lastName: string;
  companyName: string;
  title: string;
  notes: string;
};

const inputClass =
  'w-full px-3.5 py-2.5 bg-bg rounded-xl text-sm text-fg placeholder:text-fg-subtle focus:outline-none focus:ring-2 focus:ring-accent transition-all shadow-soft';
const labelClass = 'block text-xs font-medium text-fg-muted mb-1.5';

interface SectionProps {
  icon: LucideIcon;
  title: string;
  children: React.ReactNode;
}

function Section({ icon: Icon, title, children }: SectionProps) {
  return (
    <section className="pt-7 mt-7 border-t border-border first:border-t-0 first:pt-0 first:mt-0">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-accent-tint text-accent">
          <Icon size={14} strokeWidth={2} />
        </div>
        <h3 className="text-base font-semibold text-fg tracking-tight">{title}</h3>
      </div>
      {children}
    </section>
  );
}

export function ContactDrawer({
  contact,
  devProjectContactLinks,
  devProjects,
  onClose,
  onSave,
  onDelete,
}: ContactDrawerProps) {
  const { register, handleSubmit, reset, watch } = useForm<FormValues>();
  const [phones, setPhones] = useState<ContactChannel[]>([]);
  const [emails, setEmails] = useState<ContactChannel[]>([]);

  useEffect(() => {
    if (contact) {
      reset({
        contactType: contact.contactType,
        firstName: contact.firstName ?? '',
        lastName: contact.lastName ?? '',
        companyName: contact.companyName ?? '',
        title: contact.title ?? '',
        notes: contact.notes ?? '',
      });
      setPhones(contact.phones);
      setEmails(contact.emails);
    }
  }, [contact, reset]);

  // Resolve the "Linked to" list for this specific contact.
  const projectsById = useMemo(() => {
    const m = new Map<string, DevelopmentProject>();
    devProjects.forEach((p) => m.set(p.id, p));
    return m;
  }, [devProjects]);

  const linkedProjects = useMemo(() => {
    if (!contact) return [];
    return devProjectContactLinks
      .filter((l) => l.contactId === contact.id)
      .map((l) => ({ link: l, project: projectsById.get(l.devProjectId) }))
      .filter((x): x is { link: DevProjectContact; project: DevelopmentProject } =>
        x.project != null
      );
  }, [contact, devProjectContactLinks, projectsById]);

  if (!contact) return null;

  const onSubmit = (values: FormValues) => {
    const cleanedPhones = phones
      .map((p) => ({ ...p, value: p.value.trim() }))
      .filter((p) => p.value !== '');
    const cleanedEmails = emails
      .map((e) => ({ ...e, value: e.value.trim() }))
      .filter((e) => e.value !== '');
    const updated: Contact = {
      id: contact.id,
      contactType: values.contactType,
      firstName: values.firstName.trim() || null,
      lastName: values.lastName.trim() || null,
      companyName: values.companyName.trim() || null,
      title: values.title.trim() || null,
      phones: cleanedPhones,
      emails: cleanedEmails,
      notes: values.notes.trim() || null,
      createdAt: contact.createdAt,
      updatedAt: new Date().toISOString(),
    };
    onSave(updated);
    onClose();
  };

  const handleDelete = () => {
    const name = contactDisplayName(contact);
    if (confirm(`Delete ${name}?`)) {
      onDelete(contact.id);
      onClose();
    }
  };

  const previewName = contactDisplayName({
    firstName: (watch('firstName') ?? contact.firstName) || null,
    lastName: (watch('lastName') ?? contact.lastName) || null,
    companyName: (watch('companyName') ?? contact.companyName) || null,
  });
  const currentType = (watch('contactType') ?? contact.contactType) as ContactType;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-fg/30 backdrop-blur-[2px]" onClick={onClose} />
      <div className="w-full max-w-2xl bg-bg shadow-lift overflow-y-auto">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col h-full">
          <div className="sticky top-0 bg-bg/90 backdrop-blur-md border-b border-border px-7 py-5 z-10">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex items-center gap-3 flex-wrap">
                <h2 className="text-xl text-fg tracking-[-0.01em] font-semibold truncate">
                  {previewName || 'New contact'}
                </h2>
                <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-full bg-accent-tint text-accent border border-accent/30">
                  {currentType}
                </span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-lg text-fg-muted hover:text-fg hover:bg-bg-hover transition-colors shrink-0"
                aria-label="Close"
              >
                <X size={18} strokeWidth={1.75} />
              </button>
            </div>
          </div>

          <div className="flex-1 px-7 py-6">
            <Section icon={UserSquare} title="Identity">
              <div className="grid grid-cols-2 gap-3.5">
                <div className="col-span-2">
                  <label className={labelClass}>Type</label>
                  <select {...register('contactType')} className={inputClass}>
                    {ContactTypeEnum.options.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>First name</label>
                  <input {...register('firstName')} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Last name</label>
                  <input {...register('lastName')} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Company</label>
                  <input {...register('companyName')} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Title</label>
                  <input
                    {...register('title')}
                    placeholder="Director of Real Estate"
                    className={inputClass}
                  />
                </div>
              </div>
            </Section>

            <Section icon={Phone} title="Phones">
              <ChannelEditor
                kind="phone"
                channels={phones}
                onChange={setPhones}
              />
            </Section>

            <Section icon={Mail} title="Emails">
              <ChannelEditor kind="email" channels={emails} onChange={setEmails} />
            </Section>

            <Section icon={Link2} title="Linked to">
              {linkedProjects.length === 0 ? (
                <p className="text-xs text-fg-subtle italic">
                  Not linked to any development project yet. Link from a Dev Pipeline drawer.
                </p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {linkedProjects.map(({ link, project }) => (
                    <li
                      key={link.id}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-bg shadow-soft text-sm"
                    >
                      <Building size={13} strokeWidth={1.75} className="text-fg-muted" />
                      <span className="text-fg flex-1 truncate">
                        {project.projectName}
                      </span>
                      <span className="text-xs text-fg-muted">
                        {link.roleOverride ?? contact.contactType}
                      </span>
                      {link.isPrimary && (
                        <Star
                          size={11}
                          strokeWidth={1.75}
                          className="text-warning fill-warning"
                        />
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section icon={NotebookPen} title="Notes">
              <textarea
                {...register('notes')}
                rows={4}
                placeholder="Background, intro source, working style, anything to remember."
                className={inputClass}
              />
            </Section>
          </div>

          <div className="sticky bottom-0 bg-bg/90 backdrop-blur-md border-t border-border px-7 py-4 flex items-center justify-between">
            <button
              type="button"
              onClick={handleDelete}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 text-sm font-medium text-danger hover:bg-danger/10 rounded-xl transition-colors"
            >
              <Trash2 size={15} strokeWidth={1.75} />
              Delete
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-sm font-medium text-fg-muted hover:text-fg hover:bg-bg-hover rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 text-sm font-semibold text-accent-fg bg-accent rounded-xl hover:bg-accent-hover transition-colors shadow-soft"
              >
                Save
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── ChannelEditor (phones / emails) ────────────────────────────────

interface ChannelEditorProps {
  kind: 'phone' | 'email';
  channels: ContactChannel[];
  onChange: (next: ContactChannel[]) => void;
}

function ChannelEditor({ kind, channels, onChange }: ChannelEditorProps) {
  const update = (idx: number, patch: Partial<ContactChannel>) => {
    const next = channels.slice();
    next[idx] = { ...next[idx], ...patch };
    // When marking primary, unset others.
    if (patch.isPrimary === true) {
      next.forEach((c, i) => {
        if (i !== idx) c.isPrimary = false;
      });
    }
    onChange(next);
  };

  const remove = (idx: number) => {
    onChange(channels.filter((_, i) => i !== idx));
  };

  const add = () => {
    onChange([
      ...channels,
      {
        label: kind === 'phone' ? 'mobile' : 'work',
        value: '',
        // If this is the first one, mark primary.
        isPrimary: channels.length === 0,
      },
    ]);
  };

  return (
    <div className="flex flex-col gap-2">
      {channels.length === 0 && (
        <p className="text-xs text-fg-subtle italic">
          No {kind === 'phone' ? 'phone numbers' : 'email addresses'} yet.
        </p>
      )}
      {channels.map((c, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <select
            value={c.label}
            onChange={(e) =>
              update(idx, { label: e.target.value as ContactChannelLabel })
            }
            className="px-2 py-1.5 text-xs rounded-lg bg-bg-elevated border border-border text-fg-muted"
          >
            {ContactChannelLabelEnum.options.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
          <input
            type={kind === 'phone' ? 'tel' : 'email'}
            value={c.value}
            onChange={(e) => update(idx, { value: e.target.value })}
            placeholder={kind === 'phone' ? '+1 555 123 4567' : 'someone@example.com'}
            className={`flex-1 ${inputClass} ${kind === 'phone' ? 'tabular-nums' : ''}`}
          />
          <button
            type="button"
            onClick={() => update(idx, { isPrimary: !c.isPrimary })}
            title={c.isPrimary ? 'Primary' : 'Set as primary'}
            className={`p-1.5 rounded transition-colors ${
              c.isPrimary
                ? 'text-warning'
                : 'text-fg-subtle hover:text-fg'
            }`}
          >
            <Star
              size={13}
              strokeWidth={1.75}
              className={c.isPrimary ? 'fill-warning' : ''}
            />
          </button>
          <button
            type="button"
            onClick={() => remove(idx)}
            aria-label={`Remove ${kind}`}
            className="p-1.5 rounded text-fg-subtle hover:text-danger transition-colors"
          >
            <X size={13} strokeWidth={1.75} />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="inline-flex items-center gap-1.5 self-start px-2.5 py-1 text-xs font-medium text-fg-muted hover:text-fg hover:bg-bg-hover rounded transition-colors"
      >
        <Plus size={12} strokeWidth={2} />
        Add {kind}
      </button>
    </div>
  );
}

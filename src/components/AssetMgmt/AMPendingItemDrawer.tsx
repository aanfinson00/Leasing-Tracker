import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  X,
  Tag,
  Building2,
  CalendarDays,
  Link2,
  NotebookPen,
  Trash2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type {
  AMPendingItem,
  AMItemType,
  AMCadence,
  AMStatus,
  Priority,
} from '../../types';
import {
  AMItemTypeEnum,
  AMCadenceEnum,
  AMStatusEnum,
  PriorityEnum,
} from '../../types';
import type { View } from '../Sidebar';

const SEND_TO_MAP: Partial<Record<AMItemType, { view: View; label: string }[]>> = {
  'Lease Renewal':         [{ view: 'rentroll', label: 'Update Rent Roll' },
                            { view: 'prospects', label: 'Create Prospect' }],
  'Valuation':             [{ view: 'underwrite', label: 'Create Scenario' }],
  'CAM Reconciliation':    [{ view: 'rentroll', label: 'Open Tenant in Rent Roll' }],
  'Construction Followup': [{ view: 'development', label: 'Open Dev Project' }],
  'Capital Vendor':        [{ view: 'development', label: 'Open Dev Project' }],
  'Deliverable':           [{ view: 'rentroll', label: 'Update Rent Roll' }],
};

interface AMPendingItemDrawerProps {
  item: AMPendingItem | null;
  onClose: () => void;
  onSave: (i: AMPendingItem) => void;
  onDelete: (id: string) => void;
  onSendTo?: (item: AMPendingItem, targetView: View) => void;
}

type FormValues = {
  itemType: AMItemType;
  title: string;
  description: string;
  cadence: AMCadence;
  buildingId: string;
  buildingName: string;
  dealId: string;
  dealName: string;
  owner: string;
  status: AMStatus;
  priority: Priority;
  dueDate: string;
  completedDate: string;
  source: string;
  link: string;
  notes: string;
};

const toStr = (v: string | null | undefined): string => v ?? '';
const parseStr = (v: string): string | null => {
  const t = v.trim();
  return t === '' ? null : t;
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

export function AMPendingItemDrawer({
  item,
  onClose,
  onSave,
  onDelete,
  onSendTo,
}: AMPendingItemDrawerProps) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormValues>();

  useEffect(() => {
    if (item) {
      reset({
        itemType: item.itemType,
        title: item.title,
        description: toStr(item.description),
        cadence: item.cadence,
        buildingId: toStr(item.buildingId),
        buildingName: toStr(item.buildingName),
        dealId: toStr(item.dealId),
        dealName: toStr(item.dealName),
        owner: toStr(item.owner),
        status: item.status,
        priority: item.priority,
        dueDate: toStr(item.dueDate),
        completedDate: toStr(item.completedDate),
        source: toStr(item.source),
        link: toStr(item.link),
        notes: toStr(item.notes),
      });
    }
  }, [item, reset]);

  if (!item) return null;

  const onSubmit = (v: FormValues) => {
    const updated: AMPendingItem = {
      id: item.id,
      itemType: v.itemType,
      title: v.title.trim(),
      description: parseStr(v.description),
      cadence: v.cadence,
      buildingId: parseStr(v.buildingId),
      buildingName: parseStr(v.buildingName),
      dealId: parseStr(v.dealId),
      dealName: parseStr(v.dealName),
      owner: parseStr(v.owner),
      status: v.status,
      priority: v.priority,
      dueDate: parseStr(v.dueDate),
      completedDate: parseStr(v.completedDate),
      source: parseStr(v.source),
      link: parseStr(v.link),
      sentToTab: item.sentToTab,
      sentToId: item.sentToId,
      notes: parseStr(v.notes),
      createdAt: item.createdAt,
      updatedAt: new Date().toISOString(),
    };
    onSave(updated);
    onClose();
  };

  const handleDelete = () => {
    if (confirm(`Delete "${item.title || 'this item'}"?`)) {
      onDelete(item.id);
      onClose();
    }
  };

  const currentTitle = watch('title') ?? item.title ?? 'New item';
  const currentType = watch('itemType') ?? item.itemType;
  const currentStatus = watch('status') ?? item.status;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-fg/30 backdrop-blur-[2px]" onClick={onClose} />
      <div className="w-full max-w-2xl bg-bg shadow-lift overflow-y-auto">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col h-full">
          <div className="sticky top-0 bg-bg/90 backdrop-blur-md border-b border-border px-7 py-5 z-10">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex items-center gap-3 flex-wrap">
                <h2 className="text-xl text-fg tracking-[-0.01em] font-semibold truncate">
                  {currentTitle || 'New item'}
                </h2>
                <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-full bg-accent-tint text-accent border border-accent/30">
                  {currentType}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-full bg-bg border border-border text-fg-muted">
                  {currentStatus}
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

          {currentStatus === 'Done' && !item.sentToTab && SEND_TO_MAP[currentType] && onSendTo && (
            <div className="mx-7 mt-4 px-4 py-3 rounded-xl bg-success/10 border border-success/30">
              <p className="text-sm font-medium text-success mb-2">
                Item complete — send the result to another tab?
              </p>
              <div className="flex flex-wrap gap-2">
                {SEND_TO_MAP[currentType]!.map((dest) => (
                  <button
                    key={dest.view}
                    type="button"
                    onClick={() => onSendTo(item, dest.view)}
                    className="px-3 py-1.5 text-xs font-semibold text-accent-fg bg-accent rounded-lg hover:bg-accent-hover transition-colors"
                  >
                    {dest.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {item.sentToTab && (
            <div className="mx-7 mt-4 px-4 py-3 rounded-xl bg-bg border border-border">
              <p className="text-xs text-fg-muted">
                Sent to <span className="font-medium text-fg">{item.sentToTab}</span>
                {item.sentToId && <span className="text-fg-subtle"> ({item.sentToId})</span>}
              </p>
            </div>
          )}

          <div className="flex-1 px-7 py-6">
            <Section icon={Tag} title="Item">
              <div className="grid grid-cols-2 gap-3.5">
                <div className="col-span-2">
                  <label className={labelClass}>Title *</label>
                  <input
                    {...register('title', { required: 'Required' })}
                    className={inputClass}
                  />
                  {errors.title && (
                    <p className="text-danger text-xs mt-1.5">
                      {errors.title.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className={labelClass}>Type</label>
                  <select {...register('itemType')} className={inputClass}>
                    {AMItemTypeEnum.options.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Status</label>
                  <select {...register('status')} className={inputClass}>
                    {AMStatusEnum.options.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Priority</label>
                  <select {...register('priority')} className={inputClass}>
                    {PriorityEnum.options.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Cadence</label>
                  <select {...register('cadence')} className={inputClass}>
                    {AMCadenceEnum.options.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Owner</label>
                  <input
                    {...register('owner')}
                    placeholder="Sarah / GC / JLL"
                    className={inputClass}
                  />
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>Description</label>
                  <textarea
                    {...register('description')}
                    rows={3}
                    placeholder="What needs to happen, by whom, dependencies."
                    className={inputClass}
                  />
                </div>
              </div>
            </Section>

            <Section icon={Building2} title="Linked Property">
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className={labelClass}>Building Name</label>
                  <input {...register('buildingName')} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Building ID</label>
                  <input
                    {...register('buildingId')}
                    className={`${inputClass} tabular-nums`}
                  />
                </div>
                <div>
                  <label className={labelClass}>Deal Name</label>
                  <input {...register('dealName')} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Deal ID</label>
                  <input
                    {...register('dealId')}
                    className={`${inputClass} tabular-nums`}
                  />
                </div>
              </div>
            </Section>

            <Section icon={CalendarDays} title="Timing">
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className={labelClass}>Due Date</label>
                  <input
                    {...register('dueDate')}
                    type="date"
                    className={`${inputClass} tabular-nums`}
                  />
                </div>
                <div>
                  <label className={labelClass}>Completed Date</label>
                  <input
                    {...register('completedDate')}
                    type="date"
                    className={`${inputClass} tabular-nums`}
                  />
                </div>
              </div>
            </Section>

            <Section icon={Link2} title="Source">
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className={labelClass}>Source</label>
                  <input
                    {...register('source')}
                    placeholder="Punch list, tenant email, vendor proposal..."
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Link</label>
                  <input
                    {...register('link')}
                    type="url"
                    placeholder="https://..."
                    className={inputClass}
                  />
                </div>
              </div>
            </Section>

            <Section icon={NotebookPen} title="Notes">
              <textarea
                {...register('notes')}
                rows={4}
                placeholder="Background, blockers, contact info."
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

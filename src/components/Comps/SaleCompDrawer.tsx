import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { MiniMapEditor } from '../MiniMapEditor';
import {
  X,
  Building2,
  DollarSign,
  CalendarDays,
  Link2,
  NotebookPen,
  Trash2,
  ShieldCheck,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { SalesComp, CompConfidence } from '../../types';
import { CompConfidenceEnum } from '../../types';

interface SaleCompDrawerProps {
  comp: SalesComp | null;
  onClose: () => void;
  onSave: (c: SalesComp) => void;
  onDelete: (id: string) => void;
}

type FormValues = {
  propertyName: string;
  buildingAddress: string;
  market: string;
  propertyType: string;
  buildingType: string;
  saleDate: string;
  salePrice: string;
  pricePSF: string;
  capRate: string;
  noi: string;
  buildingSF: string;
  landAcres: string;
  yearBuilt: string;
  occupancyPct: string;
  buyer: string;
  seller: string;
  source: string;
  sourceUrl: string;
  confidence: CompConfidence;
  confidential: boolean;
  notes: string;
};

const toStr = (v: string | number | null | undefined): string => {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number') {
    if (Number.isInteger(v)) return String(v);
    return parseFloat(v.toFixed(6)).toString();
  }
  return String(v);
};
const parseNum = (v: string): number | null => {
  const t = v.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};
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

export function SaleCompDrawer({ comp, onClose, onSave, onDelete }: SaleCompDrawerProps) {
  const { register, handleSubmit, reset, watch } = useForm<FormValues>();
  const [latLng, setLatLng] = useState<{ lat: number | null; lng: number | null }>({
    lat: null,
    lng: null,
  });

  useEffect(() => {
    if (comp) setLatLng({ lat: comp.lat ?? null, lng: comp.lng ?? null });
  }, [comp]);

  useEffect(() => {
    if (comp) {
      reset({
        propertyName: toStr(comp.propertyName),
        buildingAddress: toStr(comp.buildingAddress),
        market: toStr(comp.market),
        propertyType: toStr(comp.propertyType),
        buildingType: toStr(comp.buildingType),
        saleDate: toStr(comp.saleDate),
        salePrice: toStr(comp.salePrice),
        pricePSF: toStr(comp.pricePSF),
        capRate: toStr(comp.capRate != null ? comp.capRate * 100 : null),
        noi: toStr(comp.noi),
        buildingSF: toStr(comp.buildingSF),
        landAcres: toStr(comp.landAcres),
        yearBuilt: toStr(comp.yearBuilt),
        occupancyPct: toStr(comp.occupancyPct != null ? comp.occupancyPct * 100 : null),
        buyer: toStr(comp.buyer),
        seller: toStr(comp.seller),
        source: toStr(comp.source),
        sourceUrl: toStr(comp.sourceUrl),
        confidence: comp.confidence,
        confidential: comp.confidential,
        notes: toStr(comp.notes),
      });
    }
  }, [comp, reset]);

  if (!comp) return null;

  const onSubmit = (v: FormValues) => {
    const capRatePct = parseNum(v.capRate);
    const occPct = parseNum(v.occupancyPct);
    const updated: SalesComp = {
      id: comp.id,
      propertyName: parseStr(v.propertyName),
      buildingAddress: parseStr(v.buildingAddress),
      market: parseStr(v.market),
      propertyType: parseStr(v.propertyType),
      buildingType: parseStr(v.buildingType),
      saleDate: parseStr(v.saleDate),
      salePrice: parseNum(v.salePrice),
      pricePSF: parseNum(v.pricePSF),
      capRate: capRatePct != null ? capRatePct / 100 : null,
      noi: parseNum(v.noi),
      buildingSF: parseNum(v.buildingSF),
      landAcres: parseNum(v.landAcres),
      yearBuilt: parseNum(v.yearBuilt) != null ? Math.round(parseNum(v.yearBuilt)!) : null,
      occupancyPct: occPct != null ? occPct / 100 : null,
      buyer: parseStr(v.buyer),
      seller: parseStr(v.seller),
      source: parseStr(v.source),
      sourceUrl: parseStr(v.sourceUrl),
      confidence: v.confidence,
      confidential: !!v.confidential,
      lat: latLng.lat,
      lng: latLng.lng,
      notes: parseStr(v.notes),
      createdAt: comp.createdAt,
      updatedAt: new Date().toISOString(),
    };
    onSave(updated);
    onClose();
  };

  const handleDelete = () => {
    const label = comp.propertyName || comp.buildingAddress || 'this comp';
    if (confirm(`Delete ${label}?`)) {
      onDelete(comp.id);
      onClose();
    }
  };

  const currentTitle = watch('propertyName') ?? comp.propertyName ?? 'New sale comp';

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-fg/30 backdrop-blur-[2px]" onClick={onClose} />
      <div className="w-full max-w-2xl bg-bg shadow-lift overflow-y-auto">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col h-full">
          <div className="sticky top-0 bg-bg/90 backdrop-blur-md border-b border-border px-7 py-5 z-10">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-xl text-fg tracking-[-0.01em] font-semibold truncate">
                  {currentTitle || 'New sale comp'}
                </h2>
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
            <Section icon={Building2} title="Property">
              <div className="grid grid-cols-2 gap-3.5">
                <div className="col-span-2">
                  <label className={labelClass}>Property Name</label>
                  <input {...register('propertyName')} className={inputClass} />
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>Address</label>
                  <input {...register('buildingAddress')} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Market</label>
                  <input {...register('market')} placeholder="e.g. Atlanta South" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Property Type</label>
                  <input {...register('propertyType')} placeholder="Industrial / Flex / Office" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Building Type</label>
                  <input {...register('buildingType')} placeholder="Rear Load, Front Load, Cross Dock" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Year Built</label>
                  <input {...register('yearBuilt')} type="number" placeholder="2020" className={`${inputClass} tabular-nums`} />
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>Location</label>
                  <MiniMapEditor
                    lat={latLng.lat}
                    lng={latLng.lng}
                    address={watch('buildingAddress') ?? ''}
                    onChange={(lat, lng) => setLatLng({ lat, lng })}
                  />
                </div>
              </div>
            </Section>

            <Section icon={CalendarDays} title="Sale Date">
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className={labelClass}>Sale Date</label>
                  <input {...register('saleDate')} type="date" className={`${inputClass} tabular-nums`} />
                </div>
              </div>
            </Section>

            <Section icon={DollarSign} title="Economics">
              <div className="grid grid-cols-3 gap-3.5">
                <div>
                  <label className={labelClass}>Sale Price ($)</label>
                  <input {...register('salePrice')} type="number" step="any" className={`${inputClass} tabular-nums`} />
                </div>
                <div>
                  <label className={labelClass}>Price $/SF</label>
                  <input {...register('pricePSF')} type="number" step="any" className={`${inputClass} tabular-nums`} />
                </div>
                <div>
                  <label className={labelClass}>Cap Rate %</label>
                  <input {...register('capRate')} type="number" step="any" placeholder="6.5" className={`${inputClass} tabular-nums`} />
                </div>
                <div>
                  <label className={labelClass}>NOI ($)</label>
                  <input {...register('noi')} type="number" step="any" className={`${inputClass} tabular-nums`} />
                </div>
                <div>
                  <label className={labelClass}>Building SF</label>
                  <input {...register('buildingSF')} type="number" step="any" className={`${inputClass} tabular-nums`} />
                </div>
                <div>
                  <label className={labelClass}>Land (acres)</label>
                  <input {...register('landAcres')} type="number" step="any" className={`${inputClass} tabular-nums`} />
                </div>
                <div>
                  <label className={labelClass}>Occupancy %</label>
                  <input {...register('occupancyPct')} type="number" step="any" placeholder="95" className={`${inputClass} tabular-nums`} />
                </div>
              </div>
            </Section>

            <Section icon={Users} title="Parties">
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className={labelClass}>Buyer</label>
                  <input {...register('buyer')} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Seller</label>
                  <input {...register('seller')} className={inputClass} />
                </div>
              </div>
            </Section>

            <Section icon={Link2} title="Source">
              <div className="grid grid-cols-2 gap-3.5">
                <div className="col-span-2">
                  <label className={labelClass}>Source</label>
                  <input {...register('source')} placeholder="CoStar, RCA, broker tip" className={inputClass} />
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>Source URL</label>
                  <input {...register('sourceUrl')} type="url" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Confidence</label>
                  <select {...register('confidence')} className={inputClass}>
                    {CompConfidenceEnum.options.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end pb-1">
                  <label className="inline-flex items-center gap-2 text-sm text-fg-muted cursor-pointer">
                    <input
                      type="checkbox"
                      {...register('confidential')}
                      className="rounded border-border accent-accent"
                    />
                    <ShieldCheck size={14} strokeWidth={1.75} className="text-fg-muted" />
                    <span>Confidential / off-the-record</span>
                  </label>
                </div>
              </div>
            </Section>

            <Section icon={NotebookPen} title="Notes">
              <textarea
                {...register('notes')}
                rows={4}
                placeholder="Deal story, motivation, portfolio context, anything that contextualizes the headline numbers."
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

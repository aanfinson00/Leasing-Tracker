import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import type { Deal, DealStage } from '../types';
import { DealStageEnum } from '../types';

interface DealDrawerProps {
  deal: Deal | null;
  onClose: () => void;
  onSave: (deal: Deal) => void;
  onDelete: (id: string) => void;
}

type FormValues = {
  propertyName: string;
  address: string;
  city: string;
  state: string;
  squareFeet: string;
  tenantName: string;
  stage: DealStage;
  targetCloseDate: string;
  broker: string;
  brokerCommissionPct: string;
  baseRentPSF: string;
  leaseStartDate: string;
  leaseEndDate: string;
  termMonths: string;
  rentEscalationPct: string;
  nnnPSF: string;
  tiAllowancePSF: string;
  freeRentMonths: string;
  renewalOptions: string;
  expansionRights: string;
  notes: string;
  lastModifiedBy: string;
};

const toFormString = (v: string | number | null | undefined): string => {
  if (v === null || v === undefined) return '';
  return String(v);
};

const parseNum = (v: string): number | null => {
  if (!v || v.trim() === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const parseStr = (v: string): string | null => {
  const trimmed = v.trim();
  return trimmed === '' ? null : trimmed;
};

export function DealDrawer({ deal, onClose, onSave, onDelete }: DealDrawerProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>();

  useEffect(() => {
    if (deal) {
      reset({
        propertyName: deal.propertyName,
        address: deal.address,
        city: deal.city,
        state: deal.state,
        squareFeet: toFormString(deal.squareFeet),
        tenantName: deal.tenantName,
        stage: deal.stage,
        targetCloseDate: toFormString(deal.targetCloseDate),
        broker: toFormString(deal.broker),
        brokerCommissionPct: toFormString(deal.brokerCommissionPct),
        baseRentPSF: toFormString(deal.baseRentPSF),
        leaseStartDate: toFormString(deal.leaseStartDate),
        leaseEndDate: toFormString(deal.leaseEndDate),
        termMonths: toFormString(deal.termMonths),
        rentEscalationPct: toFormString(deal.rentEscalationPct),
        nnnPSF: toFormString(deal.nnnPSF),
        tiAllowancePSF: toFormString(deal.tiAllowancePSF),
        freeRentMonths: toFormString(deal.freeRentMonths),
        renewalOptions: toFormString(deal.renewalOptions),
        expansionRights: toFormString(deal.expansionRights),
        notes: toFormString(deal.notes),
        lastModifiedBy: toFormString(deal.lastModifiedBy),
      });
    }
  }, [deal, reset]);

  if (!deal) return null;

  const onSubmit = (values: FormValues) => {
    const updated: Deal = {
      id: deal.id,
      propertyName: values.propertyName.trim(),
      address: values.address.trim(),
      city: values.city.trim(),
      state: values.state.trim(),
      squareFeet: parseNum(values.squareFeet),
      tenantName: values.tenantName.trim(),
      stage: values.stage,
      targetCloseDate: parseStr(values.targetCloseDate),
      broker: parseStr(values.broker),
      brokerCommissionPct: parseNum(values.brokerCommissionPct),
      baseRentPSF: parseNum(values.baseRentPSF),
      leaseStartDate: parseStr(values.leaseStartDate),
      leaseEndDate: parseStr(values.leaseEndDate),
      termMonths: parseNum(values.termMonths),
      rentEscalationPct: parseNum(values.rentEscalationPct),
      nnnPSF: parseNum(values.nnnPSF),
      tiAllowancePSF: parseNum(values.tiAllowancePSF),
      freeRentMonths: parseNum(values.freeRentMonths),
      renewalOptions: parseStr(values.renewalOptions),
      expansionRights: parseStr(values.expansionRights),
      notes: parseStr(values.notes),
      lastModifiedBy: parseStr(values.lastModifiedBy),
      lastModifiedAt: new Date().toISOString(),
    };
    onSave(updated);
    onClose();
  };

  const handleDelete = () => {
    if (confirm(`Delete deal for "${deal.propertyName || 'this property'}"?`)) {
      onDelete(deal.id);
      onClose();
    }
  };

  const inputClass =
    'w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1';
  const sectionClass = 'border-t border-gray-200 pt-4 mt-4 first:border-t-0 first:pt-0 first:mt-0';
  const sectionTitleClass = 'text-base font-semibold text-gray-900 mb-3';

  return (
    <div className="fixed inset-0 z-50 flex">
      <div
        className="flex-1 bg-black/40"
        onClick={onClose}
        aria-label="Close drawer"
      />
      <div className="w-full max-w-2xl bg-white shadow-xl overflow-y-auto">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col h-full">
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
            <h2 className="text-xl font-bold text-gray-900">
              {deal.propertyName ? `Edit: ${deal.propertyName}` : 'New Deal'}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
              aria-label="Close"
            >
              ×
            </button>
          </div>

          <div className="flex-1 px-6 py-4 space-y-2">
            <section className={sectionClass}>
              <h3 className={sectionTitleClass}>Property</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className={labelClass}>Property Name *</label>
                  <input
                    {...register('propertyName', { required: 'Required' })}
                    className={inputClass}
                  />
                  {errors.propertyName && (
                    <p className="text-red-600 text-xs mt-1">{errors.propertyName.message}</p>
                  )}
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>Address</label>
                  <input {...register('address')} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>City</label>
                  <input {...register('city')} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>State</label>
                  <input {...register('state')} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Square Feet</label>
                  <input
                    {...register('squareFeet')}
                    type="number"
                    className={inputClass}
                  />
                </div>
              </div>
            </section>

            <section className={sectionClass}>
              <h3 className={sectionTitleClass}>Tenant & Pipeline</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className={labelClass}>Tenant Name *</label>
                  <input
                    {...register('tenantName', { required: 'Required' })}
                    className={inputClass}
                  />
                  {errors.tenantName && (
                    <p className="text-red-600 text-xs mt-1">{errors.tenantName.message}</p>
                  )}
                </div>
                <div>
                  <label className={labelClass}>Stage</label>
                  <select {...register('stage')} className={inputClass}>
                    {DealStageEnum.options.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Target Close Date</label>
                  <input {...register('targetCloseDate')} type="date" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Broker</label>
                  <input {...register('broker')} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Broker Commission %</label>
                  <input
                    {...register('brokerCommissionPct')}
                    type="number"
                    step="0.01"
                    className={inputClass}
                  />
                </div>
              </div>
            </section>

            <section className={sectionClass}>
              <h3 className={sectionTitleClass}>Economics</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Base Rent $/SF</label>
                  <input
                    {...register('baseRentPSF')}
                    type="number"
                    step="0.01"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>NNN $/SF</label>
                  <input
                    {...register('nnnPSF')}
                    type="number"
                    step="0.01"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Lease Start Date</label>
                  <input {...register('leaseStartDate')} type="date" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Lease End Date</label>
                  <input {...register('leaseEndDate')} type="date" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Term (Months)</label>
                  <input
                    {...register('termMonths')}
                    type="number"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Annual Escalation %</label>
                  <input
                    {...register('rentEscalationPct')}
                    type="number"
                    step="0.01"
                    className={inputClass}
                  />
                </div>
              </div>
            </section>

            <section className={sectionClass}>
              <h3 className={sectionTitleClass}>Concessions & Options</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>TI Allowance $/SF</label>
                  <input
                    {...register('tiAllowancePSF')}
                    type="number"
                    step="0.01"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Free Rent (Months)</label>
                  <input
                    {...register('freeRentMonths')}
                    type="number"
                    className={inputClass}
                  />
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>Renewal Options</label>
                  <input {...register('renewalOptions')} className={inputClass} />
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>Expansion Rights</label>
                  <input {...register('expansionRights')} className={inputClass} />
                </div>
              </div>
            </section>

            <section className={sectionClass}>
              <h3 className={sectionTitleClass}>Notes</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className={labelClass}>Notes</label>
                  <textarea
                    {...register('notes')}
                    rows={4}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Last Modified By</label>
                  <input {...register('lastModifiedBy')} className={inputClass} />
                </div>
              </div>
            </section>
          </div>

          <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-between gap-2">
            <button
              type="button"
              onClick={handleDelete}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Delete
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
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

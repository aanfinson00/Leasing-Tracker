// Live search across the entities that have drawers + a clear "open"
// path. Search is client-side over the in-memory arrays already held in
// App state — no new API.

import { useMemo } from 'react';
import { Command } from 'cmdk';
import { CommandRow } from './CommandRow';
import type {
  Deal,
  RentRollRow,
  DevelopmentProject,
  AcquisitionTarget,
  DispositionListing,
  Contact,
} from '../../../types';
import { contactDisplayName } from '../../../types';

interface Props {
  query: string;
  deals: Deal[];
  rentRoll: RentRollRow[];
  devProjects: DevelopmentProject[];
  acqTargets: AcquisitionTarget[];
  dispoListings: DispositionListing[];
  contacts: Contact[];

  onOpenDeal: (d: Deal) => void;
  onOpenTenant: (t: RentRollRow) => void;
  onOpenDevProject: (p: DevelopmentProject) => void;
  onOpenAcqTarget: (a: AcquisitionTarget) => void;
  onOpenDispoListing: (d: DispositionListing) => void;
  onOpenContact: (c: Contact) => void;
}

const LIMIT_PER_GROUP = 5;

function matches(haystack: (string | null | undefined)[], q: string): boolean {
  const ql = q.toLowerCase();
  for (const s of haystack) {
    if (s && s.toLowerCase().includes(ql)) return true;
  }
  return false;
}

function contactHaystack(c: Contact): (string | null | undefined)[] {
  return [
    c.firstName,
    c.lastName,
    c.companyName,
    c.title,
    ...c.emails.map((e) => e.value),
    ...c.phones.map((p) => p.value),
  ];
}

export function SearchResultsGroup({
  query,
  deals,
  rentRoll,
  devProjects,
  acqTargets,
  dispoListings,
  contacts,
  onOpenDeal,
  onOpenTenant,
  onOpenDevProject,
  onOpenAcqTarget,
  onOpenDispoListing,
  onOpenContact,
}: Props) {
  const dealHits = useMemo(
    () =>
      deals
        .filter((d) =>
          matches([d.dealName, d.prospectTenant, d.brokerRep, d.dealId, d.building], query)
        )
        .slice(0, LIMIT_PER_GROUP),
    [deals, query]
  );

  const tenantHits = useMemo(
    () =>
      rentRoll
        .filter((t) => matches([t.tenantName, t.building, t.dealName, t.spaceId], query))
        .slice(0, LIMIT_PER_GROUP),
    [rentRoll, query]
  );

  const devHits = useMemo(
    () =>
      devProjects
        .filter((p) => matches([p.projectName, p.address, p.market, p.pmName, p.gcName], query))
        .slice(0, LIMIT_PER_GROUP),
    [devProjects, query]
  );

  const acqHits = useMemo(
    () =>
      acqTargets
        .filter((a) => matches([a.targetName, a.address, a.market], query))
        .slice(0, LIMIT_PER_GROUP),
    [acqTargets, query]
  );

  const dispoHits = useMemo(
    () =>
      dispoListings
        .filter((d) => matches([d.assetName, d.address, d.market], query))
        .slice(0, LIMIT_PER_GROUP),
    [dispoListings, query]
  );

  const contactHits = useMemo(
    () =>
      contacts.filter((c) => matches(contactHaystack(c), query)).slice(0, LIMIT_PER_GROUP),
    [contacts, query]
  );

  const total =
    dealHits.length +
    tenantHits.length +
    devHits.length +
    acqHits.length +
    dispoHits.length +
    contactHits.length;

  if (total === 0) {
    return (
      <Command.Empty className="px-4 py-6 text-xs text-center text-fg-muted">
        No matches for "{query}"
      </Command.Empty>
    );
  }

  return (
    <>
      {dealHits.length > 0 && (
        <Command.Group heading={`Deals (${dealHits.length})`}>
          {dealHits.map((d) => (
            <CommandRow
              key={d.id}
              value={`deal ${d.dealName} ${d.prospectTenant ?? ''} ${d.dealId ?? ''}`}
              onSelect={() => onOpenDeal(d)}
            >
              <span className="truncate">
                <span className="font-medium">{d.dealName}</span>
                {(d.prospectTenant || d.brokerRep) && (
                  <span className="text-fg-muted">
                    {' '}· {d.prospectTenant ?? ''}{d.brokerRep ? ` (${d.brokerRep})` : ''}
                  </span>
                )}
                {d.status && <span className="text-fg-muted"> · {d.status}</span>}
              </span>
            </CommandRow>
          ))}
        </Command.Group>
      )}

      {tenantHits.length > 0 && (
        <Command.Group heading={`Tenants (${tenantHits.length})`}>
          {tenantHits.map((t) => (
            <CommandRow
              key={t.id}
              value={`tenant ${t.tenantName ?? ''} ${t.building ?? ''} ${t.spaceId ?? ''}`}
              onSelect={() => onOpenTenant(t)}
            >
              <span className="truncate">
                <span className="font-medium">{t.tenantName ?? '(vacant)'}</span>
                {t.building && <span className="text-fg-muted"> · {t.building}</span>}
                {t.spaceId && <span className="text-fg-muted"> · {t.spaceId}</span>}
              </span>
            </CommandRow>
          ))}
        </Command.Group>
      )}

      {devHits.length > 0 && (
        <Command.Group heading={`Dev Projects (${devHits.length})`}>
          {devHits.map((p) => (
            <CommandRow
              key={p.id}
              value={`dev ${p.projectName} ${p.address ?? ''} ${p.market ?? ''}`}
              onSelect={() => onOpenDevProject(p)}
            >
              <span className="truncate">
                <span className="font-medium">{p.projectName}</span>
                {p.phase && <span className="text-fg-muted"> · {p.phase}</span>}
                {p.market && <span className="text-fg-muted"> · {p.market}</span>}
              </span>
            </CommandRow>
          ))}
        </Command.Group>
      )}

      {acqHits.length > 0 && (
        <Command.Group heading={`Acquisitions (${acqHits.length})`}>
          {acqHits.map((a) => (
            <CommandRow
              key={a.id}
              value={`acq ${a.targetName} ${a.address ?? ''} ${a.market ?? ''}`}
              onSelect={() => onOpenAcqTarget(a)}
            >
              <span className="truncate">
                <span className="font-medium">{a.targetName}</span>
                <span className="text-fg-muted"> · {a.status}</span>
                {a.market && <span className="text-fg-muted"> · {a.market}</span>}
              </span>
            </CommandRow>
          ))}
        </Command.Group>
      )}

      {dispoHits.length > 0 && (
        <Command.Group heading={`Dispositions (${dispoHits.length})`}>
          {dispoHits.map((d) => (
            <CommandRow
              key={d.id}
              value={`dispo ${d.assetName} ${d.address ?? ''} ${d.market ?? ''}`}
              onSelect={() => onOpenDispoListing(d)}
            >
              <span className="truncate">
                <span className="font-medium">{d.assetName}</span>
                <span className="text-fg-muted"> · {d.status}</span>
                {d.market && <span className="text-fg-muted"> · {d.market}</span>}
              </span>
            </CommandRow>
          ))}
        </Command.Group>
      )}

      {contactHits.length > 0 && (
        <Command.Group heading={`Contacts (${contactHits.length})`}>
          {contactHits.map((c) => {
            const display = contactDisplayName(c);
            const email = c.emails[0]?.value;
            return (
              <CommandRow
                key={c.id}
                value={`contact ${display} ${c.companyName ?? ''} ${email ?? ''}`}
                onSelect={() => onOpenContact(c)}
              >
                <span className="truncate">
                  <span className="font-medium">{display}</span>
                  {c.title && <span className="text-fg-muted"> · {c.title}</span>}
                  {email && <span className="text-fg-muted"> · {email}</span>}
                </span>
              </CommandRow>
            );
          })}
        </Command.Group>
      )}
    </>
  );
}

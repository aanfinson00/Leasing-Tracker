import { useState, useRef, useEffect, useMemo } from 'react';
import {
  FilePlus,
  Sparkles,
  FolderOpen,
  Download,
  Plus,
  FileSpreadsheet,
  Link2,
  Check,
  X,
  Cloud,
  CloudOff,
  Unlink,
} from 'lucide-react';
import type {
  AcquisitionTarget,
  AcquisitionTargetContact,
  AcquisitionTargetNote,
  ActivityEntry,
  AMPendingItem,
  Building,
  Contact,
  Deal,
  DealStatus,
  DevelopmentProject,
  DevProjectContact,
  DevProjectNote,
  DispositionListing,
  DispositionListingContact,
  DispositionListingNote,
  LeaseComp,
  SalesComp,
  OnboardingChecklist,
  OnboardingItem,
  PropertyTaxAppeal,
  RentRollRow,
  Scenario,
} from './types';
import { defaultDeal, defaultOnboardingChecklist, defaultRentRollRow } from './types';
import { DEFAULT_GLOBALS, DEFAULT_INPUTS_BASE } from './lib/lease-math/types';
import type { ScenarioInputs } from './lib/lease-math/types';
import { runScenario } from './lib/lease-math/calc';
import { loadFromFile, saveToFile, buildWorkbookBlob, buildViewWorkbookBlob } from './lib/excel';
import type { FullDataSet } from './lib/excel';
import { saveSnapshot, loadSnapshot, clearSnapshot } from './lib/autosave';
import { encodeShare, decodeShare, readShareFromUrl, clearShareFromUrl } from './lib/share';
import { makeStatusChangeEntry } from './lib/activity';
import { getOnboardingFor, makeBlankItems, reconcileWithTemplate } from './lib/onboarding';
import {
  isFileSystemAccessSupported,
  loadHandle,
  saveHandle,
  clearHandle,
  updateLastSeenModified,
  queryHandlePermission,
  requestHandlePermission,
  pickFile,
  readFromHandle,
  writeToHandle,
} from './lib/fileHandle';
import { DealTable } from './components/DealTable';
import { FilterBar } from './components/FilterBar';
import { SummaryStrip } from './components/SummaryStrip';
import { DealDrawer } from './components/DealDrawer';
import { RentRollTable } from './components/RentRollTable';
import { RentRollFilterBar } from './components/RentRollFilterBar';
import { RentRollSummary } from './components/RentRollSummary';
import { RentRollDrawer } from './components/RentRollDrawer';
import { PromoteDrawer } from './components/PromoteDrawer';
import { ReportsView } from './components/ReportsView';
import { OnboardingView } from './components/Onboarding/OnboardingView';
import { Sidebar, type View } from './components/Sidebar';
import { SkillsModal } from './components/SkillsModal';
import { SUPABASE_CONFIGURED } from './lib/supabase';
import {
  listDeals,
  upsertDeal,
  bulkUpsertDeals,
  deleteDeal as deleteDealRow,
  subscribeDeals,
} from './lib/repo/deals';
import {
  listRentRoll,
  upsertRentRoll,
  bulkUpsertRentRoll,
  deleteRentRoll as deleteRentRollRow,
  subscribeRentRoll,
} from './lib/repo/rentRoll';
import {
  listActivities,
  insertActivity,
  upsertActivity,
  bulkInsertActivities,
  deleteActivity as deleteActivityRow,
  subscribeActivities,
} from './lib/repo/activities';
import {
  listOnboardings,
  upsertOnboarding,
  bulkUpsertOnboardings,
  deleteOnboarding as deleteOnboardingRow,
  subscribeOnboardings,
} from './lib/repo/onboardings';
import {
  listScenariosForDeal,
  upsertScenario,
  deleteScenario as deleteScenarioRow,
  subscribeScenarios,
} from './lib/repo/scenarios';
import {
  listDevelopmentProjects,
  upsertDevelopmentProject,
  deleteDevelopmentProject as deleteDevProjectRow,
  subscribeDevelopmentProjects,
} from './lib/repo/developmentProjects';
import {
  listLeaseComps,
  upsertLeaseComp,
  deleteLeaseComp as deleteLeaseCompRow,
  subscribeLeaseComps,
} from './lib/repo/leaseComps';
import {
  listSalesComps,
  upsertSalesComp,
  deleteSalesComp as deleteSalesCompRow,
  subscribeSalesComps,
} from './lib/repo/salesComps';
import { listAllBuildings, subscribeBuildings } from './lib/repo/buildings';
import {
  listPropertyTaxAppeals,
  upsertPropertyTaxAppeal,
  deletePropertyTaxAppeal as deletePropertyTaxAppealRow,
  subscribePropertyTaxAppeals,
} from './lib/repo/propertyTaxAppeals';
import {
  listAMPendingItems,
  upsertAMPendingItem,
  deleteAMPendingItem as deleteAMPendingItemRow,
  subscribeAMPendingItems,
} from './lib/repo/amPendingItems';
import {
  listContacts,
  upsertContact,
  deleteContact as deleteContactRow,
  subscribeContacts,
} from './lib/repo/contacts';
import {
  listDevProjectContacts,
  upsertDevProjectContact,
  deleteDevProjectContact as deleteDevProjectContactRow,
  subscribeDevProjectContacts,
} from './lib/repo/devProjectContacts';
import {
  listDevProjectNotes,
  upsertDevProjectNote,
  deleteDevProjectNote as deleteDevProjectNoteRow,
  subscribeDevProjectNotes,
} from './lib/repo/devProjectNotes';
import {
  listAcquisitionTargets,
  upsertAcquisitionTarget,
  deleteAcquisitionTarget as deleteAcquisitionTargetRow,
  subscribeAcquisitionTargets,
  listAcquisitionTargetContacts,
  upsertAcquisitionTargetContact,
  deleteAcquisitionTargetContact as deleteAcquisitionTargetContactRow,
  subscribeAcquisitionTargetContacts,
  listAcquisitionTargetNotes,
  upsertAcquisitionTargetNote,
  deleteAcquisitionTargetNote as deleteAcquisitionTargetNoteRow,
  subscribeAcquisitionTargetNotes,
} from './lib/repo/acquisitionTargets';
import {
  listDispositionListings,
  upsertDispositionListing,
  deleteDispositionListing as deleteDispositionListingRow,
  subscribeDispositionListings,
  listDispositionListingContacts,
  upsertDispositionListingContact,
  deleteDispositionListingContact as deleteDispositionListingContactRow,
  subscribeDispositionListingContacts,
  listDispositionListingNotes,
  upsertDispositionListingNote,
  deleteDispositionListingNote as deleteDispositionListingNoteRow,
  subscribeDispositionListingNotes,
} from './lib/repo/dispositionListings';
import { UnderwriteView } from './components/Underwrite/UnderwriteView';
import { DevelopmentView } from './components/Development/DevelopmentView';
import { DevelopmentProjectDrawer } from './components/Development/DevelopmentProjectDrawer';
import { AcquisitionTargetDrawer } from './components/Acquisitions/AcquisitionTargetDrawer';
import { DispositionListingDrawer } from './components/Disposition/DispositionListingDrawer';
import { geocodeAddress } from './lib/geocode';
import { CompsView } from './components/Comps/CompsView';
import { ContactsView } from './components/Contacts/ContactsView';
import { AcquisitionsView } from './components/Acquisitions/AcquisitionsView';
import { DispositionView } from './components/Disposition/DispositionView';
import { MapView } from './components/Map/MapView';
import { AssetMgmtView } from './components/AssetMgmt/AssetMgmtView';
import { GridBackground } from './components/GridBackground';
import { MobileNav } from './components/MobileNav';
import { ExcelToolbar } from './components/ExcelToolbar';

function App() {
  const [view, setView] = useState<View>('prospects');
  const [skillsOpen, setSkillsOpen] = useState(false);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [filteredDeals, setFilteredDeals] = useState<Deal[]>([]);
  const [rentRoll, setRentRoll] = useState<RentRollRow[]>([]);
  const [filteredRentRoll, setFilteredRentRoll] = useState<RentRollRow[]>([]);
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [onboardings, setOnboardings] = useState<OnboardingChecklist[]>([]);
  const [filename, setFilename] = useState<string>('');
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  // App-level dev-project edit state, only opened when the Global Map pin
  // is clicked. DevelopmentView keeps its own internal `editing` state for
  // the in-page drawer.
  const [editingDevProject, setEditingDevProject] =
    useState<DevelopmentProject | null>(null);
  const [editingAcqTarget, setEditingAcqTarget] =
    useState<AcquisitionTarget | null>(null);
  const [editingDispoListing, setEditingDispoListing] =
    useState<DispositionListing | null>(null);
  const [editingRow, setEditingRow] = useState<RentRollRow | null>(null);
  const [promotingDeal, setPromotingDeal] = useState<Deal | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [appToast, setAppToast] = useState<string | null>(null);
  const [sharedSnapshot, setSharedSnapshot] = useState<{ filename: string; sharedAt: string } | null>(null);
  const [fileHandle, setFileHandle] = useState<FileSystemFileHandle | null>(null);
  const [needsReconnect, setNeedsReconnect] = useState(false);
  const [lastSeenModified, setLastSeenModified] = useState<number | null>(null);
  // Underwrite tab state — separate from deals/rentRoll/etc. because
  // scenarios are loaded per-deal on demand (not eagerly).
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [devProjects, setDevProjects] = useState<DevelopmentProject[]>([]);
  const [leaseComps, setLeaseComps] = useState<LeaseComp[]>([]);
  const [salesComps, setSalesComps] = useState<SalesComp[]>([]);
  // All buildings, eagerly loaded so the rent-roll/deal drawers can offer
  // a space picker. MapView keeps its own state for now (its render path
  // already drives off it); these two subscriptions co-exist fine.
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [propertyTaxAppeals, setPropertyTaxAppeals] = useState<PropertyTaxAppeal[]>([]);
  const [amPendingItems, setAMPendingItems] = useState<AMPendingItem[]>([]);
  // CRM v1
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [devProjectContacts, setDevProjectContacts] = useState<DevProjectContact[]>([]);
  const [devProjectNotes, setDevProjectNotes] = useState<DevProjectNote[]>([]);
  const [acquisitionTargets, setAcquisitionTargets] = useState<AcquisitionTarget[]>([]);
  const [acquisitionTargetContacts, setAcquisitionTargetContacts] = useState<AcquisitionTargetContact[]>([]);
  const [acquisitionTargetNotes, setAcquisitionTargetNotes] = useState<AcquisitionTargetNote[]>([]);
  const [dispositionListings, setDispositionListings] = useState<DispositionListing[]>([]);
  const [dispositionListingContacts, setDispositionListingContacts] = useState<DispositionListingContact[]>([]);
  const [dispositionListingNotes, setDispositionListingNotes] = useState<DispositionListingNote[]>([]);
  const [selectedUwDealId, setSelectedUwDealId] = useState<string | null>(null);
  // A/B/editing are independent: A and B drive the comparison view,
  // editingId drives which scenario the InputsPanel writes to.
  const [scenarioAId, setScenarioAId] = useState<string | null>(null);
  const [scenarioBId, setScenarioBId] = useState<string | null>(null);
  const [editingScenarioId, setEditingScenarioId] = useState<string | null>(null);
  // Mirror in a ref so the realtime closure (created once on mount) sees
  // the latest selection without re-subscribing on every change.
  const selectedUwDealIdRef = useRef<string | null>(null);
  useEffect(() => { selectedUwDealIdRef.current = selectedUwDealId; }, [selectedUwDealId]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fsAccessSupported = isFileSystemAccessSupported();

  const showToast = (msg: string) => {
    setAppToast(msg);
    setTimeout(() => setAppToast((prev) => (prev === msg ? null : prev)), 3500);
  };

  const formatTime = (d: Date): string =>
    d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  // Cross-tab lookup: which prospects have an active deal for a given Space ID?
  const prospectsBySpaceId = useMemo(() => {
    const m = new Map<string, Deal>();
    deals.forEach((d) => {
      if (d.spaceId && d.status !== 'Lost') {
        m.set(d.spaceId, d);
      }
    });
    return m;
  }, [deals]);

  // Push a freshly-parsed workbook into Supabase (bulk upsert by id).
  // Called from the legacy file-handle reconnect path AND the Excel import
  // buttons. Idempotent — re-importing the same workbook is a no-op.
  const pushWorkbookToSupabase = async (result: Partial<FullDataSet>) => {
    if (!SUPABASE_CONFIGURED) return;
    try {
      const ops: Promise<void>[] = [];
      if (result.deals?.length) ops.push(bulkUpsertDeals(result.deals));
      if (result.rentRoll?.length) ops.push(bulkUpsertRentRoll(result.rentRoll));
      if (result.activities?.length) ops.push(bulkInsertActivities(result.activities));
      if (result.onboardings?.length) ops.push(bulkUpsertOnboardings(result.onboardings));
      if (result.scenarios?.length) ops.push(Promise.all(result.scenarios.map(upsertScenario)).then(() => {}));
      if (result.devProjects?.length) ops.push(Promise.all(result.devProjects.map(upsertDevelopmentProject)).then(() => {}));
      if (result.leaseComps?.length) ops.push(Promise.all(result.leaseComps.map(upsertLeaseComp)).then(() => {}));
      if (result.propertyTaxAppeals?.length) ops.push(Promise.all(result.propertyTaxAppeals.map(upsertPropertyTaxAppeal)).then(() => {}));
      if (result.amPendingItems?.length) ops.push(Promise.all(result.amPendingItems.map(upsertAMPendingItem)).then(() => {}));
      if (result.contacts?.length) ops.push(Promise.all(result.contacts.map(upsertContact)).then(() => {}));
      if (result.devProjectContacts?.length) ops.push(Promise.all(result.devProjectContacts.map(upsertDevProjectContact)).then(() => {}));
      if (result.devProjectNotes?.length) ops.push(Promise.all(result.devProjectNotes.map(upsertDevProjectNote)).then(() => {}));
      if (result.acquisitionTargets?.length) ops.push(Promise.all(result.acquisitionTargets.map(upsertAcquisitionTarget)).then(() => {}));
      if (result.acquisitionTargetContacts?.length) ops.push(Promise.all(result.acquisitionTargetContacts.map(upsertAcquisitionTargetContact)).then(() => {}));
      if (result.acquisitionTargetNotes?.length) ops.push(Promise.all(result.acquisitionTargetNotes.map(upsertAcquisitionTargetNote)).then(() => {}));
      if (result.dispositionListings?.length) ops.push(Promise.all(result.dispositionListings.map(upsertDispositionListing)).then(() => {}));
      if (result.dispositionListingContacts?.length) ops.push(Promise.all(result.dispositionListingContacts.map(upsertDispositionListingContact)).then(() => {}));
      if (result.dispositionListingNotes?.length) ops.push(Promise.all(result.dispositionListingNotes.map(upsertDispositionListingNote)).then(() => {}));
      await Promise.all(ops);
      const total = Object.values(result).reduce((s, a) => s + (Array.isArray(a) ? a.length : 0), 0);
      showToast(`Synced ${total} records to server`);
    } catch (err) {
      console.error('Bulk import to Supabase failed:', err);
      showToast('Server import failed — see console');
    }
  };

  const loadFromHandleResult = async (handle: FileSystemFileHandle): Promise<boolean> => {
    try {
      const file = await readFromHandle(handle);
      const result = await loadFromFile(file);
      setDeals(result.deals);
      setFilteredDeals(result.deals);
      setRentRoll(result.rentRoll);
      setFilteredRentRoll(result.rentRoll);
      setActivities(result.activities);
      setOnboardings(result.onboardings);
      setFilename(file.name);
      setLastSeenModified(file.lastModified);
      void pushWorkbookToSupabase(result);
      return true;
    } catch (err) {
      console.error('Failed to load from handle:', err);
      return false;
    }
  };

  useEffect(() => {
    // Share-link snapshots stay local — they're a side-channel for showing
    // a frozen view to someone without DB access. Don't write them through
    // to Supabase.
    const encoded = readShareFromUrl();
    if (encoded) {
      decodeShare(encoded).then((payload) => {
        if (payload) {
          setDeals(payload.deals);
          setFilteredDeals(payload.deals);
          setRentRoll(payload.rentRoll);
          setFilteredRentRoll(payload.rentRoll);
          setActivities(payload.activities ?? []);
          setOnboardings((payload.onboardings ?? []).map(reconcileWithTemplate));
          setFilename(payload.filename);
          setSharedSnapshot({ filename: payload.filename, sharedAt: payload.sharedAt });
        } else {
          alert('That share link is invalid or corrupted.');
        }
        clearShareFromUrl();
        setHydrated(true);
      });
      return;
    }

    if (SUPABASE_CONFIGURED) {
      (async () => {
        try {
          const [
            d, r, a, o, dev, comps, sComps, bldgs, appeals, amItems,
            crmContacts, crmLinks, crmNotes,
            acqTargets, acqLinks, acqNotes,
            dispoListings, dispoLinks, dispoNotes,
          ] = await Promise.all([
            listDeals(),
            listRentRoll(),
            listActivities(),
            listOnboardings(),
            listDevelopmentProjects(),
            listLeaseComps(),
            listSalesComps(),
            listAllBuildings(),
            listPropertyTaxAppeals(),
            listAMPendingItems(),
            listContacts(),
            listDevProjectContacts(),
            listDevProjectNotes(),
            listAcquisitionTargets(),
            listAcquisitionTargetContacts(),
            listAcquisitionTargetNotes(),
            listDispositionListings(),
            listDispositionListingContacts(),
            listDispositionListingNotes(),
          ]);
          setDeals(d);
          setFilteredDeals(d);
          setRentRoll(r);
          setFilteredRentRoll(r);
          setActivities(a);
          setOnboardings(o.map(reconcileWithTemplate));
          setDevProjects(dev);
          setLeaseComps(comps);
          setSalesComps(sComps);
          setBuildings(bldgs);
          setPropertyTaxAppeals(appeals);
          setAMPendingItems(amItems);
          setContacts(crmContacts);
          setDevProjectContacts(crmLinks);
          setDevProjectNotes(crmNotes);
          setAcquisitionTargets(acqTargets);
          setAcquisitionTargetContacts(acqLinks);
          setAcquisitionTargetNotes(acqNotes);
          setDispositionListings(dispoListings);
          setDispositionListingContacts(dispoLinks);
          setDispositionListingNotes(dispoNotes);
          setFilename('leasing-tracker.xlsx');
        } catch (err) {
          console.error('Failed to load from Supabase:', err);
          showToast('Failed to load from server — falling back to local snapshot');
        } finally {
          setHydrated(true);
        }
      })();
      return;
    }

    // Legacy local-first flow — only runs when Supabase env vars are absent.
    (async () => {
      if (fsAccessSupported) {
        const rec = await loadHandle();
        if (rec) {
          setFileHandle(rec.handle);
          setFilename(rec.name);
          const perm = await queryHandlePermission(rec.handle);
          if (perm === 'granted') {
            const ok = await loadFromHandleResult(rec.handle);
            if (ok) {
              setHydrated(true);
              return;
            }
          } else {
            setNeedsReconnect(true);
            setHydrated(true);
            return;
          }
        }
      }

      const snapshot = await loadSnapshot();
      if (snapshot && (snapshot.deals.length > 0 || snapshot.rentRoll.length > 0)) {
        const restore = confirm(
          `Found unsaved work from ${new Date(snapshot.savedAt).toLocaleString()} (${snapshot.deals.length} deals, ${snapshot.rentRoll.length} rent roll rows). Restore?`
        );
        if (restore) {
          setDeals(snapshot.deals);
          setFilteredDeals(snapshot.deals);
          setRentRoll(snapshot.rentRoll);
          setFilteredRentRoll(snapshot.rentRoll);
          setActivities(snapshot.activities ?? []);
          setOnboardings((snapshot.onboardings ?? []).map(reconcileWithTemplate));
          setFilename(snapshot.filename);
        } else {
          clearSnapshot();
        }
      }
      setHydrated(true);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Realtime — when other clients change rows, merge into local state.
  // Self-emitted events are idempotent (the row's already in state with
  // the same shape), so we don't need to dedupe by client_id.
  useEffect(() => {
    if (!SUPABASE_CONFIGURED) return;
    const unsubDeals = subscribeDeals({
      onInsert: (d) => setDeals((prev) => (prev.some((x) => x.id === d.id) ? prev : [...prev, d])),
      onUpdate: (d) => setDeals((prev) => prev.map((x) => (x.id === d.id ? d : x))),
      onDelete: (id) => setDeals((prev) => prev.filter((x) => x.id !== id)),
    });
    const unsubRr = subscribeRentRoll({
      onInsert: (r) => setRentRoll((prev) => (prev.some((x) => x.id === r.id) ? prev : [...prev, r])),
      onUpdate: (r) => setRentRoll((prev) => prev.map((x) => (x.id === r.id ? r : x))),
      onDelete: (id) => setRentRoll((prev) => prev.filter((x) => x.id !== id)),
    });
    const unsubAct = subscribeActivities({
      onInsert: (a) =>
        setActivities((prev) => (prev.some((x) => x.id === a.id) ? prev : [...prev, a])),
      onDelete: (id) => setActivities((prev) => prev.filter((x) => x.id !== id)),
    });
    const unsubOb = subscribeOnboardings({
      onUpsert: (o) =>
        setOnboardings((prev) => {
          const idx = prev.findIndex((x) => x.id === o.id);
          if (idx === -1) return [...prev, reconcileWithTemplate(o)];
          const next = prev.slice();
          next[idx] = reconcileWithTemplate(o);
          return next;
        }),
      onDelete: (id) => setOnboardings((prev) => prev.filter((x) => x.id !== id)),
    });
    // Scenarios: filter realtime events by the currently-selected deal in
    // the handler since the channel isn't filtered server-side.
    const unsubScenarios = subscribeScenarios({
      onUpsert: (s) =>
        setScenarios((prev) => {
          // Only merge if this scenario belongs to the deal we're viewing.
          if (s.dealId !== selectedUwDealIdRef.current) return prev;
          const idx = prev.findIndex((x) => x.id === s.id);
          if (idx === -1) return [...prev, s];
          const next = prev.slice();
          next[idx] = s;
          return next;
        }),
      onDelete: (id) => setScenarios((prev) => prev.filter((x) => x.id !== id)),
    });
    const unsubDev = subscribeDevelopmentProjects({
      onUpsert: (p) =>
        setDevProjects((prev) => {
          const idx = prev.findIndex((x) => x.id === p.id);
          if (idx === -1) return [...prev, p];
          const next = prev.slice();
          next[idx] = p;
          return next;
        }),
      onDelete: (id) => setDevProjects((prev) => prev.filter((x) => x.id !== id)),
    });
    const unsubComps = subscribeLeaseComps({
      onUpsert: (c) =>
        setLeaseComps((prev) => {
          const idx = prev.findIndex((x) => x.id === c.id);
          if (idx === -1) return [...prev, c];
          const next = prev.slice();
          next[idx] = c;
          return next;
        }),
      onDelete: (id) => setLeaseComps((prev) => prev.filter((x) => x.id !== id)),
    });
    const unsubSalesComps = subscribeSalesComps({
      onUpsert: (c) =>
        setSalesComps((prev) => {
          const idx = prev.findIndex((x) => x.id === c.id);
          if (idx === -1) return [...prev, c];
          const next = prev.slice();
          next[idx] = c;
          return next;
        }),
      onDelete: (id) => setSalesComps((prev) => prev.filter((x) => x.id !== id)),
    });
    // Note: MapView also subscribes to buildings — duplicate subscriptions
    // are fine, channels are isolated. If we want to dedupe later, lift
    // MapView's state up to here and pass it down.
    const unsubBldgs = subscribeBuildings({
      onUpsert: (b) =>
        setBuildings((prev) => {
          const idx = prev.findIndex((x) => x.id === b.id);
          if (idx === -1) return [...prev, b];
          const next = prev.slice();
          next[idx] = b;
          return next;
        }),
      onDelete: (id) => setBuildings((prev) => prev.filter((x) => x.id !== id)),
    });
    const unsubAppeals = subscribePropertyTaxAppeals({
      onUpsert: (a) =>
        setPropertyTaxAppeals((prev) => {
          const idx = prev.findIndex((x) => x.id === a.id);
          if (idx === -1) return [...prev, a];
          const next = prev.slice();
          next[idx] = a;
          return next;
        }),
      onDelete: (id) =>
        setPropertyTaxAppeals((prev) => prev.filter((x) => x.id !== id)),
    });
    const unsubAMItems = subscribeAMPendingItems({
      onUpsert: (i) =>
        setAMPendingItems((prev) => {
          const idx = prev.findIndex((x) => x.id === i.id);
          if (idx === -1) return [...prev, i];
          const next = prev.slice();
          next[idx] = i;
          return next;
        }),
      onDelete: (id) =>
        setAMPendingItems((prev) => prev.filter((x) => x.id !== id)),
    });
    const unsubCrmContacts = subscribeContacts({
      onUpsert: (c) =>
        setContacts((prev) => {
          const idx = prev.findIndex((x) => x.id === c.id);
          if (idx === -1) return [...prev, c];
          const next = prev.slice();
          next[idx] = c;
          return next;
        }),
      onDelete: (id) => setContacts((prev) => prev.filter((x) => x.id !== id)),
    });
    const unsubCrmLinks = subscribeDevProjectContacts({
      onUpsert: (l) =>
        setDevProjectContacts((prev) => {
          const idx = prev.findIndex((x) => x.id === l.id);
          if (idx === -1) return [...prev, l];
          const next = prev.slice();
          next[idx] = l;
          return next;
        }),
      onDelete: (id) =>
        setDevProjectContacts((prev) => prev.filter((x) => x.id !== id)),
    });
    const unsubCrmNotes = subscribeDevProjectNotes({
      onUpsert: (n) =>
        setDevProjectNotes((prev) => {
          const idx = prev.findIndex((x) => x.id === n.id);
          if (idx === -1) return [...prev, n];
          const next = prev.slice();
          next[idx] = n;
          return next;
        }),
      onDelete: (id) =>
        setDevProjectNotes((prev) => prev.filter((x) => x.id !== id)),
    });
    const unsubAcqTargets = subscribeAcquisitionTargets({
      onUpsert: (a) =>
        setAcquisitionTargets((prev) => {
          const idx = prev.findIndex((x) => x.id === a.id);
          if (idx === -1) return [...prev, a];
          const next = prev.slice();
          next[idx] = a;
          return next;
        }),
      onDelete: (id) =>
        setAcquisitionTargets((prev) => prev.filter((x) => x.id !== id)),
    });
    const unsubAcqLinks = subscribeAcquisitionTargetContacts({
      onUpsert: (l) =>
        setAcquisitionTargetContacts((prev) => {
          const idx = prev.findIndex((x) => x.id === l.id);
          if (idx === -1) return [...prev, l];
          const next = prev.slice();
          next[idx] = l;
          return next;
        }),
      onDelete: (id) =>
        setAcquisitionTargetContacts((prev) => prev.filter((x) => x.id !== id)),
    });
    const unsubAcqNotes = subscribeAcquisitionTargetNotes({
      onUpsert: (n) =>
        setAcquisitionTargetNotes((prev) => {
          const idx = prev.findIndex((x) => x.id === n.id);
          if (idx === -1) return [...prev, n];
          const next = prev.slice();
          next[idx] = n;
          return next;
        }),
      onDelete: (id) =>
        setAcquisitionTargetNotes((prev) => prev.filter((x) => x.id !== id)),
    });
    const unsubDispoListings = subscribeDispositionListings({
      onUpsert: (d) =>
        setDispositionListings((prev) => {
          const idx = prev.findIndex((x) => x.id === d.id);
          if (idx === -1) return [...prev, d];
          const next = prev.slice();
          next[idx] = d;
          return next;
        }),
      onDelete: (id) =>
        setDispositionListings((prev) => prev.filter((x) => x.id !== id)),
    });
    const unsubDispoLinks = subscribeDispositionListingContacts({
      onUpsert: (l) =>
        setDispositionListingContacts((prev) => {
          const idx = prev.findIndex((x) => x.id === l.id);
          if (idx === -1) return [...prev, l];
          const next = prev.slice();
          next[idx] = l;
          return next;
        }),
      onDelete: (id) =>
        setDispositionListingContacts((prev) => prev.filter((x) => x.id !== id)),
    });
    const unsubDispoNotes = subscribeDispositionListingNotes({
      onUpsert: (n) =>
        setDispositionListingNotes((prev) => {
          const idx = prev.findIndex((x) => x.id === n.id);
          if (idx === -1) return [...prev, n];
          const next = prev.slice();
          next[idx] = n;
          return next;
        }),
      onDelete: (id) =>
        setDispositionListingNotes((prev) => prev.filter((x) => x.id !== id)),
    });
    return () => {
      unsubDeals();
      unsubRr();
      unsubAct();
      unsubOb();
      unsubScenarios();
      unsubDev();
      unsubComps();
      unsubSalesComps();
      unsubBldgs();
      unsubAppeals();
      unsubAMItems();
      unsubCrmContacts();
      unsubCrmLinks();
      unsubCrmNotes();
      unsubAcqTargets();
      unsubAcqLinks();
      unsubAcqNotes();
      unsubDispoListings();
      unsubDispoLinks();
      unsubDispoNotes();
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    // Supabase is the source of truth — skip Dexie autosave to avoid a
    // stale local snapshot that could shadow live data on next load.
    if (SUPABASE_CONFIGURED) return;
    if (
      deals.length === 0 &&
      rentRoll.length === 0 &&
      activities.length === 0 &&
      onboardings.length === 0
    ) {
      clearSnapshot();
      return;
    }
    saveSnapshot(deals, rentRoll, activities, onboardings, filename);
  }, [deals, rentRoll, activities, onboardings, filename, hydrated]);

  const handleOpenClick = async () => {
    if (fsAccessSupported) {
      try {
        const handle = await pickFile();
        if (!handle) return;
        const file = await readFromHandle(handle);
        const result = await loadFromFile(file);
        setDeals(result.deals);
        setFilteredDeals(result.deals);
        setRentRoll(result.rentRoll);
        setFilteredRentRoll(result.rentRoll);
        setActivities(result.activities);
        setOnboardings(result.onboardings);
        setFilename(file.name);
        setFileHandle(handle);
        setLastSeenModified(file.lastModified);
        setNeedsReconnect(false);
        await saveHandle(handle, file.lastModified);
        showToast(`Connected to ${file.name}`);
        void pushWorkbookToSupabase(result);
      } catch (err) {
        alert(`Error opening file: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
      return;
    }
    // Fallback for browsers without File System Access (Firefox, Safari)
    fileInputRef.current?.click();
  };

  const handleOpenFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const result = await loadFromFile(file);
      setDeals(result.deals);
      setFilteredDeals(result.deals);
      setRentRoll(result.rentRoll);
      setFilteredRentRoll(result.rentRoll);
      setActivities(result.activities);
      setOnboardings(result.onboardings);
      setFilename(file.name);
      void pushWorkbookToSupabase(result);
    } catch (err) {
      alert(`Error loading file: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const gatherFullDataSet = (): FullDataSet => ({
    deals, rentRoll, activities, onboardings, scenarios, buildings,
    devProjects, propertyTaxAppeals: propertyTaxAppeals, leaseComps, amPendingItems,
    contacts, devProjectContacts, devProjectNotes,
    acquisitionTargets, acquisitionTargetContacts, acquisitionTargetNotes,
    dispositionListings, dispositionListingContacts, dispositionListingNotes,
  });

  const handleViewExport = (viewName: string) => {
    const blob = buildViewWorkbookBlob(viewName, gatherFullDataSet());
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `parce-${viewName}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleViewImport = async (_viewName: string, file: File) => {
    try {
      const result = await loadFromFile(file);
      let imported = 0;
      if (result.deals.length) { setDeals(result.deals); setFilteredDeals(result.deals); imported += result.deals.length; }
      if (result.rentRoll.length) { setRentRoll(result.rentRoll); setFilteredRentRoll(result.rentRoll); imported += result.rentRoll.length; }
      if (result.activities.length) { setActivities(result.activities); imported += result.activities.length; }
      if (result.onboardings.length) { setOnboardings(result.onboardings); imported += result.onboardings.length; }
      if (result.scenarios.length) { setScenarios(result.scenarios); imported += result.scenarios.length; }
      if (result.buildings.length) { setBuildings(result.buildings); imported += result.buildings.length; }
      if (result.devProjects.length) { setDevProjects(result.devProjects); imported += result.devProjects.length; }
      if (result.propertyTaxAppeals.length) { setPropertyTaxAppeals(result.propertyTaxAppeals); imported += result.propertyTaxAppeals.length; }
      if (result.leaseComps.length) { setLeaseComps(result.leaseComps); imported += result.leaseComps.length; }
      if (result.amPendingItems.length) { setAMPendingItems(result.amPendingItems); imported += result.amPendingItems.length; }
      if (result.contacts.length) { setContacts(result.contacts); imported += result.contacts.length; }
      if (result.devProjectContacts.length) { setDevProjectContacts(result.devProjectContacts); imported += result.devProjectContacts.length; }
      if (result.devProjectNotes.length) { setDevProjectNotes(result.devProjectNotes); imported += result.devProjectNotes.length; }
      if (result.acquisitionTargets.length) { setAcquisitionTargets(result.acquisitionTargets); imported += result.acquisitionTargets.length; }
      if (result.acquisitionTargetContacts.length) { setAcquisitionTargetContacts(result.acquisitionTargetContacts); imported += result.acquisitionTargetContacts.length; }
      if (result.acquisitionTargetNotes.length) { setAcquisitionTargetNotes(result.acquisitionTargetNotes); imported += result.acquisitionTargetNotes.length; }
      if (result.dispositionListings.length) { setDispositionListings(result.dispositionListings); imported += result.dispositionListings.length; }
      if (result.dispositionListingContacts.length) { setDispositionListingContacts(result.dispositionListingContacts); imported += result.dispositionListingContacts.length; }
      if (result.dispositionListingNotes.length) { setDispositionListingNotes(result.dispositionListingNotes); imported += result.dispositionListingNotes.length; }
      showToast(`Imported ${imported} records`);
      void pushWorkbookToSupabase(result);
    } catch (err) {
      alert(`Import failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleSkillDataDownload = (skillName: string) => {
    const data = gatherFullDataSet();
    const blob = buildWorkbookBlob(data);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `parce-${skillName}-data.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveFile = async () => {
    if (fileHandle) {
      try {
        // Conflict detection: did the file change since we loaded it?
        const current = await readFromHandle(fileHandle);
        if (
          lastSeenModified !== null &&
          current.lastModified > lastSeenModified &&
          current.lastModified - lastSeenModified > 1500 // ignore sub-2s clock noise
        ) {
          const diffSec = Math.round((current.lastModified - lastSeenModified) / 1000);
          const diffLabel =
            diffSec < 60
              ? `${diffSec}s ago`
              : diffSec < 3600
                ? `${Math.round(diffSec / 60)} min ago`
                : `${Math.round(diffSec / 3600)}h ago`;
          const choice = confirm(
            `${current.name} was modified externally (${diffLabel}). Overwrite anyway?\n\nClick Cancel to reload their version instead.`
          );
          if (!choice) {
            const ok = await loadFromHandleResult(fileHandle);
            if (ok) showToast('Reloaded latest version');
            return;
          }
        }
        const blob = buildWorkbookBlob(gatherFullDataSet());
        await writeToHandle(fileHandle, blob);
        // Re-read to grab the new mtime (after the write)
        const after = await readFromHandle(fileHandle);
        setLastSeenModified(after.lastModified);
        await updateLastSeenModified(after.lastModified);
        showToast(`Saved · ${formatTime(new Date())}`);
      } catch (err) {
        console.error('Save failed:', err);
        alert(`Save failed: ${err instanceof Error ? err.message : err}`);
      }
      return;
    }
    const name = filename || 'leases.xlsx';
    saveToFile(gatherFullDataSet(), undefined, undefined, undefined, name);
  };

  const handleReconnect = async () => {
    if (!fileHandle) return;
    const perm = await requestHandlePermission(fileHandle);
    if (perm !== 'granted') {
      showToast('Permission denied');
      return;
    }
    const ok = await loadFromHandleResult(fileHandle);
    if (ok) {
      setNeedsReconnect(false);
      showToast(`Reconnected to ${fileHandle.name}`);
    }
  };

  const handleDisconnect = async () => {
    if (!fileHandle) return;
    if (!confirm(`Disconnect from ${fileHandle.name}? Future saves will download instead.`)) return;
    await clearHandle();
    setFileHandle(null);
    setLastSeenModified(null);
    setNeedsReconnect(false);
    showToast('Disconnected — saves will download');
  };

  const handleShareLink = async () => {
    try {
      const encoded = await encodeShare(
        deals,
        rentRoll,
        activities,
        onboardings,
        filename || 'leases.xlsx'
      );
      const url = `${window.location.origin}${window.location.pathname}#data=${encoded}`;
      // Microsoft SafeLinks (Teams + Outlook) routes through Akamai, which
      // rejects URLs over ~8 KB. Warn early so people don't paste broken
      // links into Teams chats.
      const sizeKB = Math.round(url.length / 1024);
      if (sizeKB > 6) {
        const proceed = confirm(
          `Share link is ${sizeKB} KB.\n\n` +
            `Microsoft Teams and Outlook reject links over ~8 KB (SafeLinks limit), ` +
            `and many chat apps truncate long URLs.\n\n` +
            (fileHandle
              ? `For your team, the connected file in OneDrive is the better channel — Save in place, then Share from OneDrive.\n\n`
              : `For your team, save the workbook into a shared OneDrive folder and share it from there.\n\n`) +
            `Copy this link anyway?`
        );
        if (!proceed) return;
      }
      await navigator.clipboard.writeText(url);
      showToast(`Share link copied (${sizeKB} KB)`);
    } catch (err) {
      alert(`Could not create share link: ${err instanceof Error ? err.message : err}`);
    }
  };

  // Fire-and-forget Supabase write. Errors get logged + toasted but we
  // don't roll back the optimistic UI update — the next page load (or a
  // realtime event from a successful write) will reconcile.
  const writeThrough = (label: string, p: Promise<unknown>) => {
    if (!SUPABASE_CONFIGURED) return;
    p.catch((err) => {
      console.error(`Supabase ${label} failed:`, err);
      showToast(`Server sync failed: ${label}`);
    });
  };

  // ── Prospects handlers
  const handleNewDeal = () => {
    const newDeal = defaultDeal();
    const updated = [...deals, newDeal];
    setDeals(updated);
    setFilteredDeals(updated);
    setEditingDeal(newDeal);
    writeThrough('create deal', upsertDeal(newDeal));
  };
  const handleSelectDeal = (deal: Deal) => setEditingDeal(deal);
  const handleSaveDeal = (updated: Deal) => {
    const newDeals = deals.map((d) => (d.id === updated.id ? updated : d));
    setDeals(newDeals);
    setFilteredDeals((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
    writeThrough('save deal', upsertDeal(updated));
  };
  const handleDeleteDeal = (id: string) => {
    const newDeals = deals.filter((d) => d.id !== id);
    setDeals(newDeals);
    setFilteredDeals((prev) => prev.filter((d) => d.id !== id));
    setActivities((prev) =>
      prev.filter((a) => !(a.parentType === 'deal' && a.parentId === id))
    );
    writeThrough('delete deal', deleteDealRow(id));
    // Cascade: drop the deal's activities server-side too.
    if (SUPABASE_CONFIGURED) {
      const orphaned = activities.filter((a) => a.parentType === 'deal' && a.parentId === id);
      orphaned.forEach((a) => writeThrough('delete activity', deleteActivityRow(a.id)));
    }
  };

  // ── Rent Roll handlers
  const handleNewRow = () => {
    const newRow = defaultRentRollRow();
    const updated = [...rentRoll, newRow];
    setRentRoll(updated);
    setFilteredRentRoll(updated);
    setEditingRow(newRow);
    writeThrough('create rent roll row', upsertRentRoll(newRow));
  };
  const handleSelectRow = (row: RentRollRow) => setEditingRow(row);
  const handleSaveRow = (updated: RentRollRow) => {
    const newRows = rentRoll.map((r) => (r.id === updated.id ? updated : r));
    setRentRoll(newRows);
    setFilteredRentRoll((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    writeThrough('save rent roll row', upsertRentRoll(updated));
  };
  const handleDeleteRow = (id: string) => {
    const newRows = rentRoll.filter((r) => r.id !== id);
    setRentRoll(newRows);
    setFilteredRentRoll((prev) => prev.filter((r) => r.id !== id));
    setActivities((prev) =>
      prev.filter((a) => !(a.parentType === 'rentroll' && a.parentId === id))
    );
    setOnboardings((prev) => prev.filter((o) => o.rentRollId !== id));
    writeThrough('delete rent roll row', deleteRentRollRow(id));
    if (SUPABASE_CONFIGURED) {
      activities
        .filter((a) => a.parentType === 'rentroll' && a.parentId === id)
        .forEach((a) => writeThrough('delete activity', deleteActivityRow(a.id)));
      onboardings
        .filter((o) => o.rentRollId === id)
        .forEach((o) => writeThrough('delete onboarding', deleteOnboardingRow(o.id)));
    }
  };

  // ── Activity handlers
  const handleAddActivity = (entry: Omit<ActivityEntry, 'id' | 'createdAt'>) => {
    const full: ActivityEntry = {
      ...entry,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    setActivities((prev) => [...prev, full]);
    writeThrough('add activity', insertActivity(full));
  };
  const handleDeleteActivity = (id: string) => {
    setActivities((prev) => prev.filter((a) => a.id !== id));
    writeThrough('delete activity', deleteActivityRow(id));
  };
  const handleDealStatusChange = (deal: Deal, from: DealStatus, to: DealStatus) => {
    if (from === to) return;
    const entry = makeStatusChangeEntry('deal', deal.id, from, to);
    setActivities((prev) => [...prev, entry]);
    writeThrough('log status change', insertActivity(entry));
  };

  // ── Cross-tab: Promote a prospect → Rent Roll
  const handleOpenPromote = (deal: Deal) => {
    setEditingDeal(null);
    setPromotingDeal(deal);
  };

  const handleConfirmPromote = (rrRow: RentRollRow, isNew: boolean) => {
    if (!promotingDeal) return;
    const promotedDealId = promotingDeal.id;
    const newRows = isNew
      ? [...rentRoll, rrRow]
      : rentRoll.map((r) => (r.id === rrRow.id ? rrRow : r));
    setRentRoll(newRows);
    setFilteredRentRoll(newRows);
    // Delete the prospect — it lives in the rent roll from here on
    const newDeals = deals.filter((d) => d.id !== promotedDealId);
    setDeals(newDeals);
    setFilteredDeals(newDeals);

    // Reassign existing activities from the prospect to the rent roll row,
    // and append a transition entry so the timeline shows the handoff.
    const transition = makeStatusChangeEntry(
      'rentroll',
      rrRow.id,
      'Executed',
      'Promoted to Rent Roll'
    );
    const reparented = activities
      .filter((a) => a.parentType === 'deal' && a.parentId === promotedDealId)
      .map((a) => ({ ...a, parentType: 'rentroll' as const, parentId: rrRow.id }));
    setActivities((prev) => [
      ...prev.map((a) =>
        a.parentType === 'deal' && a.parentId === promotedDealId
          ? { ...a, parentType: 'rentroll' as const, parentId: rrRow.id }
          : a
      ),
      transition,
    ]);

    // Auto-start an onboarding checklist for this tenant if one doesn't
    // already exist. Idempotent so re-promoting the same rent roll row
    // reuses the existing checklist (preserving any prior checkmarks).
    const existingChecklist = getOnboardingFor(onboardings, rrRow.id);
    const newChecklist = existingChecklist
      ? null
      : defaultOnboardingChecklist(rrRow.id, makeBlankItems());
    setOnboardings((prev) =>
      newChecklist && !getOnboardingFor(prev, rrRow.id) ? [...prev, newChecklist] : prev
    );

    // Sync the whole transition to Supabase.
    writeThrough('promote: save rent roll row', upsertRentRoll(rrRow));
    writeThrough('promote: delete prospect', deleteDealRow(promotedDealId));
    reparented.forEach((a) => writeThrough('promote: reparent activity', upsertActivity(a)));
    writeThrough('promote: log transition', insertActivity(transition));
    if (newChecklist) {
      writeThrough('promote: start onboarding', upsertOnboarding(newChecklist));
    }

    setPromotingDeal(null);
    setView('rentroll');
  };

  // ── Cross-tab: Start a prospect from a vacant Rent Roll row
  const todayIso = () => {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day}`;
  };
  const handleStartProspect = (row: RentRollRow) => {
    const sf = row.leasableSF;
    const newDeal: Deal = {
      ...defaultDeal(),
      dealName: row.dealName ?? '',
      dealId: row.dealId,
      building: row.building,
      spaceId: row.spaceId,
      minSF: sf,
      maxSF: sf,
      lastRevalUWRent: row.lastRevalUWRent,
      targetRent: row.startingAnnualRentPSF ?? row.lastRevalUWRent,
      status: 'New Prospect',
      priority: 'Low',
      lastUpdated: todayIso(),
    };
    const updated = [...deals, newDeal];
    setDeals(updated);
    setFilteredDeals(updated);
    setView('prospects');
    setEditingDeal(newDeal);
    writeThrough('start prospect from vacant', upsertDeal(newDeal));
  };

  // ── Onboarding handlers
  const handleStartOnboarding = (row: RentRollRow) => {
    const existing = getOnboardingFor(onboardings, row.id);
    if (!existing) {
      const newChecklist = defaultOnboardingChecklist(row.id, makeBlankItems());
      setOnboardings((prev) =>
        getOnboardingFor(prev, row.id) ? prev : [...prev, newChecklist]
      );
      writeThrough('start onboarding', upsertOnboarding(newChecklist));
    }
    setView('onboarding');
  };
  const handleUpdateOnboardingItem = (
    checklistId: string,
    itemId: string,
    patch: Partial<OnboardingItem>
  ) => {
    let updatedChecklist: OnboardingChecklist | null = null;
    setOnboardings((prev) =>
      prev.map((c) => {
        if (c.id !== checklistId) return c;
        const next: OnboardingChecklist = {
          ...c,
          items: c.items.map((i) => (i.itemId === itemId ? { ...i, ...patch } : i)),
        };
        updatedChecklist = next;
        return next;
      })
    );
    if (updatedChecklist) {
      writeThrough('update onboarding item', upsertOnboarding(updatedChecklist));
    }
  };
  const handleDeleteOnboarding = (id: string) => {
    setOnboardings((prev) => prev.filter((o) => o.id !== id));
    writeThrough('delete onboarding', deleteOnboardingRow(id));
  };

  // ── Underwrite (scenarios) handlers
  const handleSelectUwDeal = async (deal: Deal | null) => {
    setSelectedUwDealId(deal?.id ?? null);
    setScenarioAId(null);
    setScenarioBId(null);
    setEditingScenarioId(null);
    if (!deal || !SUPABASE_CONFIGURED) {
      setScenarios([]);
      return;
    }
    try {
      const rows = await listScenariosForDeal(deal.id);
      setScenarios(rows);
      // Default selection: A = first scenario, B = second (if it exists),
      // editing focus = A. Matches the way Lease-Calculator's store seeds
      // an initial A/B pair.
      if (rows[0]) {
        setScenarioAId(rows[0].id);
        setEditingScenarioId(rows[0].id);
      }
      if (rows[1]) setScenarioBId(rows[1].id);
    } catch (err) {
      console.error('Failed to load scenarios:', err);
      showToast('Failed to load scenarios');
    }
  };

  const buildScenarioFromDeal = (deal: Deal, namePref?: string): Scenario => {
    const today = new Date().toISOString().slice(0, 10);
    const leaseSF = deal.maxSF ?? deal.minSF ?? 100_000;
    const name =
      namePref ??
      (scenarios.some((s) => s.name === 'UW') ? `Scenario ${scenarios.length + 1}` : 'UW');
    const inputs: ScenarioInputs = {
      ...DEFAULT_INPUTS_BASE,
      name,
      dealCode: deal.dealId ?? '',
      projectSF: leaseSF,
      buildingSF: leaseSF,
      proposedLeaseSF: leaseSF,
      baseRatePSF: deal.targetRent ?? deal.lastRevalUWRent ?? DEFAULT_INPUTS_BASE.baseRatePSF,
      tiAllowancePSF: deal.tiPerSF ?? DEFAULT_INPUTS_BASE.tiAllowancePSF,
      freeRentMonths: deal.freeRentMonths ?? DEFAULT_INPUTS_BASE.freeRentMonths,
      leaseTermMonths: deal.proposedTermMonths ?? DEFAULT_INPUTS_BASE.leaseTermMonths,
      leaseCommencement: deal.expectedStart ?? today,
      leaseExecutionDate: today,
    };
    const globals = { ...DEFAULT_GLOBALS };
    return {
      id: crypto.randomUUID(),
      dealId: deal.id,
      name,
      inputs,
      globals,
      results: runScenario(inputs, globals),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  };

  const handleNewScenario = (deal: Deal) => {
    const newScenario = buildScenarioFromDeal(deal);
    setScenarios((prev) => [...prev, newScenario]);
    // Auto-assign to a vacant A or B slot so the new scenario is
    // immediately visible in the comparison.
    if (!scenarioAId) setScenarioAId(newScenario.id);
    else if (!scenarioBId) setScenarioBId(newScenario.id);
    setEditingScenarioId(newScenario.id);
    writeThrough('create scenario', upsertScenario(newScenario));
  };

  const handleDuplicateScenario = (id: string) => {
    const source = scenarios.find((s) => s.id === id);
    if (!source) return;
    const copy: Scenario = {
      ...source,
      id: crypto.randomUUID(),
      name: `${source.name} copy`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setScenarios((prev) => [...prev, copy]);
    if (!scenarioBId) setScenarioBId(copy.id);
    setEditingScenarioId(copy.id);
    writeThrough('duplicate scenario', upsertScenario(copy));
  };

  const handleSaveScenario = (updated: Scenario) => {
    setScenarios((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    writeThrough('save scenario', upsertScenario(updated));
  };

  const handleDeleteScenario = (id: string) => {
    setScenarios((prev) => {
      const next = prev.filter((s) => s.id !== id);
      const fallback = next[0]?.id ?? null;
      if (scenarioAId === id) setScenarioAId(fallback);
      if (scenarioBId === id) setScenarioBId(fallback);
      if (editingScenarioId === id) setEditingScenarioId(fallback);
      return next;
    });
    writeThrough('delete scenario', deleteScenarioRow(id));
  };

  const handleSaveDevProject = (updated: DevelopmentProject) => {
    setDevProjects((prev) => {
      const idx = prev.findIndex((p) => p.id === updated.id);
      if (idx === -1) return [...prev, updated];
      const next = prev.slice();
      next[idx] = updated;
      return next;
    });
    writeThrough('save dev project', upsertDevelopmentProject(updated));

    // One-shot geocode fallback: address present + no pin yet.
    // Drag-to-move on the map is the authoritative override after this.
    if (updated.address && updated.lat == null && updated.lng == null) {
      geocodeAddress(updated.address).then((coords) => {
        if (!coords) {
          showToast('Could not geocode address — drag the pin to place manually');
          return;
        }
        handleUpdateDevProjectCoords(updated.id, coords.lat, coords.lng);
      });
    }
  };

  const handleUpdateDevProjectCoords = (id: string, lat: number, lng: number) => {
    const now = new Date().toISOString();
    let saved: DevelopmentProject | null = null;
    setDevProjects((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const next = { ...p, lat, lng, updatedAt: now };
        saved = next;
        return next;
      })
    );
    if (saved) {
      writeThrough('place dev project pin', upsertDevelopmentProject(saved));
      showToast(
        `Pinned ${(saved as DevelopmentProject).projectName || 'dev project'} · ${lat.toFixed(4)}, ${lng.toFixed(4)}`
      );
    }
  };

  const handleDeleteDevProject = (id: string) => {
    setDevProjects((prev) => prev.filter((p) => p.id !== id));
    writeThrough('delete dev project', deleteDevProjectRow(id));
  };

  const handleSaveLeaseComp = (updated: LeaseComp) => {
    setLeaseComps((prev) => {
      const idx = prev.findIndex((c) => c.id === updated.id);
      if (idx === -1) return [...prev, updated];
      const next = prev.slice();
      next[idx] = updated;
      return next;
    });
    writeThrough('save comp', upsertLeaseComp(updated));
  };

  const handleDeleteLeaseComp = (id: string) => {
    setLeaseComps((prev) => prev.filter((c) => c.id !== id));
    writeThrough('delete comp', deleteLeaseCompRow(id));
  };

  const handleSaveSalesComp = (updated: SalesComp) => {
    setSalesComps((prev) => {
      const idx = prev.findIndex((c) => c.id === updated.id);
      if (idx === -1) return [...prev, updated];
      const next = prev.slice();
      next[idx] = updated;
      return next;
    });
    writeThrough('save sales comp', upsertSalesComp(updated));
  };

  const handleDeleteSalesComp = (id: string) => {
    setSalesComps((prev) => prev.filter((c) => c.id !== id));
    writeThrough('delete sales comp', deleteSalesCompRow(id));
  };

  const handleSavePropertyTaxAppeal = (updated: PropertyTaxAppeal) => {
    setPropertyTaxAppeals((prev) => {
      const idx = prev.findIndex((a) => a.id === updated.id);
      if (idx === -1) return [...prev, updated];
      const next = prev.slice();
      next[idx] = updated;
      return next;
    });
    writeThrough('save tax appeal', upsertPropertyTaxAppeal(updated));
  };

  const handleDeletePropertyTaxAppeal = (id: string) => {
    setPropertyTaxAppeals((prev) => prev.filter((a) => a.id !== id));
    writeThrough('delete tax appeal', deletePropertyTaxAppealRow(id));
  };

  const handleSaveAMPendingItem = (updated: AMPendingItem) => {
    setAMPendingItems((prev) => {
      const idx = prev.findIndex((i) => i.id === updated.id);
      if (idx === -1) return [...prev, updated];
      const next = prev.slice();
      next[idx] = updated;
      return next;
    });
    writeThrough('save AM item', upsertAMPendingItem(updated));
  };

  const handleDeleteAMPendingItem = (id: string) => {
    setAMPendingItems((prev) => prev.filter((i) => i.id !== id));
    writeThrough('delete AM item', deleteAMPendingItemRow(id));
  };

  const handleAMSendTo = (item: AMPendingItem, targetView: View) => {
    const updated: AMPendingItem = {
      ...item,
      sentToTab: targetView,
      updatedAt: new Date().toISOString(),
    };
    handleSaveAMPendingItem(updated);
    setView(targetView);
  };

  // ── CRM v1 handlers ─────────────────────────────────────────────
  const handleSaveContact = (updated: Contact) => {
    setContacts((prev) => {
      const idx = prev.findIndex((c) => c.id === updated.id);
      if (idx === -1) return [...prev, updated];
      const next = prev.slice();
      next[idx] = updated;
      return next;
    });
    writeThrough('save contact', upsertContact(updated));
  };

  const handleDeleteContact = (id: string) => {
    setContacts((prev) => prev.filter((c) => c.id !== id));
    // Cascade across all parent-link tables so no drawer renders a
    // dangling "unknown contact" stub.
    const dpLinksToRemove = devProjectContacts.filter((l) => l.contactId === id);
    const acqLinksToRemove = acquisitionTargetContacts.filter((l) => l.contactId === id);
    const dispoLinksToRemove = dispositionListingContacts.filter((l) => l.contactId === id);
    setDevProjectContacts((prev) => prev.filter((l) => l.contactId !== id));
    setAcquisitionTargetContacts((prev) => prev.filter((l) => l.contactId !== id));
    setDispositionListingContacts((prev) => prev.filter((l) => l.contactId !== id));
    writeThrough('delete contact', deleteContactRow(id));
    dpLinksToRemove.forEach((l) =>
      writeThrough('cascade unlink dev contact', deleteDevProjectContactRow(l.id))
    );
    acqLinksToRemove.forEach((l) =>
      writeThrough('cascade unlink acq contact', deleteAcquisitionTargetContactRow(l.id))
    );
    dispoLinksToRemove.forEach((l) =>
      writeThrough('cascade unlink dispo contact', deleteDispositionListingContactRow(l.id))
    );
  };

  const handleLinkDevProjectContact = (link: DevProjectContact) => {
    setDevProjectContacts((prev) => {
      const idx = prev.findIndex((l) => l.id === link.id);
      if (idx === -1) return [...prev, link];
      const next = prev.slice();
      next[idx] = link;
      return next;
    });
    writeThrough('link contact to dev project', upsertDevProjectContact(link));
  };

  const handleUnlinkDevProjectContact = (linkId: string) => {
    setDevProjectContacts((prev) => prev.filter((l) => l.id !== linkId));
    writeThrough('unlink contact', deleteDevProjectContactRow(linkId));
  };

  const handleSaveDevProjectNote = (note: DevProjectNote) => {
    setDevProjectNotes((prev) => {
      const idx = prev.findIndex((n) => n.id === note.id);
      if (idx === -1) return [...prev, note];
      const next = prev.slice();
      next[idx] = note;
      return next;
    });
    writeThrough('save dev note', upsertDevProjectNote(note));
  };

  const handleDeleteDevProjectNote = (id: string) => {
    setDevProjectNotes((prev) => prev.filter((n) => n.id !== id));
    writeThrough('delete dev note', deleteDevProjectNoteRow(id));
  };

  // ── Acquisitions ────────────────────────────────────────────────
  const handleSaveAcquisitionTarget = (updated: AcquisitionTarget) => {
    setAcquisitionTargets((prev) => {
      const idx = prev.findIndex((t) => t.id === updated.id);
      if (idx === -1) return [...prev, updated];
      const next = prev.slice();
      next[idx] = updated;
      return next;
    });
    writeThrough('save acquisition target', upsertAcquisitionTarget(updated));

    if (updated.address && updated.lat == null && updated.lng == null) {
      geocodeAddress(updated.address).then((coords) => {
        if (!coords) {
          showToast('Could not geocode address — drag the pin to place manually');
          return;
        }
        handleUpdateAcqTargetCoords(updated.id, coords.lat, coords.lng);
      });
    }
  };

  const handleUpdateAcqTargetCoords = (id: string, lat: number, lng: number) => {
    const now = new Date().toISOString();
    let saved: AcquisitionTarget | null = null;
    setAcquisitionTargets((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const next = { ...t, lat, lng, updatedAt: now };
        saved = next;
        return next;
      })
    );
    if (saved) {
      writeThrough('place acq target pin', upsertAcquisitionTarget(saved));
      showToast(
        `Pinned ${(saved as AcquisitionTarget).targetName || 'target'} · ${lat.toFixed(4)}, ${lng.toFixed(4)}`
      );
    }
  };

  const handleDeleteAcquisitionTarget = (id: string) => {
    setAcquisitionTargets((prev) => prev.filter((t) => t.id !== id));
    writeThrough('delete acquisition target', deleteAcquisitionTargetRow(id));
  };

  const handleLinkAcquisitionTargetContact = (link: AcquisitionTargetContact) => {
    setAcquisitionTargetContacts((prev) => {
      const idx = prev.findIndex((l) => l.id === link.id);
      if (idx === -1) return [...prev, link];
      const next = prev.slice();
      next[idx] = link;
      return next;
    });
    writeThrough('link contact to acquisition', upsertAcquisitionTargetContact(link));
  };

  const handleUnlinkAcquisitionTargetContact = (linkId: string) => {
    setAcquisitionTargetContacts((prev) => prev.filter((l) => l.id !== linkId));
    writeThrough('unlink acquisition contact', deleteAcquisitionTargetContactRow(linkId));
  };

  const handleSaveAcquisitionTargetNote = (note: AcquisitionTargetNote) => {
    setAcquisitionTargetNotes((prev) => {
      const idx = prev.findIndex((n) => n.id === note.id);
      if (idx === -1) return [...prev, note];
      const next = prev.slice();
      next[idx] = note;
      return next;
    });
    writeThrough('save acquisition note', upsertAcquisitionTargetNote(note));
  };

  const handleDeleteAcquisitionTargetNote = (id: string) => {
    setAcquisitionTargetNotes((prev) => prev.filter((n) => n.id !== id));
    writeThrough('delete acquisition note', deleteAcquisitionTargetNoteRow(id));
  };

  // ── Disposition ─────────────────────────────────────────────────
  const handleSaveDispositionListing = (updated: DispositionListing) => {
    setDispositionListings((prev) => {
      const idx = prev.findIndex((d) => d.id === updated.id);
      if (idx === -1) return [...prev, updated];
      const next = prev.slice();
      next[idx] = updated;
      return next;
    });
    writeThrough('save disposition listing', upsertDispositionListing(updated));

    if (updated.address && updated.lat == null && updated.lng == null) {
      geocodeAddress(updated.address).then((coords) => {
        if (!coords) {
          showToast('Could not geocode address — drag the pin to place manually');
          return;
        }
        handleUpdateDispoListingCoords(updated.id, coords.lat, coords.lng);
      });
    }
  };

  const handleUpdateDispoListingCoords = (id: string, lat: number, lng: number) => {
    const now = new Date().toISOString();
    let saved: DispositionListing | null = null;
    setDispositionListings((prev) =>
      prev.map((d) => {
        if (d.id !== id) return d;
        const next = { ...d, lat, lng, updatedAt: now };
        saved = next;
        return next;
      })
    );
    if (saved) {
      writeThrough('place dispo listing pin', upsertDispositionListing(saved));
      showToast(
        `Pinned ${(saved as DispositionListing).assetName || 'listing'} · ${lat.toFixed(4)}, ${lng.toFixed(4)}`
      );
    }
  };

  const handleDeleteDispositionListing = (id: string) => {
    setDispositionListings((prev) => prev.filter((d) => d.id !== id));
    writeThrough('delete disposition listing', deleteDispositionListingRow(id));
  };

  const handleLinkDispositionListingContact = (link: DispositionListingContact) => {
    setDispositionListingContacts((prev) => {
      const idx = prev.findIndex((l) => l.id === link.id);
      if (idx === -1) return [...prev, link];
      const next = prev.slice();
      next[idx] = link;
      return next;
    });
    writeThrough('link contact to disposition', upsertDispositionListingContact(link));
  };

  const handleUnlinkDispositionListingContact = (linkId: string) => {
    setDispositionListingContacts((prev) => prev.filter((l) => l.id !== linkId));
    writeThrough('unlink disposition contact', deleteDispositionListingContactRow(linkId));
  };

  const handleSaveDispositionListingNote = (note: DispositionListingNote) => {
    setDispositionListingNotes((prev) => {
      const idx = prev.findIndex((n) => n.id === note.id);
      if (idx === -1) return [...prev, note];
      const next = prev.slice();
      next[idx] = note;
      return next;
    });
    writeThrough('save disposition note', upsertDispositionListingNote(note));
  };

  const handleDeleteDispositionListingNote = (id: string) => {
    setDispositionListingNotes((prev) => prev.filter((n) => n.id !== id));
    writeThrough('delete disposition note', deleteDispositionListingNoteRow(id));
  };

  // Lookup: which rent roll rows already have an onboarding (so the
  // RentRollTable can hide the "+ Onboarding" button for them).
  const onboardingsByRentRollId = useMemo(
    () => new Set(onboardings.map((o) => o.rentRollId)),
    [onboardings]
  );

  // Find the matched Rent Roll row for a prospect being promoted
  const matchedRentRollRow = useMemo<RentRollRow | null>(() => {
    if (!promotingDeal?.spaceId) return null;
    return (
      rentRoll.find((r) => r.spaceId === promotingDeal.spaceId) ?? null
    );
  }, [promotingDeal, rentRoll]);

  const hasData = deals.length > 0 || rentRoll.length > 0 || onboardings.length > 0;
  const showsCounts = view === 'prospects' || view === 'rentroll';
  const currentCount =
    view === 'prospects' ? filteredDeals.length : view === 'rentroll' ? filteredRentRoll.length : 0;
  const totalCount =
    view === 'prospects' ? deals.length : view === 'rentroll' ? rentRoll.length : 0;
  const viewTitle =
    view === 'prospects'
      ? 'Leasing Activity'
      : view === 'rentroll'
        ? 'Portfolio'
        : view === 'underwrite'
          ? 'Lease Calculator'
          : view === 'comps'
            ? 'Comps Library'
            : view === 'contacts'
              ? 'Contacts'
              : view === 'map'
            ? 'Map'
            : view === 'onboarding'
              ? 'Onboarding'
              : view === 'acquisitions'
                ? 'Acquisitions Pipeline'
                : view === 'development'
                  ? 'Development Pipeline'
                  : view === 'asset-mgmt'
                    ? 'Asset Management — Pending Items'
                    : view === 'disposition'
                      ? 'Disposition Tracking'
                      : 'Reports';

  return (
    <div className="relative flex min-h-screen bg-bg text-fg pb-16 sm:pb-0">
      {/* Parce-style animated copper grid behind everything. z-0 keeps
          it under the sidebar (z-20) and main content (default stacking). */}
      <GridBackground />
      <Sidebar view={view} onChangeView={setView} onOpenSkills={() => setSkillsOpen(true)} />
      <SkillsModal open={skillsOpen} onClose={() => setSkillsOpen(false)} onDownloadSkillData={handleSkillDataDownload} />
      {/* Mobile bottom nav — visible only on narrow viewports where
          the desktop sidebar is hidden. pb-16 above leaves clearance
          so content doesn't sit under it. */}
      <MobileNav view={view} onChangeView={setView} onOpenSkills={() => setSkillsOpen(true)} />

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Header is OPAQUE (so scrolled content doesn't bleed through
            the title) but renders the SAME copper graph-paper grid as
            the page bg. background-attachment: fixed anchors the
            pattern to the VIEWPORT (not the header element), so the
            sidebar's 68px offset doesn't shift the grid out of phase
            with the page bg behind the main content. */}
        <header
          className="sticky top-0 z-10"
          style={{
            backgroundColor: 'var(--bg)',
            backgroundImage: `
              linear-gradient(rgba(184, 112, 64, 0.06) 1px, transparent 1px),
              linear-gradient(90deg, rgba(184, 112, 64, 0.06) 1px, transparent 1px)
            `,
            backgroundSize: '24px 24px',
            backgroundAttachment: 'fixed',
          }}
        >
          <div className="px-6 sm:px-10 lg:px-12 pt-8 pb-6">
            <div className="flex items-start justify-between gap-6 flex-wrap">
              <div className="min-w-0">
                <h1 className="text-[26px] sm:text-[30px] leading-[1.1] tracking-[-0.02em] text-fg font-semibold">
                  {viewTitle}
                </h1>
                <div className="mt-2 flex items-center gap-2 text-sm text-fg-muted flex-wrap">
                  {needsReconnect && fileHandle ? (
                    <button
                      onClick={handleReconnect}
                      className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-warning bg-warning/10 border border-warning/40 rounded-lg hover:bg-warning/15 transition-colors"
                    >
                      <CloudOff size={14} strokeWidth={1.75} />
                      Reconnect to {fileHandle.name}
                    </button>
                  ) : SUPABASE_CONFIGURED ? (
                    // Supabase is the source of truth — no file context
                    // matters anymore. Just show the count for views
                    // that have one; otherwise the header secondary
                    // line is blank.
                    showsCounts ? (
                      <span className="tabular-nums">
                        {currentCount} of {totalCount}
                      </span>
                    ) : null
                  ) : filename ? (
                    <>
                      <FileSpreadsheet size={14} strokeWidth={1.75} className="shrink-0 text-fg-subtle" />
                      <span className="font-medium text-fg">{filename}</span>
                      {fileHandle && (
                        <>
                          <span
                            title="Connected — saves go directly to this file"
                            className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400"
                          >
                            <Cloud size={13} strokeWidth={2} />
                            <span className="text-[11px] font-medium uppercase tracking-wide">Connected</span>
                          </span>
                          <button
                            onClick={handleDisconnect}
                            title="Disconnect from this file"
                            className="p-1 rounded-md text-fg-subtle hover:text-fg hover:bg-bg-hover transition-colors"
                            aria-label="Disconnect"
                          >
                            <Unlink size={12} strokeWidth={1.75} />
                          </button>
                        </>
                      )}
                      {showsCounts && (
                        <>
                          <span className="text-fg-subtle">·</span>
                          <span className="tabular-nums">
                            {currentCount} of {totalCount}
                          </span>
                        </>
                      )}
                    </>
                  ) : hasData ? (
                    <>
                      {showsCounts && (
                        <span className="tabular-nums font-medium text-fg">
                          {currentCount} of {totalCount}
                        </span>
                      )}
                      {showsCounts && <span className="text-fg-subtle">·</span>}
                      <span className="text-warning">Unsaved — click Save to export</span>
                    </>
                  ) : (
                    <span className="text-fg-subtle">Open a workbook to begin</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleOpenClick}
                  title={
                    fsAccessSupported
                      ? 'Pick a workbook — the app will save back to it in place'
                      : 'Open a workbook'
                  }
                  className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-fg bg-bg-elevated rounded-xl hover:bg-bg-hover transition-colors shadow-soft"
                >
                  <FolderOpen size={15} strokeWidth={1.75} />
                  Open
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleOpenFile}
                  className="hidden"
                />

                <button
                  onClick={handleSaveFile}
                  disabled={!hasData}
                  title={fileHandle ? 'Save in place' : 'Download workbook'}
                  className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-fg bg-bg-elevated rounded-xl hover:bg-bg-hover transition-colors shadow-soft disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-bg-elevated"
                >
                  {fileHandle ? (
                    <Cloud size={15} strokeWidth={1.75} />
                  ) : (
                    <Download size={15} strokeWidth={1.75} />
                  )}
                  Save
                </button>

                <button
                  onClick={handleShareLink}
                  disabled={!hasData}
                  title="Copy a shareable URL with the current data baked in"
                  className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-fg bg-bg-elevated rounded-xl hover:bg-bg-hover transition-colors shadow-soft disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-bg-elevated"
                >
                  <Link2 size={15} strokeWidth={1.75} />
                  Share
                </button>

                {showsCounts && (
                  <div className="flex items-center gap-2">
                    <ExcelToolbar
                      onExport={() => handleViewExport(view === 'prospects' ? 'prospects' : 'rentroll')}
                      onImport={(f) => handleViewImport(view === 'prospects' ? 'prospects' : 'rentroll', f)}
                      itemCount={view === 'prospects' ? deals.length : rentRoll.length}
                    />
                    <button
                      onClick={view === 'prospects' ? handleNewDeal : handleNewRow}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-accent-fg bg-accent rounded-xl hover:bg-accent-hover transition-colors shadow-soft"
                    >
                      <Plus size={15} strokeWidth={2.25} />
                      {view === 'prospects' ? 'New Deal' : 'New Row'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {sharedSnapshot && (
          <div className="w-full px-6 sm:px-10 lg:px-12 -mt-2 mb-4">
            <div className="flex items-center gap-3 px-4 py-3 bg-accent-tint border border-accent/20 rounded-xl">
              <Sparkles size={16} strokeWidth={2} className="text-accent shrink-0" />
              <div className="flex-1 text-sm">
                <span className="font-medium text-fg">Viewing a shared snapshot</span>
                <span className="text-fg-muted"> from {sharedSnapshot.filename} · shared {new Date(sharedSnapshot.sharedAt).toLocaleString()}</span>
              </div>
              <button
                onClick={() => setSharedSnapshot(null)}
                className="text-fg-muted hover:text-fg p-1 rounded-md transition-colors"
                aria-label="Dismiss"
              >
                <X size={14} strokeWidth={2} />
              </button>
            </div>
          </div>
        )}

        {appToast && (
          <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-fg text-bg rounded-xl shadow-lift text-sm font-medium">
            <Check size={15} strokeWidth={2.5} />
            {appToast}
          </div>
        )}

        <main className="flex-1 px-6 sm:px-10 lg:px-12 pb-12 w-full space-y-8">
          {view === 'reports' ? (
            <ReportsView deals={deals} rentRoll={rentRoll} />
          ) : view === 'underwrite' ? (
            <UnderwriteView
              deals={deals}
              scenarios={scenarios}
              selectedDealId={selectedUwDealId}
              aId={scenarioAId}
              bId={scenarioBId}
              editingId={editingScenarioId}
              onSelectDeal={handleSelectUwDeal}
              onSetA={setScenarioAId}
              onSetB={setScenarioBId}
              onSetEditing={setEditingScenarioId}
              onNewScenario={handleNewScenario}
              onDuplicateScenario={handleDuplicateScenario}
              onSaveScenario={handleSaveScenario}
              onDeleteScenario={handleDeleteScenario}
              onToast={showToast}
            />
          ) : view === 'comps' ? (
            <CompsView
              comps={leaseComps}
              onSave={handleSaveLeaseComp}
              onDelete={handleDeleteLeaseComp}
              salesComps={salesComps}
              onSaveSalesComp={handleSaveSalesComp}
              onDeleteSalesComp={handleDeleteSalesComp}
              onExcelExport={() => handleViewExport('comps')}
              onExcelImport={(f) => handleViewImport('comps', f)}
            />
          ) : view === 'contacts' ? (
            <ContactsView
              contacts={contacts}
              devProjectContactLinks={devProjectContacts}
              devProjects={devProjects}
              acquisitionTargetContactLinks={acquisitionTargetContacts}
              acquisitionTargets={acquisitionTargets}
              dispositionListingContactLinks={dispositionListingContacts}
              dispositionListings={dispositionListings}
              onSave={handleSaveContact}
              onDelete={handleDeleteContact}
              onExcelExport={() => handleViewExport('contacts')}
              onExcelImport={(f) => handleViewImport('contacts', f)}
            />
          ) : view === 'map' ? (
            <MapView
              deals={deals}
              devProjects={devProjects}
              acqTargets={acquisitionTargets}
              dispoListings={dispositionListings}
              onSelectDeal={(d) => setEditingDeal(d)}
              onSelectDevProject={(p) => setEditingDevProject(p)}
              onUpdateDevProjectCoords={handleUpdateDevProjectCoords}
              onSelectAcqTarget={(a) => setEditingAcqTarget(a)}
              onUpdateAcqTargetCoords={handleUpdateAcqTargetCoords}
              onSelectDispoListing={(d) => setEditingDispoListing(d)}
              onUpdateDispoListingCoords={handleUpdateDispoListingCoords}
              onToast={showToast}
              onUpdateProjectCoords={(projectId, lat, lng) => {
                // Project = group of deals sharing the same dealId.
                // Write lat/lng to every deal in the group so the
                // denormalized coordinate stays consistent and any
                // deal-level read still returns the right pin.
                const today = new Date().toISOString().slice(0, 10);
                const targets = deals.filter((d) => d.dealId?.trim() === projectId);
                if (targets.length === 0) return;
                const updates = targets.map<Deal>((t) => ({
                  ...t,
                  lat,
                  lng,
                  lastUpdated: today,
                }));
                const byId = new Map(updates.map((u) => [u.id, u] as const));
                setDeals((prev) => prev.map((d) => byId.get(d.id) ?? d));
                setFilteredDeals((prev) => prev.map((d) => byId.get(d.id) ?? d));
                updates.forEach((u) => writeThrough('place project pin', upsertDeal(u)));
                showToast(
                  `Pinned ${updates[0].dealName || 'project'} (${projectId}) · ${lat.toFixed(4)}, ${lng.toFixed(4)}` +
                    (updates.length > 1 ? ` · ${updates.length} deals updated` : '')
                );
              }}
            />
          ) : view === 'onboarding' ? (
            <OnboardingView
              onboardings={onboardings}
              rentRoll={rentRoll}
              onUpdateItem={handleUpdateOnboardingItem}
              onDelete={handleDeleteOnboarding}
              onExcelExport={() => handleViewExport('onboarding')}
              onExcelImport={(f) => handleViewImport('onboarding', f)}
            />
          ) : view === 'acquisitions' ? (
            <AcquisitionsView
              targets={acquisitionTargets}
              onSave={handleSaveAcquisitionTarget}
              onDelete={handleDeleteAcquisitionTarget}
              onUpdateTargetCoords={handleUpdateAcqTargetCoords}
              onToast={showToast}
              contacts={contacts}
              contactLinks={acquisitionTargetContacts}
              notes={acquisitionTargetNotes}
              onSaveContact={handleSaveContact}
              onLinkContact={handleLinkAcquisitionTargetContact}
              onUnlinkContact={handleUnlinkAcquisitionTargetContact}
              onSaveNote={handleSaveAcquisitionTargetNote}
              onDeleteNote={handleDeleteAcquisitionTargetNote}
              onExcelExport={() => handleViewExport('acquisitions')}
              onExcelImport={(f) => handleViewImport('acquisitions', f)}
            />
          ) : view === 'development' ? (
            <DevelopmentView
              projects={devProjects}
              onSave={handleSaveDevProject}
              onDelete={handleDeleteDevProject}
              onUpdateProjectCoords={handleUpdateDevProjectCoords}
              onToast={showToast}
              contacts={contacts}
              contactLinks={devProjectContacts}
              notes={devProjectNotes}
              onSaveContact={handleSaveContact}
              onLinkContact={handleLinkDevProjectContact}
              onUnlinkContact={handleUnlinkDevProjectContact}
              onSaveNote={handleSaveDevProjectNote}
              onDeleteNote={handleDeleteDevProjectNote}
              onExcelExport={() => handleViewExport('development')}
              onExcelImport={(f) => handleViewImport('development', f)}
            />
          ) : view === 'asset-mgmt' ? (
            <AssetMgmtView
              appeals={propertyTaxAppeals}
              onSaveAppeal={handleSavePropertyTaxAppeal}
              onDeleteAppeal={handleDeletePropertyTaxAppeal}
              amItems={amPendingItems}
              onSaveAMItem={handleSaveAMPendingItem}
              onDeleteAMItem={handleDeleteAMPendingItem}
              onSendTo={handleAMSendTo}
              onExcelExport={() => handleViewExport('asset-mgmt')}
              onExcelImport={(f) => handleViewImport('asset-mgmt', f)}
            />
          ) : view === 'disposition' ? (
            <DispositionView
              listings={dispositionListings}
              onSave={handleSaveDispositionListing}
              onDelete={handleDeleteDispositionListing}
              onUpdateListingCoords={handleUpdateDispoListingCoords}
              onToast={showToast}
              contacts={contacts}
              contactLinks={dispositionListingContacts}
              notes={dispositionListingNotes}
              onSaveContact={handleSaveContact}
              onLinkContact={handleLinkDispositionListingContact}
              onUnlinkContact={handleUnlinkDispositionListingContact}
              onSaveNote={handleSaveDispositionListingNote}
              onDeleteNote={handleDeleteDispositionListingNote}
              onExcelExport={() => handleViewExport('disposition')}
              onExcelImport={(f) => handleViewImport('disposition', f)}
            />
          ) : view === 'prospects' ? (
            deals.length === 0 ? (
              <EmptyHero onAction={handleNewDeal} ctaLabel="Create your first deal" />
            ) : (
              <>
                <SummaryStrip deals={filteredDeals} />
                <section className="space-y-4">
                  <FilterBar deals={deals} onFilterChange={setFilteredDeals} />
                  {filteredDeals.length === 0 ? (
                    <EmptyMatches />
                  ) : (
                    <DealTable
                      deals={filteredDeals}
                      onSelectDeal={handleSelectDeal}
                      onDeleteDeal={handleDeleteDeal}
                      onPromote={handleOpenPromote}
                    />
                  )}
                </section>
              </>
            )
          ) : rentRoll.length === 0 ? (
            <EmptyHero onAction={handleNewRow} ctaLabel="Add first row" />
          ) : (
            <>
              <RentRollSummary rows={filteredRentRoll} />
              <section className="space-y-4">
                <RentRollFilterBar rows={rentRoll} onFilterChange={setFilteredRentRoll} />
                {filteredRentRoll.length === 0 ? (
                  <EmptyMatches />
                ) : (
                  <RentRollTable
                    rows={filteredRentRoll}
                    prospectsBySpaceId={prospectsBySpaceId}
                    onboardingsByRentRollId={onboardingsByRentRollId}
                    onSelect={handleSelectRow}
                    onDelete={handleDeleteRow}
                    onStartProspect={handleStartProspect}
                    onStartOnboarding={handleStartOnboarding}
                  />
                )}
              </section>
            </>
          )}
        </main>
      </div>

      <DealDrawer
        deal={editingDeal}
        activities={activities}
        buildings={buildings}
        onClose={() => setEditingDeal(null)}
        onSave={handleSaveDeal}
        onDelete={handleDeleteDeal}
        onPromote={handleOpenPromote}
        onAddActivity={handleAddActivity}
        onDeleteActivity={handleDeleteActivity}
        onStatusChange={handleDealStatusChange}
        onToast={showToast}
      />
      <RentRollDrawer
        row={editingRow}
        activities={activities}
        buildings={buildings}
        onClose={() => setEditingRow(null)}
        onSave={handleSaveRow}
        onDelete={handleDeleteRow}
        onAddActivity={handleAddActivity}
        onDeleteActivity={handleDeleteActivity}
      />
      <PromoteDrawer
        deal={promotingDeal}
        existingRow={matchedRentRollRow}
        onClose={() => setPromotingDeal(null)}
        onConfirm={handleConfirmPromote}
      />
      {editingDevProject && (
        <DevelopmentProjectDrawer
          project={editingDevProject}
          onClose={() => setEditingDevProject(null)}
          onSave={handleSaveDevProject}
          onDelete={handleDeleteDevProject}
          allContacts={contacts}
          contactLinks={devProjectContacts}
          notes={devProjectNotes}
          onSaveContact={handleSaveContact}
          onLinkContact={handleLinkDevProjectContact}
          onUnlinkContact={handleUnlinkDevProjectContact}
          onSaveNote={handleSaveDevProjectNote}
          onDeleteNote={handleDeleteDevProjectNote}
        />
      )}
      {editingAcqTarget && (
        <AcquisitionTargetDrawer
          target={editingAcqTarget}
          onClose={() => setEditingAcqTarget(null)}
          onSave={handleSaveAcquisitionTarget}
          onDelete={handleDeleteAcquisitionTarget}
          allContacts={contacts}
          contactLinks={acquisitionTargetContacts}
          notes={acquisitionTargetNotes}
          onSaveContact={handleSaveContact}
          onLinkContact={handleLinkAcquisitionTargetContact}
          onUnlinkContact={handleUnlinkAcquisitionTargetContact}
          onSaveNote={handleSaveAcquisitionTargetNote}
          onDeleteNote={handleDeleteAcquisitionTargetNote}
        />
      )}
      {editingDispoListing && (
        <DispositionListingDrawer
          listing={editingDispoListing}
          onClose={() => setEditingDispoListing(null)}
          onSave={handleSaveDispositionListing}
          onDelete={handleDeleteDispositionListing}
          allContacts={contacts}
          contactLinks={dispositionListingContacts}
          notes={dispositionListingNotes}
          onSaveContact={handleSaveContact}
          onLinkContact={handleLinkDispositionListingContact}
          onUnlinkContact={handleUnlinkDispositionListingContact}
          onSaveNote={handleSaveDispositionListingNote}
          onDeleteNote={handleDeleteDispositionListingNote}
        />
      )}
    </div>
  );
}

function EmptyHero({ onAction, ctaLabel }: { onAction: () => void; ctaLabel: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-20 px-6">
      <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-accent-tint text-accent mb-6">
        <Sparkles size={24} strokeWidth={1.5} />
      </div>
      <h2 className="text-2xl sm:text-3xl text-fg font-semibold tracking-[-0.02em]">
        Your portfolio, beautifully tracked
      </h2>
      <p className="text-base text-fg-muted mt-3 max-w-md leading-relaxed">
        Open a saved Excel workbook to pick up where you left off, or start fresh — your
        data stays on your machine.
      </p>
      <button
        onClick={onAction}
        className="mt-7 inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-accent text-accent-fg rounded-xl hover:bg-accent-hover transition-colors shadow-soft"
      >
        <FilePlus size={16} strokeWidth={2} />
        {ctaLabel}
      </button>
    </div>
  );
}


function EmptyMatches() {
  return (
    <div className="text-center py-12 px-6 bg-bg-elevated rounded-2xl shadow-soft">
      <p className="text-base font-semibold text-fg tracking-tight">No matches</p>
      <p className="text-sm text-fg-muted mt-1">
        Try clearing some filters or broadening your search.
      </p>
    </div>
  );
}

export default App;

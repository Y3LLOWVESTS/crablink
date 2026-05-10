/**
 * RO:WHAT — Shared local draft state hook for CrabLink creator workspaces.
 * RO:WHY — CrabLink refactor; keeps local builder/developer pages props-driven instead of using module-level state bridges.
 * RO:INTERACTS — route-local draft models, CreatorWorkspaceLayout, DraftStatsPanel, ManifestPreviewPanel.
 * RO:INVARIANTS — local UI state only; no backend truth; no CID creation; no wallet or ROC mutation.
 * RO:METRICS — none.
 * RO:CONFIG — caller supplies initial draft, manifest builder, stats builder, completeness function.
 * RO:SECURITY — no persistence, no secrets, no backend calls, no spend authority.
 * RO:TEST — used by crab://lyrics; npm run build; scripts/check-react-lane.sh.
 */

import { useMemo, useState } from 'react';

export default function useCreatorDraft({
  initialDraft,
  initialViewMode = 'builder',
  buildManifest,
  buildStats,
  getCompleteness,
}) {
  const [draft, setDraft] = useState(() => cloneDraft(initialDraft));
  const [viewMode, setViewMode] = useState(initialViewMode);

  const stats = useMemo(() => {
    if (typeof buildStats !== 'function') {
      return {};
    }

    return buildStats(draft);
  }, [buildStats, draft]);

  const manifest = useMemo(() => {
    if (typeof buildManifest !== 'function') {
      return {};
    }

    return buildManifest(draft);
  }, [buildManifest, draft]);

  const manifestJson = useMemo(() => {
    try {
      return JSON.stringify(manifest, null, 2);
    } catch (_error) {
      return String(manifest ?? '');
    }
  }, [manifest]);

  const completeness = useMemo(() => {
    if (typeof getCompleteness !== 'function') {
      return 0;
    }

    const value = Number(getCompleteness(draft));
    if (!Number.isFinite(value)) {
      return 0;
    }

    return Math.max(0, Math.min(100, Math.round(value)));
  }, [draft, getCompleteness]);

  function updateDraft(key, value) {
    setDraft((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function replaceDraft(nextDraft) {
    setDraft(cloneDraft(nextDraft));
  }

  function clearDraft() {
    setDraft(cloneDraft(initialDraft));
    setViewMode(initialViewMode);
  }

  return {
    draft,
    setDraft,
    updateDraft,
    replaceDraft,
    clearDraft,
    viewMode,
    setViewMode,
    stats,
    manifest,
    manifestJson,
    completeness,
  };
}

function cloneDraft(draft) {
  return {
    ...(draft || {}),
  };
}
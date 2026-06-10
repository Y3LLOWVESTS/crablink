/**
 * RO:WHAT — Make page timeline, linked-media, and audio-lane mutation controller.
 * RO:WHY — App Integration; Concerns: DX/SEC/RES; keeps MakePage focused on route orchestration instead of timeline/audio mutation details.
 * RO:INTERACTS — MakePage.jsx, MakePreviewStudioChrome.jsx, MakeTimelineCard.jsx, makeTimelineModel.js, makeAudioTimelineStateModel.js, makeLinkedMediaModel.js.
 * RO:INVARIANTS — local draft/editor state only; no fake CIDs; no fake receipts; no wallet/ledger mutation; linked media remains reference-only until backend rights/payout policy exists.
 * RO:METRICS — none.
 * RO:CONFIG — local timeline history, clip reorder/split/delete, linked media drafts, and local audio-lane drafts.
 * RO:SECURITY — no private keys, capabilities, balances, receipts, backend truth, or spend authority.
 * RO:TEST — npm run build; manual crab://make add/split/delete/undo/redo/local-audio/linked-media smoke.
 */

import { useCallback, useRef, useState } from 'react';

import {
  createTimelineItemKeys,
  idFromTimelineItemKey,
  isLinkedVideoTimelineItemKey,
  isLocalTimelineItemKey,
  normalizeTimelineItemOrderKeys,
} from './makePageConstants.js';
import {
  cloneTimelineSegmentClip,
  makeTimelineClipArraySignature,
  makeTimelineSegmentId,
  snapshotTimelineClips,
} from './makeTimelineClipStateModel.js';
import {
  createClipFromLocalFile,
  getClipTrimEndMs,
  getClipTrimStartMs,
  normalizeMakeClip,
  updateClipTimeline,
} from './makeTimelineModel.js';
import {
  createLinkedAudioDraft,
  createLinkedVideoDraft,
  createLocalAudioTrackFromFile,
  revokeMakeAudioTrackUrl,
  updateLinkedVideoRange,
} from './makeLinkedMediaModel.js';
import {
  makeAudioTrackArraySignature,
  normalizeMakeTimelineHistorySnapshot,
  resolveAudioTrackOverlapBySlotSwap,
  snapshotAudioTracks,
  snapshotMakeTimelineState,
} from './makeAudioTimelineStateModel.js';
import { probeLocalAudioDurationMs } from './makeAudioProbe.js';
import { errorMessage } from './makeRuntimeMediaModel.js';
import { buildClipName, createId, revokeClipUrls } from './makeLocalFileModel.js';
import { clamp, createSequenceReviewState, snapTimelineFrameMs } from './makeSequenceModel.js';

function getAudioTrackLayoutDurationMs(track) {
  const rawDurationMs = Math.max(0, Number(track?.durationMs || 0));
  const trimStartMs = Math.max(0, Number(track?.trimStartMs || 0));
  const trimEndMs = Math.max(trimStartMs, Number(track?.trimEndMs || rawDurationMs || 1000));

  return Math.max(
    500,
    Number(track?.effectiveDurationMs || 0) ||
      (trimEndMs - trimStartMs) ||
      rawDurationMs ||
      1000,
  );
}

export default function useMakePageTimelineController({
  addClipInputRef,
  app,
  audioTrackInputRef,
  audioTrackObjectUrlsRef,
  audioTracks,
  audioTracksRef,
  clips,
  clipsRef,
  draft,
  isRecording,
  linkedVideoDrafts,
  linkedVideoPreviewObjectUrlsRef,
  selectedClip,
  selectedClipId,
  sequencePlaybackClips,
  setAudioTracks,
  setClips,
  setLinkedVideoDrafts,
  setSelectedClipId,
  setSequenceState,
  setTimelineItemOrder,
  totalTimelineDurationMs,
}) {
  const timelineHistoryRef = useRef({ undo: [], redo: [] });
  const [timelineHistoryState, setTimelineHistoryState] = useState({ undoCount: 0, redoCount: 0 });

  const removeClip = useCallback((clipId) => {
    setClips((current) => {
      const clip = current.find((item) => item.id === clipId);
      revokeClipUrls(clip ? [clip] : []);

      if (clipId === selectedClipId) {
        setSelectedClipId('');
      }

      return current.filter((item) => item.id !== clipId);
    });
  }, [selectedClipId]);

  const retakeLastClip = useCallback(() => {
    setClips((current) => {
      const next = [...current];
      const clip = next.pop();

      if (clip) {
        revokeClipUrls([clip]);
      }

      setSelectedClipId(next[next.length - 1]?.id || '');
      return next;
    });
  }, []);

  const clearClips = useCallback(() => {
    revokeClipUrls(clips);
    timelineHistoryRef.current = { undo: [], redo: [] };
    setTimelineHistoryState({ undoCount: 0, redoCount: 0 });
    setClips([]);
    setSelectedClipId('');
    setSequenceState(createSequenceReviewState('idle'));
  }, [sequencePlaybackClips]);

  const refreshTimelineHistoryState = useCallback(() => {
    const history = timelineHistoryRef.current;
    setTimelineHistoryState({
      undoCount: history.undo.length,
      redoCount: history.redo.length,
    });
  }, []);

  const currentTimelineHistorySnapshot = useCallback(() => snapshotMakeTimelineState({
    clips: clipsRef.current,
    audioTracks: audioTracksRef.current,
    selectedClipId,
  }), [selectedClipId]);

  const pushTimelineHistorySnapshot = useCallback((snapshot) => {
    const history = timelineHistoryRef.current;
    history.undo = [...history.undo, snapshot].slice(-40);
    history.redo = [];
    refreshTimelineHistoryState();
  }, [refreshTimelineHistoryState]);

  const captureTimelineHistory = useCallback(() => {
    const snapshot = currentTimelineHistorySnapshot();

    if (!snapshot.clips.length && !snapshot.audioTracks.length) {
      return;
    }

    pushTimelineHistorySnapshot(snapshot);
  }, [currentTimelineHistorySnapshot, pushTimelineHistorySnapshot]);

  const commitTimelineClips = useCallback((updater, options = {}) => {
    const before = currentTimelineHistorySnapshot();
    const beforeClips = snapshotTimelineClips(before.clips);
    const nextRaw = typeof updater === 'function' ? updater(beforeClips) : updater;
    const next = snapshotTimelineClips(nextRaw);

    if (makeTimelineClipArraySignature(beforeClips) === makeTimelineClipArraySignature(next)) {
      return false;
    }

    if (options.history !== false) {
      pushTimelineHistorySnapshot(before);
    }

    setClips(next);

    if (options.selectClipId !== undefined) {
      setSelectedClipId(options.selectClipId || next[next.length - 1]?.id || '');
    }

    return true;
  }, [currentTimelineHistorySnapshot, pushTimelineHistorySnapshot]);

  const commitAudioTracks = useCallback((updater, options = {}) => {
    const before = currentTimelineHistorySnapshot();
    const beforeAudio = snapshotAudioTracks(before.audioTracks);
    const nextRaw = typeof updater === 'function' ? updater(beforeAudio) : updater;
    const next = snapshotAudioTracks(nextRaw);

    if (makeAudioTrackArraySignature(beforeAudio) === makeAudioTrackArraySignature(next)) {
      return false;
    }

    if (options.history !== false) {
      pushTimelineHistorySnapshot(options.historySnapshot || before);
    }

    setAudioTracks(next);
    setSequenceState(createSequenceReviewState('idle'));
    return true;
  }, [currentTimelineHistorySnapshot, pushTimelineHistorySnapshot]);

  const commitTimelineItemOrder = useCallback((nextKeys = [], options = {}) => {
    const localClips = snapshotTimelineClips(clipsRef.current);
    const linkedDrafts = linkedVideoDrafts || [];
    const validKeys = createTimelineItemKeys(localClips, linkedDrafts);
    const nextOrder = normalizeTimelineItemOrderKeys(nextKeys, validKeys);

    setTimelineItemOrder(nextOrder);

    const localById = new Map(localClips.map((clip) => [clip.id, clip]));
    const linkedById = new Map(linkedDrafts.map((item) => [item.id, item]));

    const nextLocal = [];
    const nextLinked = [];
    const usedLocal = new Set();
    const usedLinked = new Set();

    for (const key of nextOrder) {
      if (isLocalTimelineItemKey(key)) {
        const id = idFromTimelineItemKey(key);
        const clip = localById.get(id);

        if (clip) {
          nextLocal.push(clip);
          usedLocal.add(id);
        }

        continue;
      }

      if (isLinkedVideoTimelineItemKey(key)) {
        const id = idFromTimelineItemKey(key);
        const item = linkedById.get(id);

        if (item) {
          nextLinked.push(item);
          usedLinked.add(id);
        }
      }
    }

    for (const clip of localClips) {
      if (!usedLocal.has(clip.id)) {
        nextLocal.push(clip);
      }
    }

    for (const item of linkedDrafts) {
      if (!usedLinked.has(item.id)) {
        nextLinked.push(item);
      }
    }

    if (makeTimelineClipArraySignature(localClips) !== makeTimelineClipArraySignature(nextLocal)) {
      commitTimelineClips(nextLocal, {
        selectClipId: options.selectClipId !== undefined ? options.selectClipId : selectedClipId,
      });
    }

    const linkedBefore = linkedDrafts.map((item) => item.id).join('|');
    const linkedAfter = nextLinked.map((item) => item.id).join('|');

    if (linkedBefore !== linkedAfter) {
      setLinkedVideoDrafts(nextLinked);
    }

    setSequenceState(createSequenceReviewState('idle'));
    return true;
  }, [commitTimelineClips, linkedVideoDrafts, selectedClipId]);

  const applyTimelineHistorySnapshot = useCallback((snapshot) => {
    const safeSnapshot = normalizeMakeTimelineHistorySnapshot(snapshot, audioTracksRef.current);
    const safeClips = snapshotTimelineClips(safeSnapshot.clips);
    const safeAudioTracks = snapshotAudioTracks(safeSnapshot.audioTracks);

    setClips(safeClips);
    setAudioTracks(safeAudioTracks);
    setSelectedClipId((current) => {
      if (safeSnapshot.selectedClipId && safeClips.some((clip) => clip.id === safeSnapshot.selectedClipId)) {
        return safeSnapshot.selectedClipId;
      }

      return safeClips.some((clip) => clip.id === current)
        ? current
        : safeClips[safeClips.length - 1]?.id || '';
    });
    setSequenceState(createSequenceReviewState(safeClips.length ? 'draft' : 'idle'));
  }, []);

  const undoTimeline = useCallback(() => {
    const history = timelineHistoryRef.current;
    const previous = history.undo.pop();

    if (!previous) {
      refreshTimelineHistoryState();
      return;
    }

    history.redo = [...history.redo, currentTimelineHistorySnapshot()].slice(-40);
    refreshTimelineHistoryState();
    applyTimelineHistorySnapshot(previous);
  }, [applyTimelineHistorySnapshot, currentTimelineHistorySnapshot, refreshTimelineHistoryState]);

  const redoTimeline = useCallback(() => {
    const history = timelineHistoryRef.current;
    const next = history.redo.pop();

    if (!next) {
      refreshTimelineHistoryState();
      return;
    }

    history.undo = [...history.undo, currentTimelineHistorySnapshot()].slice(-40);
    refreshTimelineHistoryState();
    applyTimelineHistorySnapshot(next);
  }, [applyTimelineHistorySnapshot, currentTimelineHistorySnapshot, refreshTimelineHistoryState]);

  const splitTimelineAt = useCallback((selection) => {
    const clipId = selection?.clipId || '';
    const clip = clipsRef.current.find((item) => item.id === clipId);

    if (!clip) {
      return;
    }

    const trimStartMs = getClipTrimStartMs(clip);
    const trimEndMs = getClipTrimEndMs(clip);
    const splitMs = clamp(
      snapTimelineFrameMs(Number(selection?.atMs ?? selection?.focusMs ?? trimStartMs)),
      trimStartMs,
      trimEndMs,
      trimStartMs,
    );
    const minClipMs = 350;

    if (splitMs - trimStartMs < minClipMs || trimEndMs - splitMs < minClipMs) {
      app?.notify?.({
        tone: 'warning',
        title: 'Split needs more room',
        message: 'Choose a point with at least a small usable segment on both sides.',
      });
      return;
    }

    const rightClipId = makeTimelineSegmentId(clip.id, 'split');
    const changed = commitTimelineClips((current) => current.flatMap((item) => {
      if (item.id !== clip.id) {
        return [item];
      }

      const left = updateClipTimeline(item, { trimEndMs: splitMs });
      const right = cloneTimelineSegmentClip(item, {
        id: rightClipId,
        trimStartMs: splitMs,
        trimEndMs,
        segmentLabel: 'split',
      });

      return [left, right];
    }), { selectClipId: rightClipId });

    if (changed) {
      app?.notify?.({
        tone: 'success',
        title: 'Clip split',
        message: 'The selected local clip was split into two timeline segments.',
      });
    }
  }, [app, commitTimelineClips]);

  const deleteTimelineRange = useCallback((selection) => {
    const clipId = selection?.clipId || '';
    const clip = clipsRef.current.find((item) => item.id === clipId);

    if (!clip) {
      return;
    }

    const clipStartMs = getClipTrimStartMs(clip);
    const clipEndMs = getClipTrimEndMs(clip);
    const rawStartMs = snapTimelineFrameMs(Number(selection?.startMs ?? clipStartMs));
    const rawEndMs = snapTimelineFrameMs(Number(selection?.endMs ?? rawStartMs));
    const startMs = clamp(Math.min(rawStartMs, rawEndMs), clipStartMs, clipEndMs, clipStartMs);
    const endMs = clamp(Math.max(rawStartMs, rawEndMs), clipStartMs, clipEndMs, clipEndMs);
    const minClipMs = 350;

    if (endMs - startMs < 80) {
      app?.notify?.({
        tone: 'warning',
        title: 'Select more timeline',
        message: 'Drag across the clip to highlight a range before deleting.',
      });
      return;
    }

    const keepLeft = startMs - clipStartMs >= minClipMs;
    const keepRight = clipEndMs - endMs >= minClipMs;
    const currentIndex = clipsRef.current.findIndex((item) => item.id === clip.id);
    const fallbackClip = clipsRef.current[currentIndex + 1] || clipsRef.current[currentIndex - 1] || null;
    const rightClipId = makeTimelineSegmentId(clip.id, 'kept');
    const nextSelectedClipId = keepLeft && keepRight
      ? rightClipId
      : keepLeft || keepRight
        ? clip.id
        : fallbackClip?.id || '';

    const changed = commitTimelineClips((current) => current.flatMap((item) => {
      if (item.id !== clip.id) {
        return [item];
      }

      if (keepLeft && keepRight) {
        return [
          updateClipTimeline(item, { trimEndMs: startMs }),
          cloneTimelineSegmentClip(item, {
            id: rightClipId,
            trimStartMs: endMs,
            trimEndMs: clipEndMs,
            segmentLabel: 'kept',
          }),
        ];
      }

      if (keepLeft) {
        return [updateClipTimeline(item, { trimEndMs: startMs })];
      }

      if (keepRight) {
        return [updateClipTimeline(item, { trimStartMs: endMs, trimEndMs: clipEndMs })];
      }

      return [];
    }), { selectClipId: nextSelectedClipId });

    if (changed) {
      app?.notify?.({
        tone: 'success',
        title: 'Timeline range deleted',
        message: 'The highlighted local timeline range was removed.',
      });
    }
  }, [app, commitTimelineClips]);

  const updateSelectedClipTimeline = useCallback((patch) => {
    if (!selectedClip) {
      return;
    }

    commitTimelineClips((current) => current.map((clip) => (
      clip.id === selectedClip.id ? updateClipTimeline(clip, patch) : clip
    )), { selectClipId: selectedClip.id });
  }, [commitTimelineClips, selectedClip]);

  const updateClipTimelineById = useCallback((clipId, patch) => {
    if (!clipId) {
      return;
    }

    setClips((current) => current.map((clip) => (clip.id === clipId ? updateClipTimeline(clip, patch) : clip)));
  }, []);

  const moveSelectedClip = useCallback((direction) => {
    if (!selectedClip) {
      return;
    }

    commitTimelineClips((current) => {
      const index = current.findIndex((clip) => clip.id === selectedClip.id);
      const nextIndex = index + direction;

      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) {
        return current;
      }

      const next = [...current];
      const [clip] = next.splice(index, 1);
      next.splice(nextIndex, 0, clip);
      return next;
    }, { selectClipId: selectedClip.id });
  }, [commitTimelineClips, selectedClip]);

  const requestAddTimelineClip = useCallback(() => {
    if (isRecording) {
      return;
    }

    addClipInputRef.current?.click?.();
  }, [isRecording]);

  const addTimelineClipsFromFiles = useCallback(async (event) => {
    const files = Array.from(event.target.files || []).filter(Boolean);
    event.target.value = '';

    if (!files.length || isRecording) {
      return;
    }

    const importedClips = [];

    try {
      const baseIndex = clipsRef.current.length;

      for (const [index, file] of files.entries()) {
        const clip = await createClipFromLocalFile(file, {
          id: createId('make-clip'),
          fallbackName: buildClipName({
            draft,
            index: baseIndex + index + 1,
            mimeType: file.type || 'video/webm',
          }),
        });

        importedClips.push(normalizeMakeClip({
          ...clip,
          sourceMode: 'timeline_import',
          importedAt: new Date().toISOString(),
        }));
      }

      if (!importedClips.length) {
        return;
      }

      commitTimelineClips((current) => [
        ...current,
        ...importedClips,
      ], { selectClipId: importedClips[0].id });

      setSelectedClipId(importedClips[0].id);
      setSequenceState(createSequenceReviewState('idle'));

      app?.notify?.({
        tone: 'success',
        title: importedClips.length === 1 ? 'Video added' : 'Videos added',
        message: importedClips.length === 1
          ? 'The selected local video was added to the Make timeline.'
          : `${importedClips.length} local videos were added to the Make timeline.`,
      });
    } catch (error) {
      revokeClipUrls(importedClips);

      app?.notify?.({
        tone: 'danger',
        title: 'Could not add video',
        message: errorMessage(error),
      });
    }
  }, [app, commitTimelineClips, draft, isRecording]);

  const addLinkedVideoDraft = useCallback((rawUrl, timing = {}) => {
    try {
      const linkedVideo = createLinkedVideoDraft(rawUrl, {
        id: createId('make-linked-video'),
        sourceStartText: timing.sourceStartText,
        sourceEndText: timing.sourceEndText,
        useEntireSource: timing.useEntireSource,
      });

      setLinkedVideoDrafts((current) => [...current, linkedVideo].slice(-12));
      setSequenceState(createSequenceReviewState('idle'));

      app?.notify?.({
        tone: 'info',
        title: 'Linked video inserted',
        message: `${linkedVideo.rangeLabel || 'Source window saved'} was stored as an unverified Make draft reference. Rights, payout, and export inclusion remain backend work.`,
      });

      return linkedVideo;
    } catch (error) {
      app?.notify?.({
        tone: 'warning',
        title: 'Video link not saved',
        message: errorMessage(error),
      });
      return false;
    }
  }, [app, audioTracks]);

  const removeLinkedVideoDraft = useCallback((draftId) => {
    const previewUrl = linkedVideoPreviewObjectUrlsRef.current.get(draftId);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      linkedVideoPreviewObjectUrlsRef.current.delete(draftId);
    }

    setLinkedVideoDrafts((current) => current.filter((item) => item.id !== draftId));
  }, []);

  const updateLinkedVideoDraftTiming = useCallback((draftId, patch = {}) => {
    if (!draftId) return;

    setLinkedVideoDrafts((current) =>
      current.map((item) =>
        item.id === draftId
          ? updateLinkedVideoRange(item, patch)
          : item,
      ),
    );

    setSequenceState(createSequenceReviewState('idle'));
  }, []);

  const handleLinkedVideoPreviewReady = useCallback((draftId, preview = {}) => {
    if (!draftId || !preview?.blob) return;

    const previousUrl = linkedVideoPreviewObjectUrlsRef.current.get(draftId);
    if (previousUrl) {
      URL.revokeObjectURL(previousUrl);
    }

    const objectUrl = URL.createObjectURL(preview.blob);
    linkedVideoPreviewObjectUrlsRef.current.set(draftId, objectUrl);

    setLinkedVideoDrafts((current) =>
      current.map((item) =>
        item.id === draftId
          ? {
              ...item,
              previewObjectUrl: objectUrl,
              objectUrl,
              mimeType: preview.blob?.type || item.mimeType || 'video/mp4',
              previewStatus: 'ready',
              previewProxyOnly: true,
              canPreviewLocally: true,
              previewLoadedAt: new Date().toISOString(),
              previewRoute: preview.source?.route || item.previewRoute || '',
              previewReceiptHash:
                preview.payment?.receipt_hash ||
                preview.payment?.receiptHash ||
                item.previewReceiptHash ||
                '',
              previewPaymentId:
                preview.payment?.payment_id ||
                preview.payment?.paymentId ||
                preview.payment?.id ||
                item.previewPaymentId ||
                '',
              rightsStatus: item.rightsStatus === 'reuse_verified' ? item.rightsStatus : 'view_preview_paid',
              rightsStatusLabel: 'Preview paid',
              updatedAt: new Date().toISOString(),
            }
          : item,
      ),
    );

    setSequenceState(createSequenceReviewState('idle'));
  }, []);

  const requestAddAudioTrack = useCallback(() => {
    if (isRecording) {
      return;
    }

    audioTrackInputRef.current?.click?.();
  }, [isRecording]);

  const addAudioTracksFromFiles = useCallback(async (event) => {
    const files = Array.from(event.target.files || []).filter(Boolean);
    event.target.value = '';

    if (!files.length || isRecording) {
      return;
    }

    const importedTracks = [];
    const existingAudioEndMs = audioTracks.reduce((max, track) => {
      const startMs = Math.max(0, Number(track?.offsetMs || 0));
      const rawDurationMs = Math.max(0, Number(track?.durationMs || 0));
      const trimStartMs = Math.max(0, Number(track?.trimStartMs || 0));
      const trimEndMs = Math.max(trimStartMs, Number(track?.trimEndMs || rawDurationMs || 1000));
      const effectiveMs = Math.max(500, Number(track?.effectiveDurationMs || 0) || (trimEndMs - trimStartMs) || rawDurationMs || 1000);

      return Math.max(max, startMs + effectiveMs);
    }, 0);
    let nextAudioOffsetMs = existingAudioEndMs;

    try {
      for (const [index, file] of files.entries()) {
        const track = await createLocalAudioTrackFromFile(file, {
          id: createId('make-audio-track'),
          fallbackName: `Audio ${audioTracks.length + index + 1}`,
        });

        const probedDurationMs = await probeLocalAudioDurationMs(track.objectUrl);
        const audioStartMs = Math.max(0, nextAudioOffsetMs);
        const audioDurationMs = Math.max(1000, Number(track.durationMs || 0), probedDurationMs);
        const audioTrimStartMs = Math.max(0, Number(track.trimStartMs || 0));
        const audioTrimEndMs = Math.max(audioTrimStartMs + 500, Number(track.trimEndMs || audioDurationMs || 1000));
        const audioEffectiveMs = Math.max(500, Math.min(audioDurationMs || audioTrimEndMs, audioTrimEndMs) - audioTrimStartMs || audioDurationMs || 1000);

        track.durationMs = audioDurationMs;
        track.offsetMs = audioStartMs;
        track.trimStartMs = audioTrimStartMs;
        track.trimEndMs = Math.min(audioDurationMs || audioTrimEndMs, audioTrimEndMs);
        track.effectiveDurationMs = audioEffectiveMs;
        nextAudioOffsetMs += audioEffectiveMs;

        if (track.objectUrl) {
          audioTrackObjectUrlsRef.current.add(track.objectUrl);
        }

        importedTracks.push(track);
      }

      if (!importedTracks.length) {
        return;
      }

      commitAudioTracks((current) => [...current, ...importedTracks], {
        selectAudioTrackId: importedTracks[importedTracks.length - 1]?.id || '',
      });

      app?.notify?.({
        tone: 'success',
        title: importedTracks.length === 1 ? 'Audio added' : 'Audio tracks added',
        message: importedTracks.length === 1
          ? 'The local audio file was added to the Make audio lane and will be mixed into export by Rust/FFmpeg.'
          : `${importedTracks.length} local audio files were added to the Make audio lane for Rust/FFmpeg export mixing.`,
      });
    } catch (error) {
      for (const track of importedTracks) {
        if (track.objectUrl) {
          audioTrackObjectUrlsRef.current.delete(track.objectUrl);
        }
        revokeMakeAudioTrackUrl(track);
      }

      app?.notify?.({
        tone: 'danger',
        title: 'Could not add audio',
        message: errorMessage(error),
      });
    }
  }, [app, audioTracks, commitAudioTracks, isRecording]);

  const addLinkedAudioDraft = useCallback((rawUrl) => {
    try {
      const linkedAudioOffsetMs = audioTracks.reduce((max, track) => {
        const startMs = Math.max(0, Number(track?.offsetMs || 0));
        const rawDurationMs = Math.max(0, Number(track?.durationMs || 0));
        const trimStartMs = Math.max(0, Number(track?.trimStartMs || 0));
        const trimEndMs = Math.max(trimStartMs, Number(track?.trimEndMs || rawDurationMs || 15_000));
        const effectiveMs = Math.max(500, Number(track?.effectiveDurationMs || 0) || (trimEndMs - trimStartMs) || rawDurationMs || 15_000);

        return Math.max(max, startMs + effectiveMs);
      }, 0);
      const linkedAudio = createLinkedAudioDraft(rawUrl, {
        id: createId('make-audio-link'),
      });

      linkedAudio.offsetMs = linkedAudioOffsetMs;
      linkedAudio.durationMs = Math.max(15_000, Number(linkedAudio.durationMs || 0));
      linkedAudio.trimStartMs = 0;
      linkedAudio.trimEndMs = linkedAudio.durationMs;
      linkedAudio.effectiveDurationMs = linkedAudio.durationMs;

      commitAudioTracks((current) => [...current, linkedAudio].slice(-16), {
        selectAudioTrackId: linkedAudio.id,
      });

      app?.notify?.({
        tone: 'info',
        title: 'Linked audio saved',
        message: 'The audio link was stored as an unverified Make draft reference. Rights, playback, and payout checks remain later backend work.',
      });

      return true;
    } catch (error) {
      app?.notify?.({
        tone: 'warning',
        title: 'Audio link not saved',
        message: errorMessage(error),
      });
      return false;
    }
  }, [app, audioTracks, commitAudioTracks]);

  const removeAudioTrack = useCallback((trackId) => {
    commitAudioTracks((current) => {
      const target = current.find((track) => track.id === trackId);

      if (target?.objectUrl) {
        audioTrackObjectUrlsRef.current.delete(target.objectUrl);
      }

      revokeMakeAudioTrackUrl(target);
      return current.filter((track) => track.id !== trackId);
    });
  }, [commitAudioTracks]);

  const updateAudioTrackVolume = useCallback((trackId, volumePct, options = {}) => {
    commitAudioTracks((current) => current.map((track) => (
      track.id === trackId
        ? {
            ...track,
            volumePct: clamp(Number(volumePct), 0, 150, 100),
          }
        : track
    )), {
      history: options.history !== false,
    });
  }, [commitAudioTracks]);

  const updateAudioTrackTiming = useCallback((trackId, patch = {}, options = {}) => {
    const historySnapshot = Array.isArray(options.beforeAudioTracks)
      ? snapshotMakeTimelineState({
          clips: clipsRef.current,
          audioTracks: options.beforeAudioTracks,
          selectedClipId,
        })
      : null;

    commitAudioTracks((current) => {
      const patched = current.map((track) => {
        if (track.id !== trackId) {
          return track;
        }

        const durationMs = Math.max(0, Number(track.durationMs || 0));
        const next = {
          ...track,
          ...patch,
        };

        if (Object.prototype.hasOwnProperty.call(patch, 'offsetMs')) {
          const requestedOffsetMs = Number(patch.offsetMs);
          const currentAudioEndMs = current.reduce((max, item) => {
            const itemOffsetMs = Math.max(0, Number(item?.offsetMs || 0));
            const itemEffectiveMs = getAudioTrackLayoutDurationMs(item);

            return Math.max(max, itemOffsetMs + itemEffectiveMs);
          }, 0);
          const dragHorizonMs = Math.max(
            60_000,
            Number(totalTimelineDurationMs || 0),
            currentAudioEndMs,
            Number.isFinite(requestedOffsetMs) ? requestedOffsetMs + 1000 : 0,
          );

          next.offsetMs = clamp(requestedOffsetMs, 0, dragHorizonMs, 0);
        }

        if (Object.prototype.hasOwnProperty.call(patch, 'trimStartMs')) {
          next.trimStartMs = clamp(Number(patch.trimStartMs), 0, durationMs, 0);
        }

        if (Object.prototype.hasOwnProperty.call(patch, 'trimEndMs')) {
          const minEndMs = Math.min(durationMs, Math.max(0, Number(next.trimStartMs || 0)) + 100);
          next.trimEndMs = clamp(Number(patch.trimEndMs), minEndMs, durationMs || minEndMs, durationMs || minEndMs);
        }

        if (durationMs > 0) {
          const safeStartMs = clamp(Number(next.trimStartMs || 0), 0, durationMs, 0);
          const safeEndMs = clamp(
            Number(next.trimEndMs || durationMs),
            Math.min(durationMs, safeStartMs + 100),
            durationMs,
            durationMs,
          );

          next.trimStartMs = safeStartMs;
          next.trimEndMs = safeEndMs;
          next.effectiveDurationMs = Math.max(0, safeEndMs - safeStartMs);
        } else if (Number.isFinite(Number(next.trimEndMs))) {
          next.effectiveDurationMs = Math.max(0, Number(next.trimEndMs || 0) - Number(next.trimStartMs || 0));
        }

        if (Object.prototype.hasOwnProperty.call(patch, 'muted')) {
          next.muted = Boolean(patch.muted);
        }

        return next;
      });

      return options.resolveOverlap
        ? resolveAudioTrackOverlapBySlotSwap(patched, trackId, options.beforeAudioTracks || current)
        : patched;
    }, {
      history: options.history !== false,
      historySnapshot,
    });
    setSequenceState(createSequenceReviewState('idle'));
  }, [commitAudioTracks, selectedClipId, totalTimelineDurationMs]);


  return {
    addAudioTracksFromFiles,
    addLinkedAudioDraft,
    addLinkedVideoDraft,
    addTimelineClipsFromFiles,
    captureTimelineHistory,
    clearClips,
    commitTimelineClips,
    commitTimelineItemOrder,
    deleteTimelineRange,
    handleLinkedVideoPreviewReady,
    moveSelectedClip,
    redoTimeline,
    removeAudioTrack,
    removeClip,
    removeLinkedVideoDraft,
    requestAddAudioTrack,
    requestAddTimelineClip,
    retakeLastClip,
    splitTimelineAt,
    timelineHistoryState,
    undoTimeline,
    updateAudioTrackTiming,
    updateAudioTrackVolume,
    updateClipTimelineById,
    updateLinkedVideoDraftTiming,
    updateSelectedClipTimeline,
  };
}

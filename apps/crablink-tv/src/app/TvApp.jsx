import { useEffect, useRef, useState } from 'react';

import {
  tvAssetManifestAdapter,
  tvDiagnosticsPort,
  tvGatewayProfilePort,
  tvSettingsPort,
} from '../platform/tauriTvAdapter.js';

import {
  tvRouteLabel,
} from '../navigation/tvRouteMetadata.js';

import {
  useTvRemoteNavigation,
} from '../focus/useTvRemoteNavigation.js';

import {
  useTvSectionHistory,
} from '../navigation/useTvSectionHistory.js';

import {
  TvOverlayHost,
} from '../navigation/TvOverlayHost.jsx';

import {
  useTvOverlayController,
} from '../navigation/useTvOverlayController.js';

import {
  useTvAndroidIntentHandoff,
} from '../navigation/useTvAndroidIntentHandoff.js';

import {
  TvPairingPanel,
} from '../pairing/TvPairingPanel.jsx';

import {
  TvSettingsPanel,
} from '../settings/TvSettingsPanel.jsx';

import {
  useTvPreferences,
} from '../settings/useTvPreferences.js';

import {
  useTvHomeCatalog,
} from '../catalog/useTvHomeCatalog.js';

import {
  TvHomeCatalogPanel,
} from '../catalog/TvHomeCatalogPanel.jsx';

import {
  TV_CATALOG_CARD_HANDOFF_KIND,
  projectTvCatalogCardRouteHandoff,
} from '../catalog/tvCatalogRouteHandoff.js';

import {
  useTvCreatorBrowse,
} from '../catalog/useTvCreatorBrowse.js';

import {
  TvCreatorBrowsePanel,
} from '../catalog/TvCreatorBrowsePanel.jsx';

import {
  TV_CREATOR_PROFILE_KIND,
  createIdleTvCreatorProfile,
  projectTvCreatorProfile,
} from '../catalog/tvCreatorProfileModel.js';

import {
  TV_CREATOR_PROFILE_FOCUS_KIND,
  TV_CREATOR_PROFILE_FOCUS_REASON,
  createIdleTvCreatorProfileFocusRequest,
  createTvCreatorProfileFocusRequest,
} from '../catalog/tvCreatorProfileFocusModel.js';

import {
  TvCreatorProfilePanel,
} from '../catalog/TvCreatorProfilePanel.jsx';

import {
  TV_LIBRARY_ASSET_DETAIL_KIND,
  createIdleTvLibraryAssetDetail,
  projectTvLibraryAssetDetail,
} from '../library/tvLibraryAssetDetailModel.js';

import {
  createIdleTvLibraryVerifiedAssetRender,
  projectTvLibraryVerifiedAssetRender,
} from '../library/tvLibraryVerifiedAssetRenderModel.js';

import {
  createIdleTvLibraryVerifiedImageRenderSurface,
} from '../library/tvLibraryVerifiedImageRenderSurfaceModel.js';

import {
  createIdleTvLibraryVerifiedArticleRenderSurface,
} from '../library/tvLibraryVerifiedArticleRenderSurfaceModel.js';

import {
  TV_LIBRARY_VERIFY_UI_STATE,
  createIdleTvLibraryVerifyUiView,
  projectTvLibraryVerifyUiView,
  requestTvLibraryVerifyUiView,
} from '../library/tvLibraryVerifyUiModel.js';

import {
  tvGatewayAssetHttpTransport,
} from '../library/tvGatewayAssetHttpTransport.js';

import {
  captureTvLibraryManualVerifyExecutionTarget,
  createIdleTvLibraryManualVerifyExecution,
  createRunningTvLibraryManualVerifyExecution,
  createTvLibraryManualVerifyExecutionLock,
  isCurrentTvLibraryManualVerifyExecutionTarget,
} from '../library/tvLibraryManualVerifyExecution.js';

import {
  TvLibraryAssetDetailPanel,
} from '../library/TvLibraryAssetDetailPanel.jsx';

const INITIAL_NATIVE_STATUS = Object.freeze({
  state: 'idle',
  message:
    'Native diagnostics have not been requested in this session.',
});

const TV_SECTIONS = Object.freeze([
  {
    id: 'home',
    label: tvRouteLabel('home'),
    eyebrow: 'CrabLink TV',
    title: 'A remote-first window into CrabLink',
    description:
      'Navigate with the D-pad. Every action remains client-side ' +
      'until a verified CrabLink gateway and micronode are attached.',
    actionLabel: 'Review TV readiness',
    actionMessage:
      'The Android launcher, both target ABIs, remote navigation, ' +
      'settings, gateway-profile review, and pairing readiness are present.',
  },
  {
    id: 'earn',
    label: tvRouteLabel('earn'),
    eyebrow: 'Participation',
    title: 'Verification earns ROC only after confirmation',
    description:
      'CrabLink TV will run bounded verification work through the ' +
      'shared micronode path. This screen never invents rewards.',
    actionLabel: 'Review earning posture',
    actionMessage:
      'Micronode attachment is not active in this build. No reward ' +
      'evidence, balance mutation, or confirmed ROC was created.',
  },
  {
    id: 'library',
    label: tvRouteLabel('library'),
    eyebrow: 'Verified content',
    title: 'Your CrabLink content belongs behind proof',
    description:
      'Library entries will appear only after crab:// resolution, ' +
      'BLAKE3 verification, and any required ROC receipt checks.',
    actionLabel: 'Review library posture',
    actionMessage:
      'No gateway catalog is attached yet. The TV shell refuses to ' +
      'display placeholder ownership or paid-access entitlement.',
  },
  {
    id: 'pair',
    label: tvRouteLabel('pair'),
    eyebrow: 'Companion approval',
    title: 'Pair this TV without typing account secrets',
    description:
      'A reviewed gateway will issue a short-lived challenge that ' +
      'must be approved from trusted desktop or mobile CrabLink.',
    actionLabel: 'Review pairing posture',
    actionMessage:
      'The native gateway-profile and pairing-readiness commands are active. No challenge, approval, or session is fabricated locally.',
  },
  {
    id: 'settings',
    label: tvRouteLabel('settings'),
    eyebrow: 'Device posture',
    title: 'TV controls without hidden authority',
    description:
      'Resource mode, theme, redacted gateway readiness, pairing, ' +
      'and diagnostics live here without exposing node administration.',
    actionLabel: 'Review settings posture',
    actionMessage:
      'Theme, resource, participation, redacted gateway readiness, ' +
      'and pairing controls are active without economic authority.',
  },
]);

const TV_SECTION_IDS = Object.freeze(
  TV_SECTIONS.map((section) => section.id),
);

const READINESS_CARDS = Object.freeze([
  {
    id: 'android',
    label: 'Android',
    title: 'Hardware path proven',
    body:
      'Separate ARMv7 and ARM64 debug artifacts are available for ' +
      'real Android TV hardware.',
    detail:
      'The 32-bit ARM build installed and launched on the target TV ' +
      'box. This interface has not yet been tested there.',
  },
  {
    id: 'remote',
    label: 'Remote',
    title: 'D-pad foundation active',
    body:
      'Arrow keys now choose the closest visible control using a ' +
      'deterministic spatial focus graph.',
    detail:
      'Initial focus, directional movement, focus visibility, and ' +
      'scroll-into-view behavior are enabled in this build.',
  },
  {
    id: 'roc',
    label: 'ROC truth',
    title: 'Confirmed value only',
    body:
      'No placeholder balance, direct reward claim, or local ledger ' +
      'authority is permitted on the TV client.',
    detail:
      'Future ROC displays must be projected from confirmed receipts ' +
      'and shared QuickChain verification behavior.',
  },
]);

export function TvApp() {
  const [nativeStatus, setNativeStatus] = useState(
    INITIAL_NATIVE_STATUS,
  );

  const [activityMessage, setActivityMessage] = useState(
    'Use the D-pad to move between controls and press Select.',
  );

  const [
    creatorProfileView,
    setCreatorProfileView,
  ] = useState(
    createIdleTvCreatorProfile,
  );

  const [
    creatorProfileFocusRequest,
    setCreatorProfileFocusRequest,
  ] = useState(
    createIdleTvCreatorProfileFocusRequest,
  );

  const [
    libraryAssetDetailView,
    setLibraryAssetDetailView,
  ] = useState(
    createIdleTvLibraryAssetDetail,
  );

  const [
    libraryVerifiedAssetRenderView,
    setLibraryVerifiedAssetRenderView,
  ] = useState(
    createIdleTvLibraryVerifiedAssetRender,
  );

  const [
    libraryVerifiedImageRenderSurfaceView,
    setLibraryVerifiedImageRenderSurfaceView,
  ] = useState(
    createIdleTvLibraryVerifiedImageRenderSurface,
  );

  const [
    libraryVerifiedArticleRenderSurfaceView,
    setLibraryVerifiedArticleRenderSurfaceView,
  ] = useState(
    createIdleTvLibraryVerifiedArticleRenderSurface,
  );

  const [
    libraryVerifyUiView,
    setLibraryVerifyUiView,
  ] = useState(
    createIdleTvLibraryVerifyUiView,
  );

  const [
    libraryManualVerifyExecutionView,
    setLibraryManualVerifyExecutionView,
  ] = useState(
    createIdleTvLibraryManualVerifyExecution,
  );

  const [
    libraryManualVerifyExecutionLock,
  ] = useState(
    createTvLibraryManualVerifyExecutionLock,
  );

  const libraryAssetDetailRef =
    useRef(libraryAssetDetailView);

  useEffect(
    () => {
      if (
        creatorProfileFocusRequest.kind !==
        TV_CREATOR_PROFILE_FOCUS_KIND.RETURN
      ) {
        return undefined;
      }

      const focusFrame =
        window.requestAnimationFrame(
          () => {
            const target =
              [
                ...document.querySelectorAll(
                  '[data-tv-focus-key]',
                ),
              ].find(
                (element) =>
                  element.dataset.tvFocusKey ===
                  creatorProfileFocusRequest.focusKey,
              );

            if (
              target &&
              typeof target.focus === 'function'
            ) {
              target.focus();
              document.documentElement.dataset.tvReturnFocusKey =
                creatorProfileFocusRequest.focusKey;
            }
          },
        );

      return () => {
        window.cancelAnimationFrame(
          focusFrame,
        );
      };
    },
    [
      creatorProfileFocusRequest,
    ],
  );

  const {
    overlayState,
    overlayOpen,
    focusScopeKey,
    openDetail,
    openProblem,
    closeOverlay,
    consumeBack,
  } = useTvOverlayController();

  const {
    activeSectionId,
    routeDepth,
    navigateToSection,
  } = useTvSectionHistory({
    sectionIds: TV_SECTION_IDS,
    initialSectionId: 'home',
    consumeBack,
  });

  const {
    preferences,
    setThemeMode,
    setResourceMode,
    setVerificationEnabled,
  } = useTvPreferences();

  const {
    catalogState,
    loadHomeCatalog,
    refreshHomeCatalog,
  } = useTvHomeCatalog({
    onActivity: setActivityMessage,
  });

  const {
    creatorBrowseView,
    creatorQuery,
    setCreatorQuery,
    clearCreatorQuery,
  } = useTvCreatorBrowse({
    catalogView: catalogState.view,
  });

  useTvRemoteNavigation({
    focusScopeKey,
  });

  useTvAndroidIntentHandoff({
    activeSectionId,
    availableSectionIds: TV_SECTION_IDS,
    navigateToSection,
    openDetail,
    openProblem,
    setActivityMessage,
  });

  const activeSection =
    TV_SECTIONS.find(
      (section) => section.id === activeSectionId,
    ) ??
    TV_SECTIONS[0];

  async function checkNativeBridge(event) {
    const initiatingFocusKey =
      event?.currentTarget?.dataset?.tvFocusKey ??
      'native-diagnostics';

    setNativeStatus({
      state: 'checking',
      message:
        'Checking the narrow CrabLink TV command bridge…',
    });

    try {
      const [
        diagnostics,
        gatewayProfile,
        settingsSnapshot,
      ] = await Promise.all([
        tvDiagnosticsPort.getDiagnostics(),
        tvGatewayProfilePort.readGatewayProfile(),
        tvSettingsPort.readSettings(),
      ]);

      if (
        diagnostics.clientOnly !== true ||
        typeof gatewayProfile.state !== 'string' ||
        settingsSnapshot.settingsAuthority !==
          'local-ui-preferences-only'
      ) {
        throw new Error(
          'native adapter contract rejected',
        );
      }

      setNativeStatus({
        state: 'ready',
        message:
          `${diagnostics.app} is running as a ` +
          `${diagnostics.profile} client-only surface.`,
      });
    } catch {
      const message =
        'The static shell remains available, but native diagnostics ' +
        'require the reviewed Tauri host.';

      setNativeStatus({
        state: 'browser',
        message,
      });

      openProblem({
        title: 'Native bridge unavailable',
        body: message,
        code: 'TV_NATIVE_BRIDGE_UNAVAILABLE',
        returnFocusKey: initiatingFocusKey,
      });
    }
  }

  function selectSection(
    section,
    initiatingFocusKey,
  ) {
    const changed = navigateToSection(
      section.id,
      initiatingFocusKey,
    );

    setActivityMessage(
      changed
        ? `${section.label} selected. ${section.description}`
        : `${section.label} is already selected.`,
    );
  }

  function clearCreatorProfile(
    returnFocusKey =
      'creator-profile-close',
  ) {
    const focusRequest =
      createTvCreatorProfileFocusRequest({
        returnFocusKey,
        reason:
          TV_CREATOR_PROFILE_FOCUS_REASON.PROFILE_CLOSED,
      });

    setCreatorProfileView(
      createIdleTvCreatorProfile(),
    );

    setCreatorProfileFocusRequest(
      focusRequest,
    );

    setActivityMessage(
      `Creator profile closed. Return focus: ${focusRequest.focusKey}.`,
    );
  }

  function refreshHomeCatalogWithProfileFocus() {
    const focusRequest =
      createTvCreatorProfileFocusRequest({
        returnFocusKey:
          creatorProfileView?.returnFocusKey ??
          'home-catalog-refresh',
        reason:
          TV_CREATOR_PROFILE_FOCUS_REASON.CATALOG_REFRESH,
        fallbackFocusKey:
          'home-catalog-refresh',
      });

    setCreatorProfileFocusRequest(
      focusRequest,
    );

    refreshHomeCatalog();

    setActivityMessage(
      `Home catalog refresh requested. Return focus: ${focusRequest.focusKey}.`,
    );
  }

  function setActiveLibraryAssetDetail(
    nextDetailView,
  ) {
    libraryAssetDetailRef.current =
      nextDetailView;

    setLibraryAssetDetailView(
      nextDetailView,
    );
  }

  function clearLibraryAssetDetail() {
    setActiveLibraryAssetDetail(
      createIdleTvLibraryAssetDetail(),
    );

    setLibraryVerifiedAssetRenderView(
      createIdleTvLibraryVerifiedAssetRender(),
    );

    setLibraryVerifiedImageRenderSurfaceView(
      createIdleTvLibraryVerifiedImageRenderSurface(),
    );

    setLibraryVerifiedArticleRenderSurfaceView(
      createIdleTvLibraryVerifiedArticleRenderSurface(),
    );

    setLibraryVerifyUiView(
      createIdleTvLibraryVerifyUiView(),
    );

    setLibraryManualVerifyExecutionView(
      createIdleTvLibraryManualVerifyExecution(),
    );

    setActivityMessage(
      'Library asset detail cleared. Choose another reviewed asset from Home.',
    );
  }

  async function requestLibraryAssetVerification() {
    if (
      libraryManualVerifyExecutionLock
        .isRunning()
    ) {
      setActivityMessage(
        'Manual verification is already running for the active Library asset.',
      );

      return;
    }

    const requestedVerifyUiView =
      requestTvLibraryVerifyUiView({
        view:
          libraryVerifyUiView,
      });

    setLibraryVerifyUiView(
      requestedVerifyUiView,
    );

    if (
      requestedVerifyUiView.state !==
      TV_LIBRARY_VERIFY_UI_STATE.REQUESTED
    ) {
      setActivityMessage(
        requestedVerifyUiView.message,
      );

      return;
    }

    const detailView =
      libraryAssetDetailRef.current;

    const target =
      captureTvLibraryManualVerifyExecutionTarget({
        detailView,
      });

    if (!target) {
      const blocked =
        createIdleTvLibraryManualVerifyExecution({
          message:
            'Manual verification could not bind to the active Library asset.',
        });

      setLibraryManualVerifyExecutionView(
        blocked,
      );

      setLibraryVerifyUiView(
        projectTvLibraryVerifyUiView({
          detailView,
          verifiedRenderView:
            libraryVerifiedAssetRenderView,
        }),
      );

      setActivityMessage(
        blocked.message,
      );

      return;
    }

    const running =
      createRunningTvLibraryManualVerifyExecution({
        detailView,
      });

    setLibraryManualVerifyExecutionView(
      running,
    );

    setActivityMessage(
      running.message,
    );

    const result =
      await libraryManualVerifyExecutionLock.run({
        detailView,
        gatewayProfilePort:
          tvGatewayProfilePort,
        transport:
          tvGatewayAssetHttpTransport,
        manifestAdapter:
          tvAssetManifestAdapter,
      });

    if (
      !isCurrentTvLibraryManualVerifyExecutionTarget({
        target,
        detailView:
          libraryAssetDetailRef.current,
      })
    ) {
      setActivityMessage(
        'Manual verification completed for a Library asset that is no longer active. The stale result was ignored.',
      );

      return;
    }

    setLibraryManualVerifyExecutionView(
      result,
    );

    setLibraryVerifiedAssetRenderView(
      result.renderView,
    );

    setLibraryVerifiedImageRenderSurfaceView(
      createIdleTvLibraryVerifiedImageRenderSurface({
        message:
          'Manual verification completed; image object URL execution has not started yet.',
      }),
    );

    setLibraryVerifiedArticleRenderSurfaceView(
      createIdleTvLibraryVerifiedArticleRenderSurface({
        message:
          'Manual verification completed; article text decoding has not started yet.',
      }),
    );

    setLibraryVerifyUiView(
      projectTvLibraryVerifyUiView({
        detailView,
        verifiedRenderView:
          result.renderView,
      }),
    );

    setActivityMessage(
      result.message,
    );
  }

  function inspectCatalogItem(
    item,
    initiatingFocusKey,
  ) {
    const handoff =
      projectTvCatalogCardRouteHandoff(
        item,
        {
          initiatingFocusKey,
        },
      );

    if (
      handoff.kind ===
      TV_CATALOG_CARD_HANDOFF_KIND.PROBLEM
    ) {
      openProblem(
        handoff.overlay,
      );

      setActivityMessage(
        `Catalog card route rejected: ${handoff.overlay.code}.`,
      );

      return;
    }

    if (
      item?.kind === 'creator' &&
      handoff.route?.owner === 'site'
    ) {
      const nextProfile =
        projectTvCreatorProfile(
          item,
          {
            initiatingFocusKey,
          },
        );

      if (
        nextProfile.kind ===
        TV_CREATOR_PROFILE_KIND.READY
      ) {
        navigateToSection(
          'home',
          initiatingFocusKey,
        );

        setCreatorProfileView(
          nextProfile,
        );

        setCreatorProfileFocusRequest(
          createTvCreatorProfileFocusRequest({
            returnFocusKey:
              'creator-profile-close',
            reason:
              TV_CREATOR_PROFILE_FOCUS_REASON.PROFILE_OPENED,
            fallbackFocusKey:
              'creator-profile-close',
          }),
        );

        setActivityMessage(
          `${nextProfile.title} creator profile opened from reviewed Home catalog.`,
        );

        return;
      }
    }

    if (
      handoff.route?.owner === 'asset'
    ) {
      const nextAssetDetail =
        projectTvLibraryAssetDetail(
          handoff,
          {
            initiatingFocusKey,
          },
        );

      if (
        nextAssetDetail.kind !==
        TV_LIBRARY_ASSET_DETAIL_KIND.READY
      ) {
        openProblem({
          title:
            'Library asset detail unavailable',

          body:
            'The reviewed catalog handoff did not contain canonical asset identifiers.',

          code:
            nextAssetDetail.code,

          returnFocusKey:
            nextAssetDetail.returnFocusKey,
        });

        setActivityMessage(
          `Library asset detail rejected: ${nextAssetDetail.code}.`,
        );

        return;
      }

      setActiveLibraryAssetDetail(
        nextAssetDetail,
      );

      const nextVerifiedRenderView =
        projectTvLibraryVerifiedAssetRender({
          detailView:
            nextAssetDetail,
        });

      setLibraryVerifiedAssetRenderView(
        nextVerifiedRenderView,
      );

      setLibraryVerifiedImageRenderSurfaceView(
        createIdleTvLibraryVerifiedImageRenderSurface({
          message:
            'Verified image rendering is waiting for object URL execution.',
        }),
      );

      setLibraryVerifiedArticleRenderSurfaceView(
        createIdleTvLibraryVerifiedArticleRenderSurface({
          message:
            'Verified article rendering is waiting for verified text bytes.',
        }),
      );

      setLibraryManualVerifyExecutionView(
        createIdleTvLibraryManualVerifyExecution({
          message:
            'Manual verification has not started for this Library asset.',
        }),
      );

      setLibraryVerifyUiView(
        projectTvLibraryVerifyUiView({
          detailView:
            nextAssetDetail,
          verifiedRenderView:
            nextVerifiedRenderView,
        }),
      );

      navigateToSection(
        handoff.targetSectionId,
        initiatingFocusKey,
      );

      openDetail(
        handoff.overlay,
      );

      setActivityMessage(
        `${nextAssetDetail.title} opened as a reviewed Library asset detail.`,
      );

      return;
    }

    navigateToSection(
      handoff.targetSectionId,
      initiatingFocusKey,
    );

    openDetail(
      handoff.overlay,
    );

    setActivityMessage(
      `${item.title} opened from the reviewed Home catalog.`,
    );
  }

  return (
    <main
      className="tv-shell"
      data-tv-overlay-open={
        overlayOpen ? 'true' : undefined
      }
    >
      <header className="tv-header">
        <div className="tv-brand">
          <div className="tv-brand-mark" aria-hidden="true">
            CL
          </div>

          <div>
            <p className="tv-eyebrow">CrabLink TV</p>
            <h1>Watch. Verify. Participate.</h1>
          </div>
        </div>

        <span className="tv-profile-badge">
          CLIENT ONLY
        </span>
      </header>

      <nav
        className="tv-navigation"
        aria-label="CrabLink TV sections"
      >
        {TV_SECTIONS.map((section) => {
          const active =
            section.id === activeSectionId;

          return (
            <button
              key={section.id}
              className="tv-navigation-item"
              type="button"
              data-tv-focusable="true"
              data-tv-focus-key={`nav-${section.id}`}
              data-tv-autofocus={
                section.id === 'home'
                  ? 'true'
                  : undefined
              }
              aria-current={
                active ? 'page' : undefined
              }
              onClick={(event) => {
                selectSection(
                  section,
                  event.currentTarget.dataset.tvFocusKey,
                );
              }}
            >
              {section.label}
            </button>
          );
        })}
      </nav>

      <section
        className="tv-hero"
        aria-labelledby="tv-section-title"
      >
        <p className="tv-kicker">
          {activeSection.eyebrow}
        </p>

        <h2 id="tv-section-title">
          {activeSection.title}
        </h2>

        <p>{activeSection.description}</p>

        <div className="tv-hero-actions">
          <button
            className="tv-action tv-action--primary"
            type="button"
            data-tv-focusable="true"
            data-tv-focus-key="section-review"
            onClick={(event) => {
              setActivityMessage(
                activeSection.actionMessage,
              );

              openDetail({
                title: activeSection.title,
                body: activeSection.actionMessage,
                returnFocusKey:
                  event.currentTarget.dataset.tvFocusKey,
              });
            }}
          >
            {activeSection.actionLabel}
          </button>

          <button
            className="tv-action tv-action--secondary"
            type="button"
            data-tv-focusable="true"
            data-tv-focus-key="native-diagnostics"
            onClick={checkNativeBridge}
          >
            Check native bridge
          </button>
        </div>
      </section>

      {activeSectionId === 'pair' ? (
        <TvPairingPanel
          onActivity={setActivityMessage}
        />
      ) : null}

      {activeSectionId === 'home' ? (
        <TvHomeCatalogPanel
          state={catalogState}
          onLoad={loadHomeCatalog}
          onRefresh={refreshHomeCatalogWithProfileFocus}
          onCatalogItem={inspectCatalogItem}
        />
      ) : null}

      {activeSectionId === 'home' ? (
        <TvCreatorBrowsePanel
          browseView={creatorBrowseView}
          query={creatorQuery}
          onQueryChange={setCreatorQuery}
          onClearQuery={clearCreatorQuery}
          onCreator={inspectCatalogItem}
        />
      ) : null}

      {activeSectionId === 'home' ? (
        <TvCreatorProfilePanel
          profileView={creatorProfileView}
          focusRequest={creatorProfileFocusRequest}
          onClose={clearCreatorProfile}
        />
      ) : null}

      {activeSectionId === 'library' ? (
        <TvLibraryAssetDetailPanel
          detailView={libraryAssetDetailView}
          verifiedRenderView={libraryVerifiedAssetRenderView}
          verifyUiView={libraryVerifyUiView}
          manualVerifyExecutionView={
            libraryManualVerifyExecutionView
          }
          imageRenderSurfaceView={libraryVerifiedImageRenderSurfaceView}
          articleRenderSurfaceView={libraryVerifiedArticleRenderSurfaceView}
          onVerifyAsset={requestLibraryAssetVerification}
          onClear={clearLibraryAssetDetail}
        />
      ) : null}

      {activeSectionId === 'settings' ? (
        <TvSettingsPanel
          preferences={preferences}
          onThemeMode={setThemeMode}
          onResourceMode={setResourceMode}
          onVerificationEnabled={
            setVerificationEnabled
          }
          onActivity={setActivityMessage}
        />
      ) : null}

      <section
        className="tv-readiness"
        aria-labelledby="tv-readiness-title"
      >
        <div className="tv-section-heading">
          <p className="tv-card-label">
            Current build
          </p>
          <h2 id="tv-readiness-title">
            Truthful readiness
          </h2>
        </div>

        <div className="tv-card-grid">
          {READINESS_CARDS.map((card) => (
            <button
              key={card.id}
              className="tv-card"
              type="button"
              data-tv-focusable="true"
              data-tv-focus-key={`readiness-${card.id}`}
              aria-label={`${card.title}. ${card.body}`}
              onClick={(event) => {
                setActivityMessage(card.detail);

                openDetail({
                  title: card.title,
                  body: card.detail,
                  returnFocusKey:
                    event.currentTarget.dataset.tvFocusKey,
                });
              }}
            >
              <span className="tv-card-label">
                {card.label}
              </span>

              <strong>{card.title}</strong>
              <span>{card.body}</span>
              <small>Press Select for details</small>
            </button>
          ))}
        </div>
      </section>

      <section
        className="tv-feedback-panel"
        aria-label="TV interaction status"
      >
        <div>
          <p className="tv-card-label">
            Remote interaction
          </p>
          <h2>Focused control feedback</h2>
          <p
            className="tv-activity-message"
            aria-live="polite"
          >
            {activityMessage}
          </p>
        </div>

        <div className="tv-native-summary">
          <span
            className={
              `tv-native-indicator ` +
              `tv-native-indicator--${nativeStatus.state}`
            }
            aria-hidden="true"
          />

          <p
            className={
              `tv-native-status ` +
              `tv-native-status--${nativeStatus.state}`
            }
            aria-live="polite"
          >
            {nativeStatus.message}
          </p>
        </div>
      </section>

      <TvOverlayHost
        state={overlayState}
        onClose={closeOverlay}
      />

      <footer className="tv-footer">
        <span>
          TV Phase 8C · Home catalog and creator browse rows are
          backend-derived, route-reviewed, searchable, and rendered
          without polling. No challenge, approval, session, reward, balance,
          receipt, or ledger truth is fabricated by this shell.
        </span>

        <span className="tv-route-status">
          Route depth: {routeDepth}.{' '}
          {routeDepth > 0
            ? 'Back returns to the previous TV section.'
            : 'At Home, Back remains available to Android.'}
        </span>
      </footer>
    </main>
  );
}

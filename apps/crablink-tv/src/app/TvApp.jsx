import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

import {
  useTvRemoteNavigation,
} from '../focus/useTvRemoteNavigation.js';

import {
  useTvSectionHistory,
} from '../navigation/useTvSectionHistory.js';

import {
  TvPairingPanel,
} from '../pairing/TvPairingPanel.jsx';

import {
  TvSettingsPanel,
} from '../settings/TvSettingsPanel.jsx';

import {
  useTvPreferences,
} from '../settings/useTvPreferences.js';

const INITIAL_NATIVE_STATUS = Object.freeze({
  state: 'idle',
  message:
    'Native diagnostics have not been requested in this session.',
});

const TV_SECTIONS = Object.freeze([
  {
    id: 'home',
    label: 'Home',
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
    label: 'Earn ROC',
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
    label: 'Library',
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
    label: 'Pair',
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
    label: 'Settings',
    eyebrow: 'Device posture',
    title: 'TV controls without hidden authority',
    description:
      'Resource mode, pairing, theme, diagnostics, and micronode ' +
      'controls will live here without exposing node administration.',
    actionLabel: 'Review settings posture',
    actionMessage:
      'Theme, resource, participation, gateway-profile, and pairing ' +
      'readiness controls are active without economic authority.',
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

  const {
    activeSectionId,
    routeDepth,
    navigateToSection,
  } = useTvSectionHistory({
    sectionIds: TV_SECTION_IDS,
    initialSectionId: 'home',
  });

  const {
    preferences,
    setThemeMode,
    setResourceMode,
    setVerificationEnabled,
  } = useTvPreferences();

  useTvRemoteNavigation();

  const activeSection =
    TV_SECTIONS.find(
      (section) => section.id === activeSectionId,
    ) ??
    TV_SECTIONS[0];

  async function checkNativeBridge() {
    setNativeStatus({
      state: 'checking',
      message:
        'Checking the narrow CrabLink TV command bridge…',
    });

    try {
      const diagnostics = await invoke('tv_diagnostics');

      setNativeStatus({
        state: 'ready',
        message:
          `${diagnostics.app} is running as a ` +
          `${diagnostics.profile} client-only surface.`,
      });
    } catch {
      setNativeStatus({
        state: 'browser',
        message:
          'The static shell is available. Native diagnostics ' +
          'require the Tauri host.',
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

  return (
    <main className="tv-shell">
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
            onClick={() => {
              setActivityMessage(
                activeSection.actionMessage,
              );
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
              onClick={() => {
                setActivityMessage(card.detail);
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

      <footer className="tv-footer">
        <span>
          TV Phase 3D · Gateway configuration and pairing
          readiness are native, read-only truth. No challenge,
          approval, session, reward, balance, receipt, or ledger
          truth is fabricated by this shell.
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

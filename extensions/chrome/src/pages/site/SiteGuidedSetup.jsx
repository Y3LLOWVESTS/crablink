/**
 * RO:WHAT — Product-facing setup panel for creating a CrabLink site from the current passport.
 * RO:WHY — Moves real-world site inputs into the guided launch flow instead of hiding them in developer tools.
 * RO:INTERACTS — SiteLaunchFlow, siteTemplates, siteDraftModel, current app passport/wallet settings.
 * RO:INVARIANTS — current passport only; no make-on-behalf UX; local draft only; no fake root CID or receipt.
 * RO:METRICS — none.
 * RO:CONFIG — reads passportSubject, walletAccount, handle/requestedHandle when present.
 * RO:SECURITY — does not store private keys, does not mutate wallet, does not claim backend creator proof.
 * RO:TEST — manual crab://site setup, template import, HTML import, and launch smoke.
 */

import { useEffect, useMemo, useState } from 'react';
import Badge from '../../shared/components/Badge.jsx';
import Button from '../../shared/components/Button.jsx';
import CopyButton from '../../shared/components/CopyButton.jsx';
import Field from '../../shared/components/Field.jsx';
import TextArea from '../../shared/components/TextArea.jsx';
import TextInput from '../../shared/components/TextInput.jsx';
import { normalizeCid, normalizeSiteName } from './siteDraftModel.js';
import { SITE_TEMPLATES, buildSiteTemplatePatch } from './siteTemplates.js';

export default function SiteGuidedSetup({ app, draftState, rootDocumentCid = '' }) {
  const { draft, updateDraft, replaceDraft, stats } = draftState;
  const [selectedTemplateId, setSelectedTemplateId] = useState(SITE_TEMPLATES[0]?.id || '');
  const creator = useMemo(() => getCurrentCreatorIdentity(app, draft), [app, draft]);
  const siteName = normalizeSiteName(draft.siteName);
  const siteUrl = siteName ? `crab://${siteName}` : 'crab://<site-name>';
  const rootCid = normalizeCid(rootDocumentCid || draft.rootDocumentCid);
  const rootGuard = stats.rootGuard || {
    ok: false,
    level: 'warning',
    reason: 'Add root HTML before launching.',
  };

  useEffect(() => {
    if (!updateDraft) {
      return;
    }

    if (creator.passportSubject && draft.ownerPassport !== creator.passportSubject) {
      updateDraft('ownerPassport', creator.passportSubject);
    }

    if (creator.walletAccount && draft.ownerWallet !== creator.walletAccount) {
      updateDraft('ownerWallet', creator.walletAccount);
    }

    if (creator.creatorDisplay && draft.creatorDisplay !== creator.creatorDisplay) {
      updateDraft('creatorDisplay', creator.creatorDisplay);
    }
  }, [
    creator.passportSubject,
    creator.walletAccount,
    creator.creatorDisplay,
    draft.ownerPassport,
    draft.ownerWallet,
    draft.creatorDisplay,
    updateDraft,
  ]);

  function updateField(key) {
    return (event) => updateDraft(key, event.target.value);
  }

  function selectTemplate(event) {
    setSelectedTemplateId(event.target.value);
  }

  function applyTemplate(templateId = selectedTemplateId) {
    const nextDraft = buildSiteTemplatePatch(templateId, {
      ...draft,
      ownerPassport: creator.passportSubject,
      ownerWallet: creator.walletAccount,
      creatorDisplay: creator.creatorDisplay,
    });

    replaceDraft({
      ...nextDraft,
      ownerPassport: creator.passportSubject,
      ownerWallet: creator.walletAccount,
      creatorDisplay: creator.creatorDisplay,
    });
  }

  function importHtml(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      updateDraft('rootHtml', String(reader.result || ''));
      updateDraft('rootDocumentCid', '');
    };

    reader.readAsText(file);
  }

  function clearRootHtml() {
    updateDraft('rootHtml', '');
    updateDraft('rootDocumentCid', '');
  }

  return (
    <section className="site-launch-setup" aria-label="Site setup">
      <div className="site-launch-setup-head">
        <div>
          <p className="cl-eyebrow">Site setup</p>
          <h3>Create as your current passport</h3>
          <p>
            The creator is locked to the active CrabLink passport. You can choose the site name, title,
            template, and root HTML, but you cannot create a site on behalf of another passport.
          </p>
        </div>

        <div className="site-launch-creator-lock">
          <span>Creator</span>
          <strong>{creator.creatorDisplay || 'No passport loaded'}</strong>
          <small>{creator.passportSubject || 'Configure or refresh your passport before launch.'}</small>
          <Badge tone={creator.ready ? 'success' : 'warning'}>
            {creator.ready ? 'passport locked' : 'identity needed'}
          </Badge>
        </div>
      </div>

      <div className="site-launch-form-grid">
        <Field label="Site name" help="This becomes the human pointer after backend /sites succeeds." required>
          <TextInput
            value={draft.siteName || ''}
            onChange={updateField('siteName')}
            placeholder="my-crab-site"
            spellCheck={false}
          />
        </Field>

        <Field label="Site URL" help="Derived from the site name. Names are pointers; b3 remains canonical.">
          <TextInput value={siteUrl} readOnly spellCheck={false} />
        </Field>

        <Field label="Site title" help="Shown in the root document template and manifest draft." required>
          <TextInput
            value={draft.title || ''}
            onChange={updateField('title')}
            placeholder="My CrabLink Site"
          />
        </Field>

        <Field label="Tags" help="Comma-separated local tags for the future site manifest.">
          <TextInput
            value={draft.tags || ''}
            onChange={updateField('tags')}
            placeholder="creator, blog, art"
          />
        </Field>
      </div>

      <Field label="Description" help="Public-facing site summary.">
        <TextArea
          value={draft.description || ''}
          onChange={updateField('description')}
          rows={3}
          placeholder="What this site is about"
        />
      </Field>

      <div className="site-launch-identity-grid">
        <MiniFact label="@ username" value={creator.handle || 'not confirmed'} />
        <MiniFact label="Passport" value={creator.passportSubject || 'not loaded'} monospace />
        <MiniFact label="Wallet" value={creator.walletAccount || 'not loaded'} monospace />
        <MiniFact label="Creator rule" value="current passport only" />
      </div>

      <div className="site-launch-template-row">
        <div>
          <span>Template</span>
          <strong>{templateName(selectedTemplateId)}</strong>
          <small>Choose a starter or import your own HTML file below.</small>
        </div>

        <div className="site-launch-template-actions">
          <select value={selectedTemplateId} onChange={selectTemplate} aria-label="Site template">
            {SITE_TEMPLATES.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>

          <Button variant="secondary" onClick={() => applyTemplate()}>
            Use Template
          </Button>

          <label className="site-file-button site-launch-file-button">
            Import HTML
            <input
              type="file"
              accept=".html,.htm,.txt,text/html,text/plain"
              onChange={importHtml}
            />
          </label>
        </div>
      </div>

      <div className={`site-launch-root-guard is-${rootGuard.level || 'warning'}`}>
        <strong>{rootGuard.ok ? 'Root HTML ready' : 'Root needs attention'}</strong>
        <span>{rootGuard.reason}</span>
      </div>

      <Field
        label="Root HTML"
        help="Paste or import the page HTML here. Scripts are stripped in preview; Store Root HTML mints the real b3 root CID."
      >
        <TextArea
          value={draft.rootHtml || ''}
          onChange={updateField('rootHtml')}
          rows={10}
          spellCheck={false}
        />
      </Field>

      <div className="site-launch-root-row">
        <MiniFact label="Local bytes" value={formatBytes(stats.rootHtmlBytes || 0)} />
        <MiniFact label="Backend root CID" value={rootCid || 'not stored yet'} monospace />
        <MiniFact label="Next root step" value={rootCid ? 'create site pointer' : 'store root HTML'} />
        <div className="site-launch-root-actions">
          <Button variant="ghost" onClick={clearRootHtml}>
            Clear HTML
          </Button>
          <CopyButton text={rootCid || ''} label="Copy Root CID" disabled={!rootCid} />
        </div>
      </div>
    </section>
  );
}

export function getCurrentCreatorIdentity(app = {}, draft = {}) {
  const settings = app?.settings || {};
  const identity = app?.identityState?.data || {};
  const wallet = app?.walletState?.data || {};
  const identityPassport = objectOrEmpty(identity.passport || identity.profile || identity.identity);
  const identityWallet = objectOrEmpty(identity.wallet);
  const walletBody = objectOrEmpty(wallet.wallet || wallet.balance || wallet);

  const handle = normalizeHandle(
    firstPresent(
      identityPassport.handle,
      identityPassport.username,
      identity.handle,
      identity.username,
      identity.profile?.handle,
      identity.profile?.username,
      settings.handle,
      settings.requestedHandle,
      draft.creatorDisplay,
    ),
  );

  const passportSubject = String(
    firstPresent(
      identityPassport.passport_subject,
      identityPassport.passportSubject,
      identity.passport_subject,
      identity.passportSubject,
      settings.passportSubject,
      draft.ownerPassport,
    ) || '',
  ).trim();

  const walletAccount = String(
    firstPresent(
      identityWallet.account,
      identityWallet.wallet_account,
      identityWallet.walletAccount,
      walletBody.account,
      walletBody.wallet_account,
      walletBody.walletAccount,
      settings.walletAccount,
      draft.ownerWallet,
    ) || '',
  ).trim();

  const creatorDisplay = handle || passportSubject || '';

  return {
    ready: Boolean(passportSubject && walletAccount),
    handle,
    creatorDisplay,
    passportSubject,
    walletAccount,
  };
}

function MiniFact({ label, value, monospace = false }) {
  return (
    <div className="site-launch-mini-fact">
      <span>{label}</span>
      <strong className={monospace ? 'is-monospace' : ''}>{value || 'n/a'}</strong>
    </div>
  );
}

function templateName(templateId) {
  return SITE_TEMPLATES.find((template) => template.id === templateId)?.name || 'Template';
}

function objectOrEmpty(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function firstPresent(...values) {
  for (const value of values) {
    const text = String(value ?? '').trim();

    if (text) {
      return text;
    }
  }

  return '';
}

function normalizeHandle(value) {
  const text = String(value || '').trim();

  if (!text) {
    return '';
  }

  const withoutAt = text.replace(/^@+/, '').toLowerCase();

  if (!withoutAt) {
    return '';
  }

  return `@${withoutAt}`;
}

function formatBytes(value) {
  const bytes = Number(value || 0);

  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
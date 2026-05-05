/**
 * RO:WHAT — Prepare + explicit wallet-hold + image-upload + site-create controller for CrabLink product pages.
 * RO:WHY — App Integration; Concerns: DX/SEC/ECON; keep paid actions explicit and modular.
 * RO:INTERACTS — page.js, page-dom.js, ronClient.js, svc-gateway /assets/image/prepare, /assets/image, /sites/prepare, /sites, /wallet/hold.
 * RO:INVARIANTS — prepare is non-mutating; wallet hold requires confirmation; upload/create requires paid proof; no direct storage/index/ledger calls.
 * RO:METRICS — backend correlation IDs flow through ronClient.js.
 * RO:CONFIG — reads passport/wallet/gateway/devMode settings through the runtime context.
 * RO:SECURITY — no silent spend; dev bad-pricing guard blocks holds; nonce conflict suggestions require visible UI state.
 * RO:TEST — scripts/check-chrome.sh; manual crab://image prepare/hold/upload and crab://site prepare/hold/create checks.
 */

import { stableIdempotencyKey } from './ronClient.js';
import { rememberProductState } from './storage.js';
import { clearChildren, els } from './page-dom.js';
import { DEFAULT_HOLD_ESCROW_ACCOUNT } from './page-constants.js';
import {
  boolText,
  canonicalB3Cid,
  deepPick,
  devPricingGuard,
  expectedNonceFromProblem,
  formatError,
  formatMinorUnits,
  isPositiveIntegerString,
  prepareAmountMinor,
  prepareMinimumHoldMinor,
  stablePreviewIdempotencyKey,
  stripUndefined
} from './page-utils.js';

export function createWorkflowController(runtime) {
  let currentDraft = null;
  let currentPrepareResponse = null;
  let currentHoldRequest = null;
  let currentHoldResponse = null;
  let currentImageFile = null;
  let currentUploadResult = null;
  let currentReturnedUrl = '';
  let currentPricingGuard = null;
  let autoOpenTimer = 0;

  function renderWorkflow(payload) {
    const fields = Array.isArray(payload.fields) ? payload.fields : [];
    const prepareAction = findPrepareAction(payload.actions || []);

    clearChildren(els.workflowFields);
    resetDraftPreview({ clearFile: true });

    if (fields.length === 0) {
      els.workflowSection.classList.add('hidden');
      return;
    }

    const pageKind = String(payload.page_kind || 'page').trim().toLowerCase();
    els.workflowSection.classList.remove('hidden');
    els.workflowTitle.textContent = workflowTitleFor(pageKind);
    els.workflowDescription.textContent = prepareAction
      ? `Build and send a non-mutating prepare request for ${prepareAction.method || 'POST'} ${prepareAction.route || ''}.`
      : 'This route contract has fields, but no non-mutating prepare action is available yet.';

    els.buildDraftButton.disabled = !prepareAction;
    els.sendPrepareButton.disabled = true;

    els.workflowForm.dataset.pageKind = pageKind;
    els.workflowForm.dataset.actionId = prepareAction?.id || '';
    els.workflowForm.dataset.actionLabel = prepareAction?.label || '';
    els.workflowForm.dataset.actionMethod = prepareAction?.method || '';
    els.workflowForm.dataset.actionRoute = prepareAction?.route || '';
    els.workflowForm.dataset.actionMutates = String(Boolean(prepareAction?.mutates));
    els.workflowForm.dataset.actionRequiresConfirmation = String(
      Boolean(prepareAction?.requires_confirmation)
    );

    for (const field of fields) {
      els.workflowFields.append(renderWorkflowField(field, pageKind));
    }
  }

  function renderWorkflowField(field, pageKind) {
    const wrapper = document.createElement('div');
    wrapper.className = 'workflow-field';

    const fieldName = String(field.name || '').trim();
    const fieldLabel = String(field.label || fieldName || 'Field').trim();
    const fieldType = String(field.type || 'text').trim().toLowerCase();
    const required = Boolean(field.required);
    const id = `workflow_${fieldName || Math.random().toString(16).slice(2)}`;

    const label = document.createElement('label');
    label.setAttribute('for', id);
    label.textContent = fieldLabel;

    if (required) {
      const star = document.createElement('span');
      star.textContent = ' *';
      label.append(star);
    }

    let input;

    if (fieldType === 'textarea') {
      input = document.createElement('textarea');
    } else {
      input = document.createElement('input');
      input.type = fieldType === 'file' ? 'file' : 'text';

      if (field.accept) {
        input.accept = String(field.accept);
      }
    }

    input.id = id;
    input.name = fieldName;
    input.required = required;
    input.placeholder = placeholderForField(fieldName, fieldType, pageKind);

    if (fieldType === 'file') {
      input.addEventListener('change', () => resetAfterFileChange());
    }

    const help = document.createElement('p');
    help.className = 'workflow-help';
    help.textContent = helpForField(fieldName, fieldType, pageKind);

    wrapper.append(label, input, help);
    return wrapper;
  }

  function resetAfterFileChange() {
    currentImageFile = null;
    currentPrepareResponse = null;
    currentHoldRequest = null;
    currentHoldResponse = null;
    currentUploadResult = null;
    currentReturnedUrl = '';
    currentPricingGuard = null;
    clearAutoOpenTimer();
    hidePrepareSummary();
    hideHoldSection();
    hideSubmitSection();
    hideSiteRootDocumentPanel();
    els.preparePreview.textContent = 'No prepare response yet.';
    els.copyPrepareButton.disabled = true;
    runtime.showFooter('Selected file changed. Rebuild the prepare draft.');
  }

  function findPrepareAction(actions) {
    if (!Array.isArray(actions)) {
      return null;
    }

    return (
      actions.find((action) => {
        const method = String(action.method || '').toUpperCase();
        return method === 'POST' && action.mutates === false;
      }) || null
    );
  }

  function workflowTitleFor(pageKind) {
    if (pageKind === 'image') {
      return 'Image Upload Draft';
    }

    if (pageKind === 'site') {
      return 'Site Launch Draft';
    }

    return 'Request Draft';
  }

  function placeholderForField(name, type, pageKind) {
    if (name === 'site_name') return 'my-ron-site';
    if (name === 'title') return pageKind === 'image' ? 'My RON Image' : 'My RON Site';
    if (name === 'description') return 'Describe this RON page...';
    if (name === 'tags') return 'art, demo, rusty-onions';
    if (type === 'file') return '';
    return '';
  }

  function helpForField(name, type, pageKind) {
    if (type === 'file') {
      return 'Prepare sends strict JSON metadata only: byte size and content type. The selected file is retained in memory for upload.';
    }

    if (name === 'site_name') {
      return 'Names are human pointers. b3 hashes remain canonical for content.';
    }

    if (name === 'tags') {
      return 'Comma-separated tags; preview turns them into an array.';
    }

    if (pageKind === 'image') {
      return 'Image ownership and payout metadata come from passport and wallet labels.';
    }

    return 'Used to build a prepare request. Create/upload remains explicit and gated.';
  }

  function buildDraftPreview() {
    const currentBuiltinPayload = runtime.getCurrentBuiltinPayload();

    if (!currentBuiltinPayload) {
      return null;
    }

    const pageKind = String(els.workflowForm.dataset.pageKind || 'page');
    const action = {
      id: els.workflowForm.dataset.actionId,
      label: els.workflowForm.dataset.actionLabel,
      method: els.workflowForm.dataset.actionMethod || 'POST',
      route: els.workflowForm.dataset.actionRoute,
      mutates: els.workflowForm.dataset.actionMutates === 'true',
      requires_confirmation: els.workflowForm.dataset.actionRequiresConfirmation === 'true'
    };

    if (!action.route) {
      currentDraft = null;
      els.workflowPreview.textContent = 'No non-mutating prepare action is available for this page.';
      els.sendPrepareButton.disabled = true;
      els.copyDraftButton.disabled = true;
      hideSiteRootDocumentPanel();
      hideHoldSection();
      hideSubmitSection();
      return null;
    }

    const formData = new FormData(els.workflowForm);
    const body = buildPrepareBody(pageKind, currentBuiltinPayload.fields || [], formData);
    const settings = runtime.getSettings();
    const currentParsed = runtime.getCurrentParsed();
    const draft = {
      schema: 'crablink.prepare-draft.v1',
      page_url: currentBuiltinPayload.url || currentParsed?.url || '',
      page_kind: pageKind,
      safety: {
        sent: false,
        note: 'Local preview only until Send Prepare Request is clicked.',
        prepare_policy:
          'Prepare routes are allowed preflight calls. Create/upload routes remain explicit and gated.'
      },
      action,
      request: {
        method: action.method,
        route: action.route,
        headers: {
          Authorization: settings.authToken ? 'configured in CrabLink settings' : 'not configured',
          'Idempotency-Key': body.client_idempotency_key,
          'x-ron-passport': settings.passportSubject || 'not configured',
          'x-ron-wallet-account': settings.walletAccount || 'not configured',
          'x-correlation-id': 'generated per gateway request'
        },
        body
      }
    };

    currentDraft = draft;
    currentPrepareResponse = null;
    currentHoldRequest = null;
    currentHoldResponse = null;
    currentUploadResult = null;
    currentReturnedUrl = '';
    currentPricingGuard = null;
    clearAutoOpenTimer();

    els.workflowPreview.textContent = JSON.stringify(draft, null, 2);
    els.preparePreview.textContent = 'No prepare response yet.';
    hidePrepareSummary();
    hideSiteRootDocumentPanel();
    hideHoldSection();
    hideSubmitSection();

    els.sendPrepareButton.disabled = false;
    els.copyDraftButton.disabled = false;
    els.copyPrepareButton.disabled = true;
    runtime.showFooter(`Built prepare draft for ${action.method} ${action.route}.`);
    return draft;
  }

  function buildPrepareBody(pageKind, fields, formData) {
    const raw = {};

    for (const field of fields) {
      const name = String(field.name || '').trim();

      if (!name) {
        continue;
      }

      const type = String(field.type || 'text').trim().toLowerCase();
      const value = workflowFieldValue(type, name, formData);

      if (value === null || value === undefined || value === '') {
        continue;
      }

      raw[name] = value;
    }

    const settings = runtime.getSettings();

    if (pageKind === 'image') {
      const file = raw.file instanceof File ? raw.file : null;
      currentImageFile = file;

      const bytes = Number(file?.size || 0);
      const contentType = String(file?.type || 'image/png').trim() || 'image/png';

      const body = {
        bytes,
        payer_account: settings.walletAccount || undefined,
        owner_passport_subject: settings.passportSubject || undefined,
        content_type: contentType,
        title: raw.title || undefined,
        description: raw.description || undefined,
        tags: Array.isArray(raw.tags) ? raw.tags : [],
        client_idempotency_key: stablePreviewIdempotencyKey(
          pageKind,
          file?.name || raw.title || `${bytes}-${contentType}`
        )
      };

      return stripUndefined(body);
    }

    if (pageKind === 'site') {
      currentImageFile = null;
      const siteName = String(raw.site_name || '').trim();
      const files = [{ path: 'index.html', bytes: 1024 }];

      const body = {
        site_name: siteName,
        files,
        payer_account: settings.walletAccount || undefined,
        owner_passport_subject: settings.passportSubject || undefined,
        owner_wallet_account: settings.walletAccount || undefined,
        title: raw.title || undefined,
        description: raw.description || undefined,
        client_idempotency_key: stablePreviewIdempotencyKey(pageKind, siteName || 'site-draft')
      };

      return stripUndefined(body);
    }

    currentImageFile = null;
    return stripUndefined({
      ...raw,
      owner_passport_subject: settings.passportSubject || undefined,
      payer_account: settings.walletAccount || undefined,
      client_idempotency_key: stablePreviewIdempotencyKey(pageKind, 'draft')
    });
  }

  function workflowFieldValue(type, name, formData) {
    const raw = formData.get(name);

    if (type === 'file') {
      if (raw instanceof File && raw.name) {
        return raw;
      }

      return null;
    }

    const text = String(raw || '').trim();

    if (type === 'tags') {
      return text
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);
    }

    return text;
  }

  async function sendPrepareRequest() {
    const draft = currentDraft || buildDraftPreview();

    if (!draft) {
      return;
    }

    const pageKind = draft.page_kind;
    const action = draft.action || {};
    const route = String(action.route || '');

    if (action.mutates) {
      els.preparePreview.textContent = 'Refused: mutating product actions require a separate explicit flow.';
      return;
    }

    runtime.setBusy(true);
    els.sendPrepareButton.disabled = true;
    hideSiteRootDocumentPanel();
    hideHoldSection();
    hideSubmitSection();
    els.preparePreview.textContent = `Sending ${action.method || 'POST'} ${route}...`;

    try {
      let response;
      const client = runtime.getClient();

      if (pageKind === 'image' && route === '/assets/image/prepare') {
        response = await client.prepareImageAsset(draft.request.body, {
          idempotencyKey: draft.request.body.client_idempotency_key
        });
      } else if (pageKind === 'site' && route === '/sites/prepare') {
        response = await client.prepareSite(draft.request.body, {
          idempotencyKey: draft.request.body.client_idempotency_key
        });
      } else {
        throw new Error(`Unsupported prepare route: ${route}`);
      }

      currentPrepareResponse = {
        schema: 'crablink.prepare-result.v1',
        sent: true,
        ok: true,
        route: response.route,
        status: response.status,
        correlation_id: response.correlationId,
        data: response.data
      };

      els.preparePreview.textContent = JSON.stringify(currentPrepareResponse, null, 2);
      renderPrepareSummary(currentPrepareResponse);
      buildWalletHoldPreview();
      els.copyPrepareButton.disabled = false;
      runtime.showFooter(`Prepare request succeeded. Correlation: ${response.correlationId}`);
    } catch (error) {
      currentPrepareResponse = {
        schema: 'crablink.prepare-result.v1',
        sent: true,
        ok: false,
        error: formatError(error),
        data: error?.data || null
      };

      els.preparePreview.textContent = JSON.stringify(currentPrepareResponse, null, 2);
      renderPrepareSummary(currentPrepareResponse);
      hideSiteRootDocumentPanel();
      hideHoldSection();
      hideSubmitSection();
      els.copyPrepareButton.disabled = false;
      runtime.showFooter('Prepare request failed.');
    } finally {
      runtime.setBusy(false);
      els.sendPrepareButton.disabled = false;
    }
  }

  function renderPrepareSummary(result) {
    clearChildren(els.prepareSummaryCards);
    clearChildren(els.prepareNextStepsList);
    els.prepareSummary.classList.remove('hidden');

    if (!result?.ok) {
      els.prepareStatusBadge.className = 'badge badge-bad';
      els.prepareStatusBadge.textContent = 'failed';
      els.prepareSummaryTitle.textContent = 'Prepare Failed';
      els.prepareSummaryDescription.textContent =
        'The gateway rejected the prepare request. The raw error remains available below.';

      addPrepareSummaryCard('Error', result?.error || '');
      addPrepareSummaryCard('Code', result?.data?.code || '');
      addPrepareSummaryCard('Reason', result?.data?.reason || '');
      addPrepareSummaryCard('Retryable', boolText(result?.data?.retryable));
      els.prepareNextSteps.classList.add('hidden');
      return;
    }

    const data = result.data || {};
    const pageKind = currentDraft?.page_kind || '';
    const amountMinor = prepareAmountMinor(data);
    const minimumHold = prepareMinimumHoldMinor(data);
    const guard = devPricingGuard(data, runtime.getSettings());

    els.prepareStatusBadge.className = guard.blocked ? 'badge badge-bad' : 'badge badge-ok';
    els.prepareStatusBadge.textContent = guard.blocked ? 'blocked' : 'prepared';
    els.prepareSummaryTitle.textContent =
      pageKind === 'image'
        ? 'Image Prepare Ready'
        : pageKind === 'site'
          ? 'Site Prepare Ready'
          : 'Prepare Ready';
    els.prepareSummaryDescription.textContent = guard.blocked
      ? guard.reason
      : 'The backend returned a non-mutating preflight response. Wallet hold and submit steps remain explicitly gated.';

    addPrepareSummaryCard('Schema', data.schema || '');
    addPrepareSummaryCard('Action', data.action || data.wallet_hold?.action || '');
    addPrepareSummaryCard('Asset', data.asset || data.wallet_hold?.currency || 'ROC');
    addPrepareSummaryCard(pageKind === 'site' ? 'Total bytes' : 'Bytes', data.total_bytes ?? data.bytes ?? '');
    addPrepareSummaryCard('Amount', formatRoc(amountMinor));
    addPrepareSummaryCard('Minimum hold', formatRoc(minimumHold));
    addPrepareSummaryCard(
      'Payer account',
      data.wallet_hold?.payer_account || data.payer_account || currentDraft?.request?.body?.payer_account || ''
    );
    addPrepareSummaryCard(
      'Idempotency hint',
      data.wallet_hold?.idempotency_key_hint || currentDraft?.request?.body?.client_idempotency_key || ''
    );

    if (guard.blocked) {
      addPrepareSummaryCard('Dev guard', 'Hold disabled');
      addPrepareSummaryCard('Returned amount', formatRoc(guard.amountMinor));
      addPrepareSummaryCard('Dev threshold', formatRoc(guard.thresholdMinor));
      addPrepareSummaryCard('Expected local dev price', '25 ROC');
    }

    renderNextSteps(data, pageKind, guard);
  }

  function renderNextSteps(data, pageKind, guard) {
    const steps = [];

    const holdRoute = deepPick(data, [
      ['next', 'create_hold'],
      ['next', 'wallet_hold'],
      ['wallet_hold', 'route']
    ]);

    if (holdRoute) {
      steps.push(`Create a wallet hold through ${holdRoute}.`);
    }

    const submitRoute = deepPick(data, [
      ['next', 'submit_upload'],
      ['next', 'submit_site'],
      ['next', 'submit_route'],
      ['next', 'create_site'],
      ['next', 'submit']
    ]);

    if (submitRoute) {
      steps.push(`After wallet hold confirmation, submit through ${submitRoute}.`);
    }

    const resolveRoute = deepPick(data, [
      ['next', 'resolve_after_upload'],
      ['next', 'resolve_after_launch'],
      ['next', 'resolve']
    ]);

    if (resolveRoute) {
      steps.push(`After create/upload, resolve the new page through ${resolveRoute}.`);
    }

    if (pageKind === 'image') {
      steps.push('The selected image File is retained in memory for the upload step.');
    }

    if (pageKind === 'site') {
      steps.push('Paste the root document CID into the Root Document panel before creating the site.');
    }

    if (guard?.blocked) {
      steps.push('Fix configs/roc-economics.dev.toml or restart the stack with RON_STORAGE_ROC_ECONOMICS_PATH before holding ROC.');
    }

    if (steps.length === 0) {
      els.prepareNextSteps.classList.add('hidden');
      return;
    }

    els.prepareNextSteps.classList.remove('hidden');

    for (const step of steps) {
      const li = document.createElement('li');
      li.textContent = step;
      els.prepareNextStepsList.append(li);
    }
  }

  function buildWalletHoldPreview() {
    const request = walletHoldRequestFromPrepare();

    currentHoldRequest = request;
    currentHoldResponse = null;
    currentUploadResult = null;
    currentReturnedUrl = '';

    if (!request) {
      hideSiteRootDocumentPanel();
      hideHoldSection();
      hideSubmitSection();
      return null;
    }

    const prepareData = currentPrepareResponse?.data || {};
    currentPricingGuard = devPricingGuard(prepareData, runtime.getSettings());

    if (currentDraft?.page_kind === 'site') {
      ensureSiteRootDocumentPanel();
    } else {
      hideSiteRootDocumentPanel();
    }

    els.holdSection.classList.remove('hidden');

    if (currentPricingGuard.blocked) {
      els.holdStatusBadge.className = 'badge badge-bad';
      els.holdStatusBadge.textContent = 'blocked';
      els.holdSummaryTitle.textContent = 'ROC Hold Blocked by Dev Safety Guard';
      els.holdSummaryDescription.textContent = currentPricingGuard.reason;
    } else {
      els.holdStatusBadge.className = 'badge badge-warn';
      els.holdStatusBadge.textContent = 'needs confirmation';
      els.holdSummaryTitle.textContent = 'Explicit ROC Hold Required';
      els.holdSummaryDescription.textContent =
        'CrabLink can now ask svc-wallet to hold ROC. Submit/upload remains locked behind the next explicit step.';
    }

    els.holdEscrowAccount.value = request.to || DEFAULT_HOLD_ESCROW_ACCOUNT;

    if (!Number.isSafeInteger(Number(els.holdNonce.value)) || Number(els.holdNonce.value) < 1) {
      els.holdNonce.value = String(request.nonce || 1);
    }

    renderHoldPreviewOnly(request);
    els.confirmHoldButton.disabled = currentPricingGuard.blocked;
    els.copyHoldButton.disabled = false;
    hideSubmitSection();

    return request;
  }

  function ensureSiteRootDocumentPanel() {
    let panel = document.getElementById('siteRootDocumentPanel');

    if (!panel) {
      panel = document.createElement('section');
      panel.id = 'siteRootDocumentPanel';
      panel.className = 'hold-summary';

      const head = document.createElement('div');
      head.className = 'summary-head';

      const left = document.createElement('div');

      const badge = document.createElement('span');
      badge.className = 'badge badge-warn';
      badge.textContent = 'required';

      const title = document.createElement('h4');
      title.textContent = 'Root Document CID';

      left.append(badge, title);

      const desc = document.createElement('p');
      desc.textContent =
        'Paste the stored site root document CID here. This must be canonical b3:<64 lowercase hex>. CrabLink references an existing object and does not call storage directly.';

      head.append(left, desc);

      const fields = document.createElement('div');
      fields.className = 'workflow-fields';

      const field = document.createElement('div');
      field.className = 'workflow-field full-width';

      const label = document.createElement('label');
      label.setAttribute('for', 'siteRootDocumentCid');
      label.textContent = 'Root document CID *';

      const input = document.createElement('input');
      input.id = 'siteRootDocumentCid';
      input.type = 'text';
      input.placeholder = 'b3:<64 lowercase hex>';
      input.autocomplete = 'off';
      input.spellcheck = false;

      const settings = runtime.getSettings();
      const recentCid = canonicalB3Cid(settings?.lastProductB3Cid);

      if (recentCid) {
        input.value = recentCid;
      }

      const help = document.createElement('p');
      help.className = 'workflow-help';
      help.textContent =
        'Use a b3:<64 lowercase hex> CID for an existing stored root object. If you just uploaded an asset, CrabLink may prefill the most recent b3 CID as a convenience.';

      input.addEventListener('input', () => {
        renderSubmitReadyIfPossible();
      });

      field.append(label, input, help);
      fields.append(field);
      panel.append(head, fields);

      els.workflowSection.insertBefore(panel, els.holdSection);
    }

    panel.classList.remove('hidden');
    return panel;
  }

  function hideSiteRootDocumentPanel() {
    const panel = document.getElementById('siteRootDocumentPanel');
    if (panel) {
      panel.classList.add('hidden');
    }
  }

  function currentRootDocumentCidFromForm() {
    const dynamic = document.getElementById('siteRootDocumentCid');
    const dynamicValue = canonicalB3Cid(dynamic?.value || '');

    if (dynamicValue) {
      return dynamicValue;
    }

    const field = els.workflowForm.querySelector('[name="root_document_cid"]');
    return canonicalB3Cid(field?.value || '');
  }

  function walletHoldRequestFromPrepare() {
    const prepareData = currentPrepareResponse?.data || null;

    if (!currentPrepareResponse?.ok || !prepareData) {
      return null;
    }

    const settings = runtime.getSettings();
    const amountMinor = String(prepareAmountMinor(prepareData) || '').trim();
    const payerAccount = String(
      prepareData.wallet_hold?.payer_account ||
        prepareData.payer_account ||
        currentDraft?.request?.body?.payer_account ||
        settings.walletAccount ||
        ''
    ).trim();

    if (!amountMinor || !/^[0-9]+$/.test(amountMinor) || amountMinor === '0' || !payerAccount) {
      return null;
    }

    const escrow = String(els.holdEscrowAccount?.value || DEFAULT_HOLD_ESCROW_ACCOUNT).trim();
    const nonce = Number(els.holdNonce?.value || 1);
    const safeNonce = Number.isSafeInteger(nonce) && nonce > 0 ? nonce : 1;
    const pageKind = currentDraft?.page_kind || 'page';
    const currentParsed = runtime.getCurrentParsed();
    const idemHint = String(
      prepareData.wallet_hold?.idempotency_key_hint ||
        currentDraft?.request?.body?.client_idempotency_key ||
        pageKind
    ).trim();

    return {
      schema: 'crablink.wallet-hold-request.v1',
      from: payerAccount,
      to: escrow || DEFAULT_HOLD_ESCROW_ACCOUNT,
      asset: 'roc',
      amount_minor: amountMinor,
      nonce: safeNonce,
      memo: `CrabLink ${pageKind} hold for ${currentDraft?.page_url || currentParsed?.url || ''}`,
      idempotency_key: stableIdempotencyKey(
        'wallet-hold',
        idemHint,
        payerAccount,
        escrow || DEFAULT_HOLD_ESCROW_ACCOUNT,
        amountMinor,
        safeNonce
      )
    };
  }

  function walletHoldApiBody(request) {
    return {
      from: request.from,
      to: request.to,
      asset: request.asset,
      amount_minor: request.amount_minor,
      nonce: request.nonce,
      memo: request.memo,
      idempotency_key: request.idempotency_key
    };
  }

  async function confirmWalletHold() {
    const request = walletHoldRequestFromPrepare();

    currentHoldRequest = request;

    if (!request) {
      els.holdPreview.textContent =
        'Cannot build wallet hold request. Prepare response is missing payer account or positive amount.';
      return;
    }

    currentPricingGuard = devPricingGuard(currentPrepareResponse?.data || {}, runtime.getSettings());

    if (currentPricingGuard.blocked) {
      renderHoldPreviewOnly(request);
      els.confirmHoldButton.disabled = true;
      runtime.showFooter('Wallet hold blocked by dev pricing guard.');
      return;
    }

    const confirmed = window.confirm(
      [
        'Confirm ROC hold?',
        '',
        `Amount: ${formatRoc(request.amount_minor)} ROC`,
        `From: ${request.from}`,
        `Escrow: ${request.to}`,
        `Nonce: ${request.nonce}`,
        '',
        'This creates a wallet hold through svc-wallet.',
        'It does not upload bytes, create a site/image, capture ROC, or mutate storage/index directly.'
      ].join('\n')
    );

    if (!confirmed) {
      runtime.showFooter('Wallet hold cancelled by user.');
      return;
    }

    runtime.setBusy(true);
    els.confirmHoldButton.disabled = true;
    els.holdPreview.textContent = `Creating wallet hold for ${formatRoc(request.amount_minor)} ROC...`;

    try {
      const result = await createWalletHoldWithVisibleNonceRecovery(request);
      currentHoldResponse = result;

      renderHoldResult(currentHoldResponse);
      advanceHoldNonceAfterSuccess(currentHoldResponse.request);
      renderSubmitReadyIfPossible();
      await runtime.refreshBalanceAfterMutation();
      runtime.showFooter(`Wallet hold created. Correlation: ${result.correlation_id || 'n/a'}`);
    } catch (error) {
      currentHoldResponse = {
        schema: 'crablink.wallet-hold-result.v1',
        sent: true,
        ok: false,
        request,
        error: formatError(error),
        data: error?.data || null
      };

      renderHoldResult(currentHoldResponse);
      applySuggestedNonceFromError(error?.data);
      hideSubmitSection();
      runtime.showFooter('Wallet hold failed.');
    } finally {
      runtime.setBusy(false);
      els.confirmHoldButton.disabled = currentPricingGuard?.blocked === true;
    }
  }

  async function createWalletHoldWithVisibleNonceRecovery(firstRequest) {
    const first = await createWalletHoldOnce(firstRequest);

    if (first.ok) {
      return first;
    }

    const suggested = expectedNonceFromProblem(first.data);

    if (!suggested || suggested === firstRequest.nonce) {
      throw responseResultToError(first);
    }

    els.holdNonce.value = String(suggested);

    const retryRequest = walletHoldRequestFromPrepare();

    if (!retryRequest) {
      throw responseResultToError(first);
    }

    els.holdPreview.textContent = JSON.stringify(
      {
        schema: 'crablink.wallet-hold-nonce-retry.v1',
        first_attempt: first,
        nonce_recovery: {
          reason: 'svc-wallet returned a NONCE_CONFLICT with an expected nonce.',
          expected_nonce: suggested,
          action: 'CrabLink filled the expected nonce and is retrying once.'
        },
        retry_request: retryRequest
      },
      null,
      2
    );

    const retry = await createWalletHoldOnce(retryRequest, `retry-nonce-${suggested}`);

    if (retry.ok) {
      retry.nonce_recovery = {
        first_nonce: firstRequest.nonce,
        expected_nonce: suggested,
        retried: true
      };
      return retry;
    }

    throw responseResultToError(retry);
  }

  async function createWalletHoldOnce(request, suffix = '') {
    try {
      const client = runtime.getClient();
      const apiRequest = walletHoldApiBody(request);
      const response = await client.createWalletHold(apiRequest, {
        idempotencyKey: request.idempotency_key
      });

      return {
        schema: 'crablink.wallet-hold-result.v1',
        sent: true,
        ok: true,
        route: response.route,
        status: response.status,
        correlation_id: response.correlationId,
        request,
        api_request: apiRequest,
        data: response.data,
        attempt: suffix || 'initial'
      };
    } catch (error) {
      return {
        schema: 'crablink.wallet-hold-result.v1',
        sent: true,
        ok: false,
        status: error?.status || 0,
        route: error?.route || '/wallet/hold',
        correlation_id: error?.correlationId || '',
        request,
        error: formatError(error),
        data: error?.data || null,
        attempt: suffix || 'initial'
      };
    }
  }

  function responseResultToError(result) {
    const error = new Error(result?.error || 'Wallet hold failed.');
    error.status = result?.status || 0;
    error.route = result?.route || '/wallet/hold';
    error.correlationId = result?.correlation_id || '';
    error.data = result?.data || null;
    return error;
  }

  function advanceHoldNonceAfterSuccess(request) {
    const nonce = Number(request?.nonce || 0);

    if (!Number.isSafeInteger(nonce) || nonce < 1) {
      return;
    }

    els.holdNonce.value = String(nonce + 1);
  }

  function applySuggestedNonceFromError(data) {
    const suggested = expectedNonceFromProblem(data);

    if (!suggested) {
      return;
    }

    els.holdNonce.value = String(suggested);
    rebuildHoldPreviewFromInputs();
  }

  function renderHoldPreviewOnly(request) {
    clearChildren(els.holdSummaryCards);

    addHoldSummaryCard('Status', currentPricingGuard?.blocked ? 'Blocked' : 'Not sent');
    addHoldSummaryCard('From', request.from);
    addHoldSummaryCard('Escrow', request.to);
    addHoldSummaryCard('Amount', formatRoc(request.amount_minor));
    addHoldSummaryCard('Nonce', request.nonce);
    addHoldSummaryCard('Idempotency', request.idempotency_key);

    if (currentPricingGuard?.blocked) {
      addHoldSummaryCard('Dev safety guard', 'Hold disabled');
      addHoldSummaryCard('Returned amount', formatRoc(currentPricingGuard.amountMinor));
      addHoldSummaryCard('Dev threshold', formatRoc(currentPricingGuard.thresholdMinor));
      addHoldSummaryCard('Expected local dev price', '25 ROC');
    }

    els.holdPreview.textContent = JSON.stringify(
      {
        safety: {
          note: currentPricingGuard?.blocked
            ? currentPricingGuard.reason
            : 'Preview only. Click Confirm ROC Hold to call /wallet/hold.',
          no_upload: true,
          no_create: true,
          no_capture: true,
          dev_pricing_guard: currentPricingGuard || null
        },
        request
      },
      null,
      2
    );
  }

  function renderHoldResult(result) {
    clearChildren(els.holdSummaryCards);

    if (!result?.ok) {
      els.holdStatusBadge.className = 'badge badge-bad';
      els.holdStatusBadge.textContent = 'failed';
      els.holdSummaryTitle.textContent = 'Wallet Hold Failed';
      els.holdSummaryDescription.textContent =
        'The backend rejected the hold request. Nothing was uploaded or created.';

      addHoldSummaryCard('Error', result?.error || '');
      addHoldSummaryCard('Code', result?.data?.code || '');
      addHoldSummaryCard('Reason', result?.data?.reason || '');
      addHoldSummaryCard('Retryable', boolText(result?.data?.retryable));

      const suggestedNonce = expectedNonceFromProblem(result?.data);
      if (suggestedNonce) {
        addHoldSummaryCard('Suggested nonce', suggestedNonce);
        addHoldSummaryCard('Nonce field updated', 'true');
      }

      els.holdPreview.textContent = JSON.stringify(result, null, 2);
      els.copyHoldButton.disabled = false;
      return;
    }

    els.holdStatusBadge.className = result.nonce_recovery?.retried ? 'badge badge-warn' : 'badge badge-ok';
    els.holdStatusBadge.textContent = result.nonce_recovery?.retried ? 'held after retry' : 'held';
    els.holdSummaryTitle.textContent = 'ROC Hold Created';
    els.holdSummaryDescription.textContent =
      'svc-wallet returned a hold response. Submit/upload remains a separate explicit action.';

    const data = result.data || {};
    const receiptId = data.receipt_id || data.receiptId || data.id || data.txid || data.tx_id || '';
    const holdId = data.hold_id || data.holdId || data.txid || data.tx_id || '';

    addHoldSummaryCard('Status', 'Created');
    addHoldSummaryCard('HTTP', result.status || '');
    addHoldSummaryCard('Receipt', receiptId);
    addHoldSummaryCard('Hold ID', holdId);
    addHoldSummaryCard('From', result.request?.from || '');
    addHoldSummaryCard('Escrow', result.request?.to || '');
    addHoldSummaryCard('Amount', formatRoc(result.request?.amount_minor));
    addHoldSummaryCard('Nonce used', result.request?.nonce || '');
    addHoldSummaryCard('Next local nonce', Number(result.request?.nonce || 0) + 1);
    addHoldSummaryCard('Correlation', result.correlation_id || '');

    if (result.nonce_recovery?.retried) {
      addHoldSummaryCard('Nonce recovery', 'retried once');
      addHoldSummaryCard('Original nonce', result.nonce_recovery.first_nonce);
      addHoldSummaryCard('Expected nonce', result.nonce_recovery.expected_nonce);
    }

    els.holdPreview.textContent = JSON.stringify(result, null, 2);
    els.copyHoldButton.disabled = false;
  }

  function renderSubmitReadyIfPossible() {
    const pageKind = currentDraft?.page_kind || '';

    if (pageKind === 'image') {
      renderImageSubmitReady(paidProofFromHoldResponse());
      return;
    }

    if (pageKind === 'site') {
      renderSiteSubmitReady(paidProofFromHoldResponse());
      return;
    }

    hideSubmitSection();
  }

  function renderImageSubmitReady(paidProof) {
    els.submitSection.classList.remove('hidden');
    clearChildren(els.submitSummaryCards);
    currentUploadResult = null;
    currentReturnedUrl = '';
    els.submitProductButton.textContent = 'Submit Image Upload';

    if (!currentImageFile) {
      els.submitStatusBadge.className = 'badge badge-bad';
      els.submitStatusBadge.textContent = 'missing file';
      els.submitSummaryTitle.textContent = 'Image Upload Blocked';
      els.submitSummaryDescription.textContent =
        'Select an image file, rebuild the draft, prepare, and create a hold.';
      disableSubmitControls();
      els.submitPreview.textContent = 'No selected File is retained in memory.';
      return;
    }

    if (!paidProof) {
      els.submitStatusBadge.className = 'badge badge-bad';
      els.submitStatusBadge.textContent = 'missing proof';
      els.submitSummaryTitle.textContent = 'Image Upload Blocked';
      els.submitSummaryDescription.textContent =
        'The wallet hold response is missing txid, receipt_hash, payer, escrow, or amount.';
      disableSubmitControls();
      els.submitPreview.textContent = JSON.stringify(
        {
          reason: 'missing paid proof',
          hold_response: currentHoldResponse
        },
        null,
        2
      );
      return;
    }

    els.submitStatusBadge.className = 'badge badge-warn';
    els.submitStatusBadge.textContent = 'ready';
    els.submitSummaryTitle.textContent = 'Image Upload Ready';
    els.submitSummaryDescription.textContent =
      'This will upload the selected image bytes using the confirmed wallet hold. Storage/index/manifest work remains backend-owned.';

    addSubmitSummaryCard('File', currentImageFile.name || 'selected image');
    addSubmitSummaryCard('Bytes', currentImageFile.size);
    addSubmitSummaryCard('Content-Type', currentImageFile.type || 'image/png');
    addSubmitSummaryCard('Txid', paidProof.txid);
    addSubmitSummaryCard('Receipt hash', paidProof.receipt_hash);
    addSubmitSummaryCard('Amount', formatRoc(paidProof.amount_minor));
    addSubmitSummaryCard('Payer', paidProof.from);
    addSubmitSummaryCard('Escrow', paidProof.to);

    enableSubmitControls();

    els.submitPreview.textContent = JSON.stringify(
      {
        schema: 'crablink.image-upload-preview.v1',
        safety: {
          requires_click: true,
          raw_file_body: true,
          no_direct_storage_call: true,
          no_direct_index_call: true,
          no_direct_ledger_call: true
        },
        route: '/assets/image',
        method: 'POST'
      },
      null,
      2
    );
  }

  function renderSiteSubmitReady(paidProof) {
    ensureSiteRootDocumentPanel();
    els.submitSection.classList.remove('hidden');
    clearChildren(els.submitSummaryCards);
    currentUploadResult = null;
    currentReturnedUrl = '';
    els.submitProductButton.textContent = 'Create Site';

    const createBody = siteCreateBodyFromDraft();

    if (!createBody) {
      els.submitStatusBadge.className = 'badge badge-bad';
      els.submitStatusBadge.textContent = 'missing root';
      els.submitSummaryTitle.textContent = 'Site Create Blocked';
      els.submitSummaryDescription.textContent =
        'Paste a canonical Root document CID above before creating the site.';
      disableSubmitControls();
      els.submitPreview.textContent = JSON.stringify(
        {
          reason: 'missing root_document_cid',
          required_format: 'b3:<64 lowercase hex>',
          note: 'This batch references an existing root object. CrabLink does not call svc-storage directly.'
        },
        null,
        2
      );
      return;
    }

    if (!paidProof) {
      els.submitStatusBadge.className = 'badge badge-bad';
      els.submitStatusBadge.textContent = 'missing proof';
      els.submitSummaryTitle.textContent = 'Site Create Blocked';
      els.submitSummaryDescription.textContent =
        'The wallet hold response is missing txid, receipt_hash, payer, escrow, or amount.';
      disableSubmitControls();
      els.submitPreview.textContent = JSON.stringify(
        {
          reason: 'missing paid proof',
          hold_response: currentHoldResponse
        },
        null,
        2
      );
      return;
    }

    els.submitStatusBadge.className = 'badge badge-warn';
    els.submitStatusBadge.textContent = 'ready';
    els.submitSummaryTitle.textContent = 'Site Create Ready';
    els.submitSummaryDescription.textContent =
      'This will submit /sites with the confirmed wallet hold. The backend stores the site manifest and writes the name pointer.';

    addSubmitSummaryCard('Site name', createBody.site_name);
    addSubmitSummaryCard('Root document CID', createBody.root_document_cid);
    addSubmitSummaryCard('Title', createBody.title || '');
    addSubmitSummaryCard('Txid', paidProof.txid);
    addSubmitSummaryCard('Receipt hash', paidProof.receipt_hash);
    addSubmitSummaryCard('Amount', formatRoc(paidProof.amount_minor));
    addSubmitSummaryCard('Payer', paidProof.from);
    addSubmitSummaryCard('Escrow', paidProof.to);

    enableSubmitControls();

    els.submitPreview.textContent = JSON.stringify(
      {
        schema: 'crablink.site-create-preview.v1',
        safety: {
          requires_click: true,
          no_direct_storage_call: true,
          no_direct_index_call: true,
          no_direct_ledger_call: true,
          site_stores_references: true
        },
        route: '/sites',
        method: 'POST',
        request_body: createBody
      },
      null,
      2
    );
  }

  function enableSubmitControls() {
    els.submitProductButton.disabled = false;
    els.copySubmitButton.disabled = true;
    els.openReturnedPageButton.disabled = true;
    els.copyReturnedUrlButton.disabled = true;
  }

  function disableSubmitControls() {
    els.submitProductButton.disabled = true;
    els.copySubmitButton.disabled = true;
    els.openReturnedPageButton.disabled = true;
    els.copyReturnedUrlButton.disabled = true;
  }

  function siteCreateBodyFromDraft() {
    const body = currentDraft?.request?.body || {};
    const rootDocumentCid = currentRootDocumentCidFromForm();

    if (!canonicalB3Cid(rootDocumentCid)) {
      return null;
    }

    const siteName = String(body.site_name || '').trim();

    if (!siteName) {
      return null;
    }

    return stripUndefined({
      site_name: siteName,
      root_document_cid: rootDocumentCid,
      owner_passport_subject:
        body.owner_passport_subject || runtime.getSettings()?.passportSubject || undefined,
      owner_wallet_account: body.owner_wallet_account || runtime.getSettings()?.walletAccount || undefined,
      title: body.title || undefined,
      description: body.description || undefined,
      route_map: {
        '/': rootDocumentCid
      },
      asset_map: {
        'index.html': rootDocumentCid
      },
      receipt_refs: []
    });
  }

  function paidProofFromHoldResponse() {
    if (!currentHoldResponse?.ok || !currentHoldResponse?.data || !currentHoldResponse?.request) {
      return null;
    }

    const data = currentHoldResponse.data;
    const request = currentHoldResponse.request;

    const proof = {
      txid: String(data.txid || data.tx_id || data.hold_id || data.id || '').trim(),
      receipt_hash: String(data.receipt_hash || data.receiptHash || data.hash || '').trim(),
      from: String(data.from || request.from || '').trim(),
      to: String(data.to || request.to || '').trim(),
      amount_minor: String(data.amount_minor || data.amountMinor || request.amount_minor || '').trim(),
      asset: String(data.asset || request.asset || 'roc').trim().toLowerCase(),
      op: String(data.op || 'hold').trim().toLowerCase(),
      idem: String(data.idem || data.idempotency_key || request.idempotency_key || '').trim()
    };

    if (
      !proof.txid ||
      !proof.receipt_hash ||
      !proof.from ||
      !proof.to ||
      !proof.amount_minor ||
      !/^[0-9]+$/.test(proof.amount_minor) ||
      proof.amount_minor === '0'
    ) {
      return null;
    }

    return proof;
  }

  async function submitProduct() {
    const pageKind = currentDraft?.page_kind || '';

    if (pageKind === 'image') {
      await submitImageUpload();
      return;
    }

    if (pageKind === 'site') {
      await submitSiteCreate();
      return;
    }

    runtime.showFooter('No submit flow is enabled for this page kind yet.');
  }

  async function submitSiteCreate() {
    const paidProof = paidProofFromHoldResponse();
    const createBody = siteCreateBodyFromDraft();

    if (!paidProof || !createBody) {
      renderSubmitReadyIfPossible();
      return;
    }

    const confirmed = window.confirm(
      [
        'Create RON site?',
        '',
        `Site: ${createBody.site_name}`,
        `Root document: ${createBody.root_document_cid}`,
        `Paid proof txid: ${paidProof.txid}`,
        '',
        'This sends a strict JSON create request to svc-gateway /sites.',
        'The backend stores the manifest and writes the site name pointer.'
      ].join('\n')
    );

    if (!confirmed) {
      runtime.showFooter('Site create cancelled by user.');
      return;
    }

    runtime.setBusy(true);
    els.submitProductButton.disabled = true;
    els.submitStatusBadge.className = 'badge badge-warn';
    els.submitStatusBadge.textContent = 'creating';
    els.submitPreview.textContent = `Creating site ${createBody.site_name}...`;

    try {
      const client = runtime.getClient();
      const response = await client.createSite(createBody, {
        paidProof,
        idempotencyKey:
          paidProof.idem ||
          currentDraft?.request?.body?.client_idempotency_key ||
          stablePreviewIdempotencyKey('site-create', createBody.site_name)
      });

      currentUploadResult = {
        schema: 'crablink.site-create-result.v1',
        sent: true,
        ok: true,
        route: response.route,
        status: response.status,
        correlation_id: response.correlationId,
        data: response.data
      };

      currentReturnedUrl = extractReturnedCrabUrl(response.data) || `crab://${createBody.site_name}`;
      renderSiteCreateResult(currentUploadResult);
      await rememberProductState(response.data);
      await runtime.refreshBalanceAfterMutation();
      scheduleAutoOpenReturnedPage('site');
      runtime.showFooter(`Site created. Opening returned page. Correlation: ${response.correlationId}`);
    } catch (error) {
      currentUploadResult = {
        schema: 'crablink.site-create-result.v1',
        sent: true,
        ok: false,
        error: formatError(error),
        data: error?.data || null
      };

      currentReturnedUrl = '';
      renderSiteCreateResult(currentUploadResult);
      runtime.showFooter('Site create failed.');
    } finally {
      runtime.setBusy(false);
      els.submitProductButton.disabled = false;
    }
  }

  async function submitImageUpload() {
    const paidProof = paidProofFromHoldResponse();

    if (!currentImageFile || !paidProof) {
      renderSubmitReadyIfPossible();
      return;
    }

    const title = currentDraft?.request?.body?.title || '';
    const description = currentDraft?.request?.body?.description || '';
    const tags = currentDraft?.request?.body?.tags || [];

    const confirmed = window.confirm(
      [
        'Submit image upload?',
        '',
        `File: ${currentImageFile.name || 'selected image'}`,
        `Bytes: ${currentImageFile.size}`,
        `Content-Type: ${currentImageFile.type || 'image/png'}`,
        `Paid proof txid: ${paidProof.txid}`,
        '',
        'This sends raw image bytes to svc-gateway /assets/image.',
        'The backend coordinates paid storage, manifest creation, and index pointer writing.'
      ].join('\n')
    );

    if (!confirmed) {
      runtime.showFooter('Image upload cancelled by user.');
      return;
    }

    runtime.setBusy(true);
    els.submitProductButton.disabled = true;
    els.submitStatusBadge.className = 'badge badge-warn';
    els.submitStatusBadge.textContent = 'uploading';
    els.submitPreview.textContent = `Uploading ${currentImageFile.name || 'selected image'}...`;

    try {
      const client = runtime.getClient();
      const response = await client.uploadImageAsset({
        file: currentImageFile,
        title,
        description,
        tags,
        paidProof,
        idempotencyKey:
          paidProof.idem ||
          currentDraft?.request?.body?.client_idempotency_key ||
          stablePreviewIdempotencyKey('image-upload', currentImageFile.name || paidProof.txid)
      });

      currentUploadResult = {
        schema: 'crablink.image-upload-result.v1',
        sent: true,
        ok: true,
        route: response.route,
        status: response.status,
        correlation_id: response.correlationId,
        data: response.data
      };

      currentReturnedUrl = extractReturnedCrabUrl(response.data);
      renderUploadResult(currentUploadResult);
      await rememberProductState(response.data);
      await runtime.refreshBalanceAfterMutation();
      scheduleAutoOpenReturnedPage('image');
      runtime.showFooter(`Image upload complete. Opening asset page. Correlation: ${response.correlationId}`);
    } catch (error) {
      currentUploadResult = {
        schema: 'crablink.image-upload-result.v1',
        sent: true,
        ok: false,
        error: formatError(error),
        data: error?.data || null
      };

      currentReturnedUrl = '';
      renderUploadResult(currentUploadResult);
      runtime.showFooter('Image upload failed.');
    } finally {
      runtime.setBusy(false);
      els.submitProductButton.disabled = false;
    }
  }

  function scheduleAutoOpenReturnedPage(kind) {
    clearAutoOpenTimer();

    if (!currentReturnedUrl) {
      return;
    }

    autoOpenTimer = window.setTimeout(() => {
      runtime.navigateTo(currentReturnedUrl);
    }, kind === 'site' ? 900 : 700);
  }

  function clearAutoOpenTimer() {
    if (autoOpenTimer) {
      window.clearTimeout(autoOpenTimer);
      autoOpenTimer = 0;
    }
  }

  function renderSiteCreateResult(result) {
    clearChildren(els.submitSummaryCards);
    els.submitSection.classList.remove('hidden');
    els.submitProductButton.textContent = 'Create Site';

    if (!result?.ok) {
      els.submitStatusBadge.className = 'badge badge-bad';
      els.submitStatusBadge.textContent = 'failed';
      els.submitSummaryTitle.textContent = 'Site Create Failed';
      els.submitSummaryDescription.textContent =
        'The backend rejected the site create request. Nothing was opened automatically.';

      addSubmitSummaryCard('Error', result?.error || '');
      addSubmitSummaryCard('Code', result?.data?.code || '');
      addSubmitSummaryCard('Reason', result?.data?.reason || '');
      addSubmitSummaryCard('Retryable', boolText(result?.data?.retryable));

      els.submitPreview.textContent = JSON.stringify(result, null, 2);
      els.copySubmitButton.disabled = false;
      els.openReturnedPageButton.disabled = true;
      els.copyReturnedUrlButton.disabled = true;
      return;
    }

    const data = result.data || {};
    currentReturnedUrl = extractReturnedCrabUrl(data);

    els.submitStatusBadge.className = 'badge badge-ok';
    els.submitStatusBadge.textContent = 'created';
    els.submitSummaryTitle.textContent = 'Site Created';
    els.submitSummaryDescription.textContent =
      'RustyOnions created the site manifest, stored the index pointer, and returned the new crab:// site link. CrabLink will open it automatically.';

    addSubmitSummaryCard('Schema', data.schema || '');
    addSubmitSummaryCard('Site name', data.site_name || '');
    addSubmitSummaryCard('Root document CID', data.root_document_cid || '');
    addSubmitSummaryCard('Manifest CID', data.manifest?.manifest_cid || '');
    addSubmitSummaryCard('Manifest status', data.manifest?.status || '');
    addSubmitSummaryCard('Index pointer', data.index_pointer?.status || '');
    addSubmitSummaryCard('crab URL', currentReturnedUrl);
    addSubmitSummaryCard('Correlation', result.correlation_id || '');

    els.submitPreview.textContent = JSON.stringify(result, null, 2);
    els.copySubmitButton.disabled = false;
    els.openReturnedPageButton.disabled = !currentReturnedUrl;
    els.copyReturnedUrlButton.disabled = !currentReturnedUrl;
  }

  function renderUploadResult(result) {
    clearChildren(els.submitSummaryCards);
    els.submitSection.classList.remove('hidden');

    if (!result?.ok) {
      els.submitStatusBadge.className = 'badge badge-bad';
      els.submitStatusBadge.textContent = 'failed';
      els.submitSummaryTitle.textContent = 'Image Upload Failed';
      els.submitSummaryDescription.textContent =
        'The backend rejected the upload. The selected file remains local in memory until you clear or reload.';

      addSubmitSummaryCard('Error', result?.error || '');
      addSubmitSummaryCard('Code', result?.data?.code || '');
      addSubmitSummaryCard('Reason', result?.data?.reason || '');
      addSubmitSummaryCard('Retryable', boolText(result?.data?.retryable));

      els.submitPreview.textContent = JSON.stringify(result, null, 2);
      els.copySubmitButton.disabled = false;
      els.openReturnedPageButton.disabled = true;
      els.copyReturnedUrlButton.disabled = true;
      return;
    }

    const data = result.data || {};
    currentReturnedUrl = extractReturnedCrabUrl(data);

    els.submitStatusBadge.className = 'badge badge-ok';
    els.submitStatusBadge.textContent = 'uploaded';
    els.submitSummaryTitle.textContent = 'Image Uploaded';
    els.submitSummaryDescription.textContent =
      'RustyOnions accepted the image, created the b3-backed product response, and returned the new asset link. CrabLink will open it automatically.';

    addSubmitSummaryCard('Schema', data.schema || '');
    addSubmitSummaryCard('Asset CID', data.asset_cid || data.cid || data.asset?.cid || '');
    addSubmitSummaryCard(
      'Manifest CID',
      data.manifest_cid || data.manifest?.manifest_cid || data.manifest?.cid || ''
    );
    addSubmitSummaryCard('crab URL', currentReturnedUrl);
    addSubmitSummaryCard('Storage', data.storage?.available === true ? 'available' : data.storage?.status || '');
    addSubmitSummaryCard('Index pointer', data.index?.status || data.pointer?.status || '');
    addSubmitSummaryCard('Receipt txid', data.receipt?.txid || data.txid || data.tx_id || '');
    addSubmitSummaryCard('Correlation', result.correlation_id || '');

    els.submitPreview.textContent = JSON.stringify(result, null, 2);
    els.copySubmitButton.disabled = false;
    els.openReturnedPageButton.disabled = !currentReturnedUrl;
    els.copyReturnedUrlButton.disabled = !currentReturnedUrl;
  }

  function extractReturnedCrabUrl(data) {
    return String(
      data?.crab_url ||
        data?.links?.crab ||
        data?.site_url ||
        data?.site?.crab_url ||
        data?.asset?.crab_url ||
        data?.asset_page?.crab_url ||
        data?.url ||
        ''
    ).trim();
  }

  async function openReturnedPage() {
    if (!currentReturnedUrl) {
      return;
    }

    clearAutoOpenTimer();
    await runtime.navigateTo(currentReturnedUrl);
  }

  async function copyReturnedUrl() {
    if (!currentReturnedUrl) {
      return;
    }

    await runtime.copyText(currentReturnedUrl);
  }

  function formatRoc(value) {
    const raw = String(value ?? '').trim();

    if (!raw) {
      return '';
    }

    return formatMinorUnits(raw);
  }

  function addPrepareSummaryCard(label, value) {
    addCard(els.prepareSummaryCards, label, value, 'summary-card');
  }

  function addHoldSummaryCard(label, value) {
    addCard(els.holdSummaryCards, label, value, 'summary-card');
  }

  function addSubmitSummaryCard(label, value) {
    addCard(els.submitSummaryCards, label, value, 'summary-card');
  }

  function addCard(parent, label, value, className) {
    const clean = value === undefined || value === null ? '' : String(value);

    if (!clean) {
      return;
    }

    const card = document.createElement('div');
    card.className = className;

    const key = document.createElement('span');
    key.textContent = label;

    const val = document.createElement('strong');
    val.textContent = clean;

    card.append(key, val);
    parent.append(card);
  }

  function hideHoldSection() {
    currentHoldRequest = null;
    currentHoldResponse = null;
    currentPricingGuard = null;
    els.holdSection.classList.add('hidden');
    clearChildren(els.holdSummaryCards);
    els.holdPreview.textContent = 'No wallet hold created yet.';
    els.confirmHoldButton.disabled = true;
    els.copyHoldButton.disabled = true;
    els.holdStatusBadge.className = 'badge badge-muted';
    els.holdStatusBadge.textContent = 'hold';
  }

  function hideSubmitSection() {
    currentUploadResult = null;
    currentReturnedUrl = '';
    clearAutoOpenTimer();
    els.submitProductButton.textContent = 'Submit Product';
    els.submitSection.classList.add('hidden');
    clearChildren(els.submitSummaryCards);
    els.submitPreview.textContent = 'No submit response yet.';
    els.submitProductButton.disabled = true;
    els.copySubmitButton.disabled = true;
    els.openReturnedPageButton.disabled = true;
    els.copyReturnedUrlButton.disabled = true;
    els.submitStatusBadge.className = 'badge badge-muted';
    els.submitStatusBadge.textContent = 'submit';
  }

  function hidePrepareSummary() {
    els.prepareSummary.classList.add('hidden');
    clearChildren(els.prepareSummaryCards);
    clearChildren(els.prepareNextStepsList);
    els.prepareNextSteps.classList.add('hidden');
  }

  function resetDraftPreview({ clearFile = false } = {}) {
    currentDraft = null;
    currentPrepareResponse = null;
    currentHoldRequest = null;
    currentHoldResponse = null;
    currentUploadResult = null;
    currentReturnedUrl = '';
    currentPricingGuard = null;
    clearAutoOpenTimer();

    if (clearFile) {
      currentImageFile = null;
    }

    els.workflowPreview.textContent = 'No request draft built yet.';
    els.preparePreview.textContent = 'No prepare response yet.';
    hidePrepareSummary();
    hideSiteRootDocumentPanel();
    hideHoldSection();
    hideSubmitSection();
    els.sendPrepareButton.disabled = true;
    els.copyDraftButton.disabled = true;
    els.copyPrepareButton.disabled = true;
  }

  function clearWorkflow() {
    runtime.setCurrentBuiltinPayload(null);
    clearChildren(els.workflowFields);
    resetDraftPreview({ clearFile: true });
    els.workflowSection.classList.add('hidden');
  }

  function rebuildHoldPreviewFromInputs() {
    if (currentPrepareResponse?.ok) {
      buildWalletHoldPreview();
    }
  }

  function setBusyState(isBusy) {
    if (currentPricingGuard?.blocked) {
      els.confirmHoldButton.disabled = true;
    } else {
      els.confirmHoldButton.disabled = Boolean(isBusy) || !currentHoldRequest;
    }

    if (currentDraft?.page_kind === 'image') {
      els.submitProductButton.disabled = Boolean(isBusy) || !currentHoldResponse?.ok || !currentImageFile;
      return;
    }

    if (currentDraft?.page_kind === 'site') {
      els.submitProductButton.disabled = Boolean(isBusy) || !currentHoldResponse?.ok || !siteCreateBodyFromDraft();
      return;
    }

    els.submitProductButton.disabled = true;
  }

  async function copyDraft() {
    if (currentDraft) {
      await runtime.copyText(JSON.stringify(currentDraft, null, 2));
    }
  }

  async function copyPrepare() {
    if (currentPrepareResponse) {
      await runtime.copyText(JSON.stringify(currentPrepareResponse, null, 2));
    }
  }

  async function copyHold() {
    if (currentHoldResponse) {
      await runtime.copyText(JSON.stringify(currentHoldResponse, null, 2));
      return;
    }

    if (currentHoldRequest) {
      await runtime.copyText(JSON.stringify(currentHoldRequest, null, 2));
    }
  }

  async function copySubmit() {
    if (currentUploadResult) {
      await runtime.copyText(JSON.stringify(currentUploadResult, null, 2));
    }
  }

  function canUseHoldNonce(value) {
    return isPositiveIntegerString(value);
  }

  return {
    renderWorkflow,
    buildDraftPreview,
    sendPrepareRequest,
    resetDraftPreview,
    clearWorkflow,
    confirmWalletHold,
    rebuildHoldPreviewFromInputs,
    submitProduct,
    openReturnedPage,
    copyReturnedUrl,
    setBusyState,
    copyDraft,
    copyPrepare,
    copyHold,
    copySubmit,
    getCurrentDraft: () => currentDraft,
    getCurrentPrepareResponse: () => currentPrepareResponse,
    getCurrentHoldRequest: () => currentHoldRequest,
    getCurrentHoldResponse: () => currentHoldResponse,
    getCurrentImageFile: () => currentImageFile,
    getCurrentUploadResult: () => currentUploadResult,
    canUseHoldNonce
  };
}
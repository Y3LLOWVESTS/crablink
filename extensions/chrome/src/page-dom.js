/**
 * RO:WHAT — DOM lookup table for the CrabLink full-tab browser shell.
 * RO:WHY — App Integration; Concerns: DX/RES; keep element ownership explicit and fail fast on drift.
 * RO:INTERACTS — page.html, page.js, page-workflow.js.
 * RO:INVARIANTS — no innerHTML; missing required elements fail at startup; rendering uses textContent.
 * RO:METRICS — none.
 * RO:CONFIG — none.
 * RO:SECURITY — prevents accidental backend HTML/script injection by centralizing text-only rendering helpers.
 * RO:TEST — scripts/check-chrome.sh; manual full-tab load.
 */

export const els = {
  addressForm: byId('addressForm'),
  addressInput: byId('addressInput'),
  goButton: byId('goButton'),
  backButton: byId('backButton'),
  forwardButton: byId('forwardButton'),
  homeButton: byId('homeButton'),
  refreshButton: byId('refreshButton'),
  passportButton: byId('passportButton'),
  settingsButton: byId('settingsButton'),
  topRocBalance: byId('topRocBalance'),

  passportDrawer: byId('passportDrawer'),
  closePassportButton: byId('closePassportButton'),
  drawerGateway: byId('drawerGateway'),
  drawerPassport: byId('drawerPassport'),
  drawerWallet: byId('drawerWallet'),
  drawerRoc: byId('drawerRoc'),
  drawerLedger: byId('drawerLedger'),
  drawerCheckNodeButton: byId('drawerCheckNodeButton'),
  drawerRefreshIdentityButton: byId('drawerRefreshIdentityButton'),
  drawerRefreshBalanceButton: byId('drawerRefreshBalanceButton'),
  drawerMessage: byId('drawerMessage'),

  loadingPanel: byId('loadingPanel'),
  loadingText: byId('loadingText'),
  errorPanel: byId('errorPanel'),
  errorText: byId('errorText'),
  retryButton: byId('retryButton'),

  pagePanel: byId('pagePanel'),
  pageBadge: byId('pageBadge'),
  pageTitle: byId('pageTitle'),
  pageDescription: byId('pageDescription'),
  pageFacts: byId('pageFacts'),
  sitePageSection: byId('sitePageSection'),
  sitePageCards: byId('sitePageCards'),
  copyUrlButton: byId('copyUrlButton'),
  copyJsonButton: byId('copyJsonButton'),

  workflowSection: byId('workflowSection'),
  workflowTitle: byId('workflowTitle'),
  workflowDescription: byId('workflowDescription'),
  workflowForm: byId('workflowForm'),
  workflowFields: byId('workflowFields'),
  workflowPreview: byId('workflowPreview'),
  preparePreview: byId('preparePreview'),
  buildDraftButton: byId('buildDraftButton'),
  sendPrepareButton: byId('sendPrepareButton'),
  clearDraftButton: byId('clearDraftButton'),
  copyDraftButton: byId('copyDraftButton'),
  copyPrepareButton: byId('copyPrepareButton'),

  prepareSummary: byId('prepareSummary'),
  prepareStatusBadge: byId('prepareStatusBadge'),
  prepareSummaryTitle: byId('prepareSummaryTitle'),
  prepareSummaryDescription: byId('prepareSummaryDescription'),
  prepareSummaryCards: byId('prepareSummaryCards'),
  prepareNextSteps: byId('prepareNextSteps'),
  prepareNextStepsList: byId('prepareNextStepsList'),

  holdSection: byId('holdSection'),
  holdStatusBadge: byId('holdStatusBadge'),
  holdSummaryTitle: byId('holdSummaryTitle'),
  holdSummaryDescription: byId('holdSummaryDescription'),
  holdEscrowAccount: byId('holdEscrowAccount'),
  holdNonce: byId('holdNonce'),
  confirmHoldButton: byId('confirmHoldButton'),
  copyHoldButton: byId('copyHoldButton'),
  holdSummaryCards: byId('holdSummaryCards'),
  holdPreview: byId('holdPreview'),

  submitSection: byId('submitSection'),
  submitStatusBadge: byId('submitStatusBadge'),
  submitSummaryTitle: byId('submitSummaryTitle'),
  submitSummaryDescription: byId('submitSummaryDescription'),
  submitSummaryCards: byId('submitSummaryCards'),
  submitProductButton: byId('submitProductButton'),
  copySubmitButton: byId('copySubmitButton'),
  openReturnedPageButton: byId('openReturnedPageButton'),
  copyReturnedUrlButton: byId('copyReturnedUrlButton'),
  submitPreview: byId('submitPreview'),

  actionsSection: byId('actionsSection'),
  actionsList: byId('actionsList'),
  fieldsSection: byId('fieldsSection'),
  fieldsList: byId('fieldsList'),
  warningsSection: byId('warningsSection'),
  warningsList: byId('warningsList'),

  developerDetails: byId('developerDetails'),
  developerJson: byId('developerJson'),

  footerStatus: byId('footerStatus')
};

export function byId(id) {
  const el = document.getElementById(id);

  if (!el) {
    throw new Error(`Missing page element: ${id}`);
  }

  return el;
}

export function clearChildren(el) {
  el.textContent = '';
}
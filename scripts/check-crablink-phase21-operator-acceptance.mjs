#!/usr/bin/env node
/**
 * RO:WHAT — Integrated Phase 21 CrabLink Operator Mode acceptance gate.
 * RO:WHY — Proves the completed operator features remain optional and do not fuse CrabLink with Service Node authority.
 * RO:INTERACTS — Operator model/page/cards, Tauri commands, command registration, and existing focused boundary gates.
 * RO:INVARIANTS — disabled by default; operator calls remain route-local; no daemon lifecycle control; no fake policy, durability, receipt, ROC, or finality.
 * RO:SECURITY — administrator credentials remain memory-only and never become ambient application capability.
 * RO:TEST — invoked by the Phase 21 cross-repository acceptance runner.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);

const read = (relative) =>
  fs.readFileSync(
    path.join(root, relative),
    'utf8',
  );

const walk = (directory) => {
  const entries = fs.readdirSync(
    directory,
    {
      withFileTypes: true,
    },
  );

  return entries.flatMap((entry) => {
    const absolute = path.join(
      directory,
      entry.name,
    );

    if (entry.isDirectory()) {
      return walk(absolute);
    }

    return [absolute];
  });
};

const relative = (absolute) =>
  path.relative(root, absolute)
    .split(path.sep)
    .join('/');

const frontendRoot = path.join(
  root,
  'apps/crablink-tauri/src',
);

const sourceExtensions = [
  '.js',
  '.jsx',
  '.ts',
  '.tsx',
];

const entryCandidates = [
  'main.jsx',
  'main.js',
  'main.tsx',
  'main.ts',
].map((entry) =>
  path.join(frontendRoot, entry),
);

const frontendEntry = entryCandidates.find(
  (entry) => fs.existsSync(entry),
);

assert.ok(
  frontendEntry,
  'CrabLink frontend entrypoint was not found.',
);

const resolveLocalModule = (
  importer,
  specifier,
) => {
  if (!specifier.startsWith('.')) {
    return null;
  }

  const withoutSuffix = specifier
    .split('#', 1)[0]
    .split('?', 1)[0];

  const base = path.resolve(
    path.dirname(importer),
    withoutSuffix,
  );

  const candidates = [
    base,
    ...sourceExtensions.map(
      (extension) => `${base}${extension}`,
    ),
    ...sourceExtensions.map(
      (extension) =>
        path.join(base, `index${extension}`),
    ),
  ];

  const resolved = candidates.find(
    (candidate) =>
      fs.existsSync(candidate) &&
      fs.statSync(candidate).isFile(),
  );

  if (!resolved) {
    return null;
  }

  const normalizedRoot =
    `${path.resolve(frontendRoot)}${path.sep}`;

  const normalizedResolved =
    path.resolve(resolved);

  assert.ok(
    normalizedResolved.startsWith(
      normalizedRoot,
    ),
    `Frontend import escaped the source root: ${specifier}`,
  );

  return normalizedResolved;
};

const localImportSpecifiers = (
  moduleSource,
) => {
  const patterns = [
    /\bimport\s+(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]/gs,
    /\bexport\s+[^'"]*?\s+from\s+['"]([^'"]+)['"]/gs,
    /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/gs,
  ];

  return patterns.flatMap((pattern) =>
    [...moduleSource.matchAll(pattern)]
      .map((match) => match[1]),
  );
};

const collectActiveFrontendFiles = (
  entry,
) => {
  const pending = [
    path.resolve(entry),
  ];

  const visited = new Set();

  while (pending.length > 0) {
    const current = pending.pop();

    if (!current || visited.has(current)) {
      continue;
    }

    visited.add(current);

    const moduleSource =
      fs.readFileSync(current, 'utf8');

    for (
      const specifier
      of localImportSpecifiers(moduleSource)
    ) {
      const resolved =
        resolveLocalModule(
          current,
          specifier,
        );

      if (
        resolved &&
        !visited.has(resolved)
      ) {
        pending.push(resolved);
      }
    }
  }

  return [...visited].sort();
};

const frontendFiles =
  collectActiveFrontendFiles(frontendEntry);

const frontendSources = frontendFiles.map(
  (file) => ({
    file: relative(file),
    source: fs.readFileSync(file, 'utf8'),
  }),
);

const isOperatorOwnedFrontend = (file) =>
  file.includes('/pages/operator/') ||
  file.includes('/shared/operator/');

const operatorFrontendSources =
  frontendSources.filter(({ file }) =>
    isOperatorOwnedFrontend(file),
  );

const nonOperatorFrontendSources =
  frontendSources.filter(({ file }) =>
    !isOperatorOwnedFrontend(file),
  );

const model = read(
  'apps/crablink-tauri/src/shared/operator/serviceNodeOperatorModel.js',
);

const page = read(
  'apps/crablink-tauri/src/pages/operator/ServiceNodeOperatorPage.jsx',
);

const persistenceCard = read(
  'apps/crablink-tauri/src/pages/operator/PersistenceReviewCard.jsx',
);

const operatorNode = read(
  'apps/crablink-tauri/src-tauri/src/commands/operator_node.rs',
);

const rewardBinding = read(
  'apps/crablink-tauri/src-tauri/src/commands/operator_reward_binding.rs',
);

const moderationReview = read(
  'apps/crablink-tauri/src-tauri/src/commands/operator_moderation_review.rs',
);

const persistenceReview = read(
  'apps/crablink-tauri/src-tauri/src/commands/operator_persistence_review.rs',
);

const commandModules = read(
  'apps/crablink-tauri/src-tauri/src/commands/mod.rs',
);

const tauriLib = read(
  'apps/crablink-tauri/src-tauri/src/lib.rs',
);

const packageData = JSON.parse(
  read('apps/crablink-tauri/package.json'),
);

const operatorFrontend = operatorFrontendSources
  .map(({ source }) => source)
  .join('\n');

const nonOperatorFrontend =
  nonOperatorFrontendSources
    .map(({ source }) => source)
    .join('\n');

const allOperatorRust = [
  operatorNode,
  rewardBinding,
  moderationReview,
  persistenceReview,
].join('\n');

const commandNames = [
  'service_node_operator_status',
  'service_node_operator_bind_reward_recipient',
  'service_node_operator_moderation_pending',
  'service_node_operator_moderation_decide',
  'service_node_operator_persistence_pending',
  'service_node_operator_persistence_decide',
];

const requiredPackageScripts = [
  'check:service-node-operator-boundary',
  'check:service-node-operator-ui-boundary',
  'check:signed-reward-binding-boundary',
  'check:moderation-review-boundary',
  'check:persistence-review-boundary',
  'check:phase21-operator-acceptance',
];

/*
 * CrabLink does not require a Service Node to start or provide its
 * ordinary application routes.
 */
assert.match(
  model,
  /enabled\s*:\s*false/,
  'Operator Mode must remain disabled by default.',
);

const escapeRegExp = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

for (const command of commandNames) {
  const invocationPattern = new RegExp(
    `callTauri\\s*\\(\\s*['"]${escapeRegExp(command)}['"]`,
  );

  assert.match(
    operatorFrontend,
    invocationPattern,
    `${command} must be invoked only from an operator-owned frontend surface.`,
  );

  assert.doesNotMatch(
    nonOperatorFrontend,
    invocationPattern,
    `${command} must not become ambient capability outside operator-owned frontend surfaces.`,
  );

  assert.match(
    tauriLib,
    new RegExp(escapeRegExp(command)),
    `${command} must be explicitly registered in Tauri.`,
  );
}

/*
 * Administrator credentials remain route-owned memory.
 */
assert.match(
  page,
  /type="password"/,
);

assert.match(
  page,
  /patch\.enabled === false/,
);

assert.match(
  page,
  /adminToken\s*:\s*''/,
);

assert.doesNotMatch(
  `${operatorFrontend}\n${model}`,
  /(?:globalThis|window|document)\.(?:localStorage|sessionStorage)|indexedDB\s*[.(]|\.setItem\s*\(/i,
);

/*
 * CrabLink is a controller, not a daemon process manager.
 */
assert.doesNotMatch(
  allOperatorRust,
  /\bstd::process::Command\b|\bCommand::new\s*\(|\bChild\b|\.kill\s*\(|\bstart_daemon\b|\bstop_daemon\b|\brestart_daemon\b/,
);

assert.doesNotMatch(
  allOperatorRust,
  /\/api\/v1\/(?:shutdown|reload|debug\/crash|bench\/run)/,
);

/*
 * Local/remote connection and confirmed-receipt truth remain explicit.
 */
assert.match(
  operatorNode,
  /local Service Node connections require an explicit loopback HTTP or HTTPS URL/,
);

assert.match(
  operatorNode,
  /remote Service Node connections require a non-loopback HTTPS URL/,
);

assert.match(
  operatorNode,
  /pending_reward_material_never_becomes_confirmed_issuance_evidence/,
);

assert.match(
  operatorNode,
  /accepted_wallet_ledger_receipts_are_projected_without_external_finality/,
);

/*
 * Reward binding remains signed, replay-bounded by the backend, and
 * explicitly non-authoritative.
 */
assert.match(
  rewardBinding,
  /crablink\.reward_binding\.intent\.v1/,
);

assert.match(
  rewardBinding,
  /admin_bearer_blake3_keyed_v1/,
);

assert.match(
  rewardBinding,
  /signed_intent_verified/,
);

assert.match(
  rewardBinding,
  /registry_finality/,
);

assert.match(
  rewardBinding,
  /wallet_mutation/,
);

assert.match(
  rewardBinding,
  /ledger_mutation/,
);

/*
 * Moderation review cannot silently edit or activate policy.
 */
for (const boundary of [
  'policy_mutation',
  'runtime_activation',
  'storage_delete',
  'provider_withdrawal',
  'reward_finality',
  'wallet_mutation',
  'ledger_mutation',
]) {
  assert.match(
    moderationReview,
    new RegExp(boundary),
  );
}

/*
 * Persistence approval is eligibility metadata, not durable bytes.
 */
for (const boundary of [
  'durable_bytes_written',
  'policy_mutation',
  'runtime_activation',
  'storage_delete',
  'provider_withdrawal',
  'reward_finality',
  'wallet_mutation',
  'ledger_mutation',
  'external_finality',
]) {
  assert.match(
    persistenceReview,
    new RegExp(boundary),
  );
}

assert.match(
  persistenceCard,
  /I understand approval changes eligibility metadata only/,
);

assert.match(
  persistenceCard,
  /No durable bytes were written/,
);

/*
 * Every feature family remains explicitly registered rather than
 * appearing through a broad wildcard management module.
 */
for (const moduleName of [
  'operator_node',
  'operator_reward_binding',
  'operator_moderation_review',
  'operator_persistence_review',
]) {
  assert.match(
    commandModules,
    new RegExp(`pub mod ${moduleName};`),
  );
}

for (const script of requiredPackageScripts) {
  assert.equal(
    typeof packageData.scripts?.[script],
    'string',
    `Missing package script: ${script}`,
  );
}

console.log(
  'CrabLink Phase 21 integrated Operator Mode acceptance check passed.',
);

console.log(
  'Operator Mode is optional, route-local, credential-ephemeral, receipt-truthful, and free of daemon, policy, durability, wallet, ledger, or finality authority.',
);

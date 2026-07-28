import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = path.resolve(new URL('../../../..', import.meta.url).pathname);
const APP_ROOT = path.join(ROOT, 'apps/crablink-tauri');
const BUILDPLAN = path.join(ROOT, 'ONBOARDING_BUILDPLAN.md');

const SOURCE_ROOTS = Object.freeze([
  path.join(APP_ROOT, 'src'),
  path.join(APP_ROOT, 'src-tauri/src'),
]);

const SOURCE_EXTENSIONS = new Set(['.js', '.jsx', '.mjs', '.rs']);

const ARTIFACTS = Object.freeze([
  Object.freeze({
    id: 'skinnycrabby_default',
    literals: Object.freeze(['@skinnycrabby']),
    expectedPresent: false,
    cleanup: 'removed from executable profile defaults during Phase 10A',
  }),
  Object.freeze({
    id: 'visitor_b_passport_subject',
    literals: Object.freeze(['passport:main:visitor-b']),
    expectedPresent: true,
    cleanup: 'quarantine behind an explicit dev/test boundary',
  }),
  Object.freeze({
    id: 'visitor_b_labels',
    literals: Object.freeze(['visitor-b', 'Visitor B', 'acct_visitor_b']),
    expectedPresent: true,
    cleanup: 'quarantine visible visitor-session labels and accounts',
  }),
  Object.freeze({
    id: 'dev_passport_subject',
    literals: Object.freeze(['passport:main:dev']),
    expectedPresent: true,
    cleanup: 'replace implicit normal-runtime Passport fallback',
  }),
  Object.freeze({
    id: 'dev_wallet_account',
    literals: Object.freeze(['acct_dev']),
    expectedPresent: true,
    cleanup: 'replace implicit normal-runtime wallet fallback',
  }),
  Object.freeze({
    id: 'passport_a_literal',
    literals: Object.freeze(['Passport A']),
    expectedPresent: false,
    cleanup: 'no production runtime occurrence; embedded Rust test fixtures are excluded',
  }),
  Object.freeze({
    id: 'passport_b_literal',
    literals: Object.freeze(['Passport B']),
    expectedPresent: false,
    cleanup: 'no production runtime occurrence; embedded Rust test fixtures are excluded',
  }),
  Object.freeze({
    id: 'creator_a_labels',
    literals: Object.freeze(['Creator A', 'creator-a']),
    expectedPresent: true,
    cleanup: 'quarantine creator-session labels behind an explicit dev/test boundary',
  }),
  Object.freeze({
    id: 'starter_grant_1776_default',
    literals: Object.freeze(['1776']),
    expectedPresent: true,
    cleanup: 'remove the baked starter-grant amount from normal onboarding state',
  }),
]);

const CLASSIFICATION_BY_FILE = Object.freeze({
  'apps/crablink-tauri/src-tauri/src/state.rs':
    'native_runtime_default',
  'apps/crablink-tauri/src/shared/utils/devPassportSessions.js':
    'explicit_dev_helper',
  'apps/crablink-tauri/src/app/shell/PassportActions.jsx':
    'dev_surface',
  'apps/crablink-tauri/src/app/shell/PassportDrawer.jsx':
    'dev_surface',
  'apps/crablink-tauri/src/pages/quickchain/QuickchainReadinessPage.jsx':
    'dev_proof_surface',
  'apps/crablink-tauri/src/pages/stream/StreamSessionPanel.jsx':
    'dev_proof_surface',
});

function listSourceFiles(root) {
  const files = [];

  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const file = path.join(root, entry.name);

    if (entry.isDirectory()) {
      files.push(...listSourceFiles(file));
      continue;
    }

    if (!SOURCE_EXTENSIONS.has(path.extname(entry.name))) {
      continue;
    }

    if (
      entry.name.includes('.test.') ||
      entry.name.includes('.source.test.')
    ) {
      continue;
    }

    files.push(file);
  }

  return files;
}

function stripCommentsPreservingLines(source) {
  return source
    .replace(
      /\/\*[\s\S]*?\*\//g,
      (comment) => comment.replace(/[^\n]/g, ' '),
    )
    .replace(
      /^\s*\/\/!?.*$/gm,
      (comment) => ' '.repeat(comment.length),
    );
}

function maskPreservingLines(
  source,
  start,
  end,
) {
  return (
    source.slice(0, start) +
    source
      .slice(start, end)
      .replace(/[^\n]/g, ' ') +
    source.slice(end)
  );
}

function rustRawStringStart(
  source,
  index,
) {
  let cursor = index;

  if (
    source[cursor] === 'b' &&
    source[cursor + 1] === 'r'
  ) {
    cursor += 1;
  }

  if (source[cursor] !== 'r') {
    return null;
  }

  cursor += 1;

  let hashes = 0;

  while (
    source[cursor] === '#'
  ) {
    hashes += 1;
    cursor += 1;
  }

  if (
    source[cursor] !== '"'
  ) {
    return null;
  }

  return Object.freeze({
    endOfOpening: cursor + 1,

    closing:
      `"${'#'.repeat(hashes)}`,
  });
}

function findRustModuleClose(
  source,
  openingBrace,
) {
  let depth = 1;
  let index = openingBrace + 1;
  let blockCommentDepth = 0;
  let inLineComment = false;
  let inString = false;
  let rawClosing = null;

  while (
    index < source.length
  ) {
    const current =
      source[index];

    const next =
      source[index + 1];

    if (inLineComment) {
      if (current === '\n') {
        inLineComment = false;
      }

      index += 1;
      continue;
    }

    if (
      blockCommentDepth > 0
    ) {
      if (
        current === '/' &&
        next === '*'
      ) {
        blockCommentDepth += 1;
        index += 2;
        continue;
      }

      if (
        current === '*' &&
        next === '/'
      ) {
        blockCommentDepth -= 1;
        index += 2;
        continue;
      }

      index += 1;
      continue;
    }

    if (
      rawClosing !== null
    ) {
      if (
        source.startsWith(
          rawClosing,
          index,
        )
      ) {
        index +=
          rawClosing.length;

        rawClosing = null;
      } else {
        index += 1;
      }

      continue;
    }

    if (inString) {
      if (
        current === '\\'
      ) {
        index += 2;
        continue;
      }

      if (
        current === '"'
      ) {
        inString = false;
      }

      index += 1;
      continue;
    }

    if (
      current === '/' &&
      next === '/'
    ) {
      inLineComment = true;
      index += 2;
      continue;
    }

    if (
      current === '/' &&
      next === '*'
    ) {
      blockCommentDepth = 1;
      index += 2;
      continue;
    }

    const rawStart =
      rustRawStringStart(
        source,
        index,
      );

    if (rawStart) {
      rawClosing =
        rawStart.closing;

      index =
        rawStart.endOfOpening;

      continue;
    }

    if (
      current === '"'
    ) {
      inString = true;
      index += 1;
      continue;
    }

    if (
      current === "'"
    ) {
      const charEnd =
        source[index + 1] ===
          '\\'
          ? index + 3
          : index + 2;

      if (
        source[charEnd] ===
        "'"
      ) {
        index =
          charEnd + 1;

        continue;
      }
    }

    if (
      current === '{'
    ) {
      depth += 1;
    } else if (
      current === '}'
    ) {
      depth -= 1;

      if (depth === 0) {
        return index + 1;
      }
    }

    index += 1;
  }

  throw new Error(
    'Unclosed Rust #[cfg(test)] module in onboarding inventory scan.',
  );
}

function stripRustCfgTestModulesPreservingLines(
  source,
) {
  const pattern =
    /#\s*\[\s*cfg\s*\(\s*test\s*\)\s*\]\s*mod\s+[A-Za-z_][A-Za-z0-9_]*\s*\{/g;

  const ranges = [];

  let match =
    pattern.exec(source);

  while (match) {
    const openingBrace =
      source.indexOf(
        '{',
        match.index,
      );

    const end =
      findRustModuleClose(
        source,
        openingBrace,
      );

    ranges.push([
      match.index,
      end,
    ]);

    pattern.lastIndex = end;

    match =
      pattern.exec(source);
  }

  return ranges
    .reverse()
    .reduce(
      (
        masked,
        [start, end],
      ) =>
        maskPreservingLines(
          masked,
          start,
          end,
        ),
      source,
    );
}

function relative(file) {
  return path.relative(ROOT, file).split(path.sep).join('/');
}

function lineNumberAt(source, offset) {
  return source.slice(0, offset).split('\n').length;
}

function inventory() {
  const findings = [];

  for (const sourceRoot of SOURCE_ROOTS) {
    assert.ok(
      fs.existsSync(sourceRoot),
      `${relative(sourceRoot)} must exist`,
    );

    for (const file of listSourceFiles(sourceRoot)) {
      const rawSource =
        fs.readFileSync(
          file,
          'utf8',
        );

      const productionSource =
        path.extname(file) === '.rs'
          ? stripRustCfgTestModulesPreservingLines(
              rawSource,
            )
          : rawSource;

      const source =
        stripCommentsPreservingLines(
          productionSource,
        );

      for (const artifact of ARTIFACTS) {
        for (const literal of artifact.literals) {
          let offset = source.indexOf(literal);

          while (offset !== -1) {
            const fileName = relative(file);

            findings.push(Object.freeze({
              artifact: artifact.id,
              literal,
              file: fileName,
              line: lineNumberAt(source, offset),
              classification:
                CLASSIFICATION_BY_FILE[fileName] ||
                'normal_runtime_cleanup_review',
            }));

            offset = source.indexOf(
              literal,
              offset + literal.length,
            );
          }
        }
      }
    }
  }

  return findings.sort(
    (left, right) =>
      left.artifact.localeCompare(right.artifact) ||
      left.file.localeCompare(right.file) ||
      left.line - right.line,
  );
}

test(
  'inventory excludes embedded Rust cfg test fixtures while retaining production source',
  () => {
    const rustSource = [
      'const BEFORE: &str = "Creator A";',
      '#[cfg(test)]',
      'mod tests {',
      '  const A: &str = "Passport A";',
      '  const JSON: &str = r#"{\"label\":\"Passport B\"}"#;',
      '}',
      'const AFTER: &str = "acct_dev";',
    ].join('\n');

    const productionSource =
      stripRustCfgTestModulesPreservingLines(
        rustSource,
      );

    assert.ok(
      productionSource.includes(
        'Creator A',
      ),
    );

    assert.ok(
      productionSource.includes(
        'acct_dev',
      ),
    );

    assert.doesNotMatch(
      productionSource,
      /Passport A|Passport B/,
    );

    assert.equal(
      productionSource
        .split('\n')
        .length,
      rustSource
        .split('\n')
        .length,
      'masking must preserve source line numbers',
    );

    console.log(
      'ONBOARDING_PHASE10A_RUST_CFG_TEST_FIXTURES_EXCLUDED=GREEN',
    );
  },
);

test(
  'phase0 inventory remains a regression map after Phase 10 default quarantine',
  () => {
    const findings = inventory();

    for (const artifact of ARTIFACTS) {
      const artifactFindings = findings.filter(
        (finding) => finding.artifact === artifact.id,
      );

      if (artifact.expectedPresent) {
        assert.ok(
          artifactFindings.length > 0,
          `${artifact.id} must remain inventoried until its later cleanup phase`,
        );
      } else {
        assert.equal(
          artifactFindings.length,
          0,
          `${artifact.id} is expected to have no literal runtime occurrence`,
        );
      }

      console.log(
        `ONBOARDING_PHASE0_ARTIFACT=${artifact.id} ` +
          `COUNT=${artifactFindings.length} ` +
          `CLEANUP=${artifact.cleanup}`,
      );
    }

    for (const finding of findings) {
      console.log(
        `ONBOARDING_PHASE0_RUNTIME_TARGET=` +
          `${finding.file}:${finding.line} ` +
          `ARTIFACT=${finding.artifact} ` +
          `CLASS=${finding.classification}`,
      );
    }

    assert.equal(
      findings.some(
        (finding) =>
          finding.classification === 'native_runtime_default',
      ),
      false,
      'native AppSettings must no longer contain implicit dev identity defaults',
    );

    assert.ok(
      findings.some(
        (finding) =>
          finding.classification === 'explicit_dev_helper',
      ),
      'the explicit dev Passport helper must be visible in the inventory',
    );

    console.log(
      `ONBOARDING_PHASE0_RUNTIME_OCCURRENCES=${findings.length}`,
    );
    console.log(
      'ONBOARDING_PHASE0_BEHAVIOR_CHANGED=PHASE10_DEFAULT_QUARANTINE',
    );
    console.log(
      'ONBOARDING_PHASE0_DEV_ARTIFACT_REMOVED=PARTIAL_EXPLICIT_DEV_FIXTURES_REMAIN',
    );
    console.log('ONBOARDING_PHASE0_INVENTORY=GREEN');
  },
);

test(
  'phase0 onboarding buildplan remains the authority for the inventory-only first patch',
  () => {
    assert.ok(
      fs.existsSync(BUILDPLAN),
      'ONBOARDING_BUILDPLAN.md must exist',
    );

    const buildplan = fs.readFileSync(BUILDPLAN, 'utf8');

    for (const required of [
      '# CrabLink Onboarding Buildplan',
      '### Phase 0 — Inventory and baseline proof',
      'ONBOARDING_PHASE0_INVENTORY=GREEN',
      'Add an inventory source test that documents known dev artifacts without failing yet.',
      'Do not mutate runtime behavior yet.',
    ]) {
      assert.match(
        buildplan,
        new RegExp(
          required.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        ),
        `${required} must remain in the onboarding buildplan`,
      );
    }

    console.log('ONBOARDING_PHASE0_BUILDPLAN_REFERENCE=GREEN');
  },
);

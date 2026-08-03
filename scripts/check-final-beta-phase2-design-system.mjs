#!/usr/bin/env node

/**
 * RO:WHAT — FINAL_BETA Phase 2 design-system acceptance and drift scanner.
 * RO:WHY — Phase 2 cannot close until themes, focus states, core components,
 * responsive primitives, and page-local theme drift are honestly reviewed.
 * RO:INTERACTS — shared theme files, designSystemFoundation.css, shared
 * components, and all non-shared runtime CSS under apps/crablink-tauri/src.
 * RO:INVARIANTS — read-only source inspection; no runtime, route, Passport,
 * wallet, ledger, network, or build mutation.
 * RO:TEST — run directly with Node from the CrabLink repository root.
 * FINAL_BETA_PHASE2D1_ACCEPTANCE_RUNNER_V1
 */

import fs from 'node:fs';
import path from 'node:path';
import {
  fileURLToPath,
} from 'node:url';

const SCRIPT_DIR = path.dirname(
  fileURLToPath(import.meta.url),
);

const REPO_ROOT = path.resolve(
  SCRIPT_DIR,
  '..',
);

const APP_ROOT = path.join(
  REPO_ROOT,
  'apps/crablink-tauri',
);

const SRC_ROOT = path.join(
  APP_ROOT,
  'src',
);

const THEME_ROOT = path.join(
  SRC_ROOT,
  'shared/theme',
);

const COMPONENT_ROOT = path.join(
  SRC_ROOT,
  'shared/components',
);

const FOUNDATION_PATH = path.join(
  SRC_ROOT,
  'shared/styles/designSystemFoundation.css',
);

const THEME_TOKENS_PATH = path.join(
  THEME_ROOT,
  'themeTokens.css',
);

const LIGHT_THEME_PATH = path.join(
  THEME_ROOT,
  'light.css',
);

const DARK_THEME_PATH = path.join(
  THEME_ROOT,
  'dark.css',
);

const THEME_PROVIDER_PATH = path.join(
  THEME_ROOT,
  'ThemeProvider.jsx',
);

const MAIN_PATH = path.join(
  SRC_ROOT,
  'app/main.jsx',
);

const CORE_COMPONENTS = Object.freeze([
  'AppShell.jsx',
  'PrimaryNavigation.jsx',
  'UtilityBar.jsx',
  'CrabAddressField.jsx',
  'FeedCard.jsx',
  'ProfileHeader.jsx',
  'ContentCard.jsx',
  'MediaCard.jsx',
  'SiteCard.jsx',
  'ReceiptRow.jsx',
  'RocSummary.jsx',
  'EmptyState.jsx',
  'ErrorState.jsx',
  'OfflineState.jsx',
  'LoadingSkeleton.jsx',
  'ConfirmDialog.jsx',
  'DeveloperDisclosure.jsx',
]);

const REQUIRED_THEME_TOKENS = Object.freeze([
  '--cl-bg',
  '--cl-surface',
  '--cl-card',
  '--cl-text',
  '--cl-muted',
  '--cl-border',
  '--cl-accent',
  '--cl-accent-contrast',
  '--cl-danger',
  '--cl-warning',
  '--cl-success',
]);

const REQUIRED_FOUNDATION_MARKERS =
  Object.freeze([
    'FINAL_BETA_PHASE2B1_INTERACTIVE_PRIMITIVES_V1',
    'FINAL_BETA_PHASE2B2_SHARED_STATES_V1',
    'FINAL_BETA_PHASE2C1_PRODUCT_PRIMITIVES_V1',
    'FINAL_BETA_PHASE2C2_SHELL_PRIMITIVES_V2',
    '.cl-button-secondary',
    '.cl-button-ghost',
    '.cl-button-danger',
    '.cl-modal-backdrop',
    '.cl-drawer-backdrop',
    '.cl-toast-region',
    '.cl-state-loading',
    '.cl-product-card',
    '.cl-profile-header',
    '.cl-receipt-row',
    '.cl-roc-summary',
    '.cl-app-shell',
    '.cl-crab-address-field',
    ':focus-visible',
    ':focus-within',
    '@media (prefers-reduced-motion: reduce)',
  ]);

/*
 * Exact non-theme custom-property exceptions.
 *
 * Shell zoom values describe runtime geometry rather than a private color,
 * spacing, radius, elevation, or typography system.
 */
const DOCUMENTED_CUSTOM_PROPERTY_EXCEPTIONS =
  new Map([
    [
      'app/shell/Shell.css:--cl-app-zoom-scale',
      'runtime zoom geometry',
    ],
    [
      'app/shell/Shell.css:--cl-app-zoom-inverse',
      'runtime zoom geometry',
    ],
  ]);

const THEME_LIKE_CUSTOM_PROPERTY =
  /(?:^|[-_])(bg|background|surface|panel|card|soft|border|text|muted|subtle|accent|color|danger|warning|success|good|bad|blue|gray|focus|input|placeholder|shadow|elevation|radius|glow|space|spacing|gap)(?:$|[-_])/i;

const structuralFailures = [];
const driftFindings = [];

function relativeToSource(filePath) {
  return path
    .relative(
      SRC_ROOT,
      filePath,
    )
    .split(path.sep)
    .join('/');
}

function readRequired(filePath) {
  if (
    !fs.existsSync(filePath) ||
    !fs.statSync(filePath).isFile() ||
    fs.statSync(filePath).size === 0
  ) {
    structuralFailures.push({
      code: 'MISSING_OR_EMPTY_FILE',
      file: path
        .relative(
          REPO_ROOT,
          filePath,
        )
        .split(path.sep)
        .join('/'),
      detail: 'required source file is missing or empty',
    });

    return '';
  }

  return fs.readFileSync(
    filePath,
    'utf8',
  );
}

function requireContains(
  source,
  marker,
  filePath,
  code,
) {
  if (!source.includes(marker)) {
    structuralFailures.push({
      code,
      file: path
        .relative(
          REPO_ROOT,
          filePath,
        )
        .split(path.sep)
        .join('/'),
      detail: `missing marker: ${marker}`,
    });
  }
}

function collectCssFiles(root) {
  const files = [];

  if (!fs.existsSync(root)) {
    return files;
  }

  for (
    const entry of fs.readdirSync(
      root,
      {
        withFileTypes: true,
      },
    )
  ) {
    const entryPath = path.join(
      root,
      entry.name,
    );

    if (entry.isDirectory()) {
      files.push(
        ...collectCssFiles(entryPath),
      );

      continue;
    }

    if (
      entry.isFile() &&
      entry.name.endsWith('.css')
    ) {
      files.push(entryPath);
    }
  }

  return files.sort();
}

function stripCssComments(source) {
  return source.replace(
    /\/\*[\s\S]*?\*\//g,
    (comment) => comment.replace(
      /[^\n]/g,
      ' ',
    ),
  );
}

function scanPageLocalThemeDrift() {
  const cssFiles = collectCssFiles(
    SRC_ROOT,
  );

  for (const cssPath of cssFiles) {
    const relativePath =
      relativeToSource(cssPath);

    if (
      relativePath.startsWith(
        'shared/theme/',
      ) ||
      relativePath.startsWith(
        'shared/styles/',
      )
    ) {
      continue;
    }

    const source = stripCssComments(
      fs.readFileSync(
        cssPath,
        'utf8',
      ),
    );

    const lines = source.split('\n');

    lines.forEach(
      (
        line,
        index,
      ) => {
        const lineNumber = index + 1;

        if (
          line.includes(
            'data:image/',
          )
        ) {
          return;
        }

        const customPropertyPattern =
          /(--[A-Za-z0-9_-]+)\s*:/g;

        for (
          const match of line.matchAll(
            customPropertyPattern,
          )
        ) {
          const propertyName =
            match[1];

          const exceptionKey =
            `${relativePath}:${propertyName}`;

          if (
            DOCUMENTED_CUSTOM_PROPERTY_EXCEPTIONS
              .has(exceptionKey)
          ) {
            continue;
          }

          if (
            THEME_LIKE_CUSTOM_PROPERTY
              .test(propertyName)
          ) {
            driftFindings.push({
              category:
                'PAGE_LOCAL_THEME_TOKEN_DECLARATION',
              file: relativePath,
              line: lineNumber,
              detail: propertyName,
            });
          }
        }

        const rawColorPattern =
          /#[0-9a-fA-F]{3,8}\b|\b(?:rgb|rgba|hsl|hsla)\s*\(/g;

        for (
          const match of line.matchAll(
            rawColorPattern,
          )
        ) {
          driftFindings.push({
            category:
              'PAGE_LOCAL_RAW_COLOR_LITERAL',
            file: relativePath,
            line: lineNumber,
            detail: match[0],
          });
        }
      },
    );
  }
}

function findingPriority(finding) {
  return finding.category ===
    'PAGE_LOCAL_THEME_TOKEN_DECLARATION'
    ? 0
    : 1;
}

function printStructuralFailures() {
  for (
    const failure of structuralFailures
  ) {
    console.log(
      [
        'STRUCTURAL_FAILURE',
        failure.code,
        failure.file,
        failure.detail,
      ].join(' | '),
    );
  }
}

function printDriftFindings() {
  const ordered = [
    ...driftFindings,
  ].sort(
    (
      left,
      right,
    ) =>
      findingPriority(left) -
        findingPriority(right) ||
      left.file.localeCompare(
        right.file,
      ) ||
      left.line - right.line ||
      left.detail.localeCompare(
        right.detail,
      ),
  );

  const displayLimit = 30;

  for (
    const finding of ordered.slice(
      0,
      displayLimit,
    )
  ) {
    console.log(
      [
        'THEME_DRIFT',
        finding.category,
        finding.file,
        `line=${finding.line}`,
        finding.detail,
      ].join(' | '),
    );
  }

  if (
    ordered.length >
    displayLimit
  ) {
    console.log(
      `THEME_DRIFT_ADDITIONAL_FINDINGS=${
        ordered.length -
        displayLimit
      }`,
    );
  }

  return ordered;
}

console.log(
  'FINAL_BETA_PHASE2D1_ACCEPTANCE=STARTED',
);

console.log(
  'INSPECTION_MODE=READ_ONLY_SOURCE_ACCEPTANCE',
);

console.log(
  'LEGACY_THEME_DRIFT_SUPPRESSED=NO',
);

console.log(
  'RUNTIME_MUTATION=NO',
);

const tokensSource = readRequired(
  THEME_TOKENS_PATH,
);

const lightSource = readRequired(
  LIGHT_THEME_PATH,
);

const darkSource = readRequired(
  DARK_THEME_PATH,
);

const foundationSource = readRequired(
  FOUNDATION_PATH,
);

const providerSource = readRequired(
  THEME_PROVIDER_PATH,
);

const mainSource = readRequired(
  MAIN_PATH,
);

requireContains(
  tokensSource,
  'FINAL_BETA_PHASE2A_DESIGN_FOUNDATION_V1',
  THEME_TOKENS_PATH,
  'PHASE2A_FOUNDATION_MARKER_MISSING',
);

requireContains(
  lightSource,
  "color-scheme: light",
  LIGHT_THEME_PATH,
  'LIGHT_COLOR_SCHEME_MISSING',
);

requireContains(
  darkSource,
  "color-scheme: dark",
  DARK_THEME_PATH,
  'DARK_COLOR_SCHEME_MISSING',
);

requireContains(
  providerSource,
  'document.documentElement.dataset.theme',
  THEME_PROVIDER_PATH,
  'THEME_PROVIDER_DATASET_WIRING_MISSING',
);

requireContains(
  mainSource,
  'designSystemFoundation.css',
  MAIN_PATH,
  'DESIGN_FOUNDATION_IMPORT_MISSING',
);

for (
  const token of REQUIRED_THEME_TOKENS
) {
  requireContains(
    lightSource,
    token,
    LIGHT_THEME_PATH,
    'LIGHT_THEME_TOKEN_MISSING',
  );

  requireContains(
    darkSource,
    token,
    DARK_THEME_PATH,
    'DARK_THEME_TOKEN_MISSING',
  );
}

for (
  const marker of
    REQUIRED_FOUNDATION_MARKERS
) {
  requireContains(
    foundationSource,
    marker,
    FOUNDATION_PATH,
    'FOUNDATION_MARKER_MISSING',
  );
}

for (
  const componentName of
    CORE_COMPONENTS
) {
  const componentPath = path.join(
    COMPONENT_ROOT,
    componentName,
  );

  const componentSource =
    readRequired(componentPath);

  if (
    componentSource.includes(
      'React scaffold component',
    ) ||
    componentSource.includes(
      '>Scaffold<',
    )
  ) {
    structuralFailures.push({
      code:
        'CORE_COMPONENT_STILL_SCAFFOLD',
      file: path
        .relative(
          REPO_ROOT,
          componentPath,
        )
        .split(path.sep)
        .join('/'),
      detail: componentName,
    });
  }
}

scanPageLocalThemeDrift();

const orderedDriftFindings =
  printDriftFindings();

printStructuralFailures();

const localThemeTokenCount =
  orderedDriftFindings.filter(
    (finding) =>
      finding.category ===
      'PAGE_LOCAL_THEME_TOKEN_DECLARATION',
  ).length;

const rawColorCount =
  orderedDriftFindings.filter(
    (finding) =>
      finding.category ===
      'PAGE_LOCAL_RAW_COLOR_LITERAL',
  ).length;

console.log(
  `CORE_COMPONENT_COUNT=${CORE_COMPONENTS.length}`,
);

console.log(
  `DOCUMENTED_NON_THEME_EXCEPTION_COUNT=${
    DOCUMENTED_CUSTOM_PROPERTY_EXCEPTIONS.size
  }`,
);

console.log(
  `STRUCTURAL_FAILURE_COUNT=${
    structuralFailures.length
  }`,
);

console.log(
  `PAGE_LOCAL_THEME_TOKEN_DECLARATION_COUNT=${
    localThemeTokenCount
  }`,
);

console.log(
  `PAGE_LOCAL_RAW_COLOR_LITERAL_COUNT=${
    rawColorCount
  }`,
);

if (
  structuralFailures.length > 0 ||
  orderedDriftFindings.length > 0
) {
  const firstFailure =
    structuralFailures.length > 0
      ? {
          category:
            structuralFailures[0].code,
          file:
            structuralFailures[0].file,
          line: 0,
          detail:
            structuralFailures[0].detail,
        }
      : orderedDriftFindings[0];

  console.log(
    'FINAL_BETA_PHASE2_DESIGN_SYSTEM=RED',
  );

  console.log(
    `FIRST_FAILURE_CLASS=${
      firstFailure.category
    }`,
  );

  console.log(
    `FIRST_FAILURE_FILE=${
      firstFailure.file
    }`,
  );

  console.log(
    `FIRST_FAILURE_LINE=${
      firstFailure.line
    }`,
  );

  console.log(
    `FIRST_FAILURE_DETAIL=${
      firstFailure.detail
    }`,
  );

  console.log(
    'NO_PAGE_LOCAL_THEME_DRIFT=NO',
  );

  console.log(
    'NEXT_ACTION=FIX_FIRST_REPORTED_FAILURE',
  );

  process.exitCode = 1;
} else {
  console.log(
    'FINAL_BETA_PHASE2_DESIGN_SYSTEM=GREEN',
  );

  console.log(
    'LIGHT_THEME=GREEN',
  );

  console.log(
    'DARK_THEME=GREEN',
  );

  console.log(
    'FOCUS_STATES=GREEN',
  );

  console.log(
    'CORE_COMPONENTS=GREEN',
  );

  console.log(
    'NO_PAGE_LOCAL_THEME_DRIFT=YES',
  );

  console.log(
    'NEXT_PHASE=FINAL_BETA_PHASE3_SHELL_AND_INFORMATION_ARCHITECTURE',
  );
}

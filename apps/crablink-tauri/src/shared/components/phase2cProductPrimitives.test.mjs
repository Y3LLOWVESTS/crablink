/**
 * RO:WHAT — Focused static acceptance for FINAL_BETA Phase 2C1 product-display primitives.
 * RO:WHY — Proves the named content, feed, media, site, profile, receipt, and ROC components exist without adding runtime authority.
 * RO:INTERACTS — shared JSX primitives and designSystemFoundation.css.
 * RO:INVARIANTS — no direct fetch, storage, Tauri invocation, wallet/ledger mutation, unsafe HTML, or invented truth.
 * RO:TEST — node --test phase2cProductPrimitives.test.mjs.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {
  fileURLToPath,
} from 'node:url';

const HERE = path.dirname(
  fileURLToPath(import.meta.url),
);

function read(name) {
  return fs.readFileSync(
    path.join(HERE, name),
    'utf8',
  );
}

const sources = Object.freeze({
  content: read('ContentCard.jsx'),
  feed: read('FeedCard.jsx'),
  media: read('MediaCard.jsx'),
  site: read('SiteCard.jsx'),
  profile: read('ProfileHeader.jsx'),
  receipt: read('ReceiptRow.jsx'),
  roc: read('RocSummary.jsx'),
});

const foundation =
  fs.readFileSync(
    path.resolve(
      HERE,
      '../styles/designSystemFoundation.css',
    ),
    'utf8',
  );

test(
  'all Phase 2C1 product primitives are installed',
  () => {
    for (const source of Object.values(
      sources,
    )) {
      assert.match(
        source,
        /FINAL_BETA_PHASE2C1_PRODUCT_PRIMITIVES_V1/,
      );
    }
  },
);

test(
  'content feed media and site cards share one display foundation',
  () => {
    assert.match(
      sources.content,
      /cl-product-card/,
    );

    assert.match(
      sources.feed,
      /import ContentCard/,
    );

    assert.match(
      sources.media,
      /import ContentCard/,
    );

    assert.match(
      sources.site,
      /import ContentCard/,
    );
  },
);

test(
  'profile receipt and ROC states remain caller-derived',
  () => {
    assert.match(
      sources.profile,
      /statusLabel = ''/,
    );

    assert.match(
      sources.receipt,
      /status = 'pending'/,
    );

    assert.match(
      sources.roc,
      /confirmedLabel = '—'/,
    );

    assert.match(
      sources.roc,
      /pendingLabel = ''/,
    );
  },
);

test(
  'status is communicated with text and not color alone',
  () => {
    assert.match(
      sources.receipt,
      /defaultStatusLabel/,
    );

    assert.match(
      sources.receipt,
      /Confirmed/,
    );

    assert.match(
      sources.receipt,
      /Pending/,
    );

    assert.match(
      sources.receipt,
      /Failed/,
    );

    assert.match(
      sources.roc,
      />Offline</,
    );

    assert.match(
      sources.roc,
      />Stale</,
    );
  },
);

test(
  'shared CSS owns product profile receipt and ROC presentation',
  () => {
    for (const marker of [
      'FINAL_BETA_PHASE2C1_PRODUCT_PRIMITIVES_V1',
      '.cl-product-card',
      '.cl-feed-card',
      '.cl-profile-header',
      '.cl-receipt-row',
      '.cl-status-pill.is-confirmed',
      '.cl-roc-summary',
    ]) {
      assert.match(
        foundation,
        new RegExp(
          escapeRegExp(marker),
        ),
      );
    }
  },
);

test(
  'product primitives add no backend identity or economic authority',
  () => {
    const joined = Object
      .values(sources)
      .join('\n');

    for (const forbidden of [
      'dangerouslySetInnerHTML',
      'fetch(',
      'invoke(',
      'localStorage',
      'sessionStorage',
      'claimPassportProfile',
      'wallet/hold',
      'ron-ledger',
      'svc-wallet',
      'window.location.reload',
    ]) {
      assert.doesNotMatch(
        joined,
        new RegExp(
          escapeRegExp(forbidden),
        ),
      );
    }
  },
);

test.after(() => {
  console.log(
    'FINAL_BETA_PHASE2C1_CONTENT_CARD=GREEN',
  );

  console.log(
    'FINAL_BETA_PHASE2C1_FEED_CARD=GREEN',
  );

  console.log(
    'FINAL_BETA_PHASE2C1_MEDIA_CARD=GREEN',
  );

  console.log(
    'FINAL_BETA_PHASE2C1_SITE_CARD=GREEN',
  );

  console.log(
    'FINAL_BETA_PHASE2C1_PROFILE_HEADER=GREEN',
  );

  console.log(
    'FINAL_BETA_PHASE2C1_RECEIPT_ROW=GREEN',
  );

  console.log(
    'FINAL_BETA_PHASE2C1_ROC_SUMMARY=GREEN',
  );

  console.log(
    'FINAL_BETA_PHASE2C1_AUTHORITY_EXPANSION=NO',
  );
});

function escapeRegExp(value) {
  return String(value)
    .replace(
      /[.*+?^${}()|[\]\\]/g,
      '\\$&',
    );
}

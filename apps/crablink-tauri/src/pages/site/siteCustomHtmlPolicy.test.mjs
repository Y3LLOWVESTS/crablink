import assert from 'node:assert/strict';

import {
  readFile,
} from 'node:fs/promises';

import test from 'node:test';

import {
  SITE_CUSTOM_HTML_POLICY_VERSION,
  acceptSiteCustomHtml,
  reviewSiteCustomHtml,
} from './siteCustomHtmlPolicy.js';

const setupUrl =
  new URL(
    './SiteGuidedSetup.jsx',
    import.meta.url,
  );

test(
  'Phase 11A2 custom HTML policy version is locked',
  () => {
    assert.equal(
      SITE_CUSTOM_HTML_POLICY_VERSION,
      'crablink.site-custom-html-policy.v1',
    );
  },
);

test(
  'Phase 11A2 static local HTML is accepted',
  () => {
    const reviewed =
      acceptSiteCustomHtml(
        '<main><h1>Hello</h1><a href="crab://profile/alice">Alice</a></main>',
      );

    assert.equal(
      reviewed.accepted,
      true,
    );

    assert.deepEqual(
      reviewed.review.findings,
      [],
    );
  },
);

test(
  'Phase 11A2 script elements are rejected',
  () => {
    const reviewed =
      reviewSiteCustomHtml(
        '<script>console.log("x")</script>',
      );

    assert.equal(
      reviewed.ok,
      false,
    );

    assert.equal(
      reviewed.findings.includes(
        'custom_javascript',
      ),
      true,
    );
  },
);

test(
  'Phase 11A2 JavaScript URLs are rejected',
  () => {
    const reviewed =
      reviewSiteCustomHtml(
        '<a href="javascript:alert(1)">run</a>',
      );

    assert.equal(
      reviewed.ok,
      false,
    );

    assert.equal(
      reviewed.findings.includes(
        'custom_javascript',
      ),
      true,
    );
  },
);

test(
  'Phase 11A2 arbitrary forms are rejected',
  () => {
    const reviewed =
      reviewSiteCustomHtml(
        '<form><input name="secret"></form>',
      );

    assert.equal(
      reviewed.ok,
      false,
    );

    assert.equal(
      reviewed.findings.includes(
        'arbitrary_form',
      ),
      true,
    );
  },
);

test(
  'Phase 11A2 standalone form controls are rejected',
  () => {
    const reviewed =
      reviewSiteCustomHtml(
        '<textarea name="message"></textarea>',
      );

    assert.equal(
      reviewed.ok,
      false,
    );

    assert.equal(
      reviewed.findings.includes(
        'arbitrary_form',
      ),
      true,
    );
  },
);

test(
  'Phase 11A2 iframes are rejected',
  () => {
    const reviewed =
      reviewSiteCustomHtml(
        '<iframe src="/local"></iframe>',
      );

    assert.equal(
      reviewed.ok,
      false,
    );

    assert.equal(
      reviewed.findings.includes(
        'iframe',
      ),
      true,
    );
  },
);

test(
  'Phase 11A2 inline event handlers are rejected',
  () => {
    const reviewed =
      reviewSiteCustomHtml(
        '<button onclick="runCode()">click</button>',
      );

    assert.equal(
      reviewed.ok,
      false,
    );

    assert.equal(
      reviewed.findings.includes(
        'event_handler',
      ),
      true,
    );
  },
);

test(
  'Phase 11A2 remote HTTP resources are rejected',
  () => {
    const reviewed =
      reviewSiteCustomHtml(
        '<img src="https://example.invalid/pixel.png">',
      );

    assert.equal(
      reviewed.ok,
      false,
    );

    assert.equal(
      reviewed.findings.includes(
        'remote_resource',
      ),
      true,
    );
  },
);

test(
  'Phase 11A2 protocol-relative remote resources are rejected',
  () => {
    const reviewed =
      reviewSiteCustomHtml(
        '<link href="//example.invalid/theme.css">',
      );

    assert.equal(
      reviewed.ok,
      false,
    );

    assert.equal(
      reviewed.findings.includes(
        'remote_resource',
      ),
      true,
    );
  },
);

test(
  'Phase 11A2 CSS remote resources are rejected',
  () => {
    const reviewed =
      reviewSiteCustomHtml(
        '<style>main { background-image: url(https://example.invalid/a.png); }</style>',
      );

    assert.equal(
      reviewed.ok,
      false,
    );

    assert.equal(
      reviewed.findings.includes(
        'remote_resource',
      ),
      true,
    );
  },
);

test(
  'Phase 11A2 rejected content never returns accepted HTML',
  () => {
    const reviewed =
      acceptSiteCustomHtml(
        '<iframe src="https://example.invalid"></iframe>',
      );

    assert.equal(
      reviewed.accepted,
      false,
    );

    assert.equal(
      reviewed.html,
      null,
    );
  },
);

test(
  'Phase 11A2 both retained Site HTML entry paths use the rejection boundary',
  async () => {
    const source =
      await readFile(
        setupUrl,
        'utf8',
      );

    assert.equal(
      source.includes(
        "import {\n  acceptSiteCustomHtml,\n} from './siteCustomHtmlPolicy.js';",
      ),
      true,
    );

    assert.equal(
      source.includes(
        "key ===\n        'rootHtml'",
      ),
      true,
    );

    assert.equal(
      source.includes(
        'const reviewed =\n          acceptSiteCustomHtml',
      ),
      true,
    );

    assert.equal(
      source.includes(
        'reader.result ??',
      ),
      true,
    );

    assert.equal(
      source.includes(
        'reviewed.accepted ===\n          false',
      ),
      true,
    );
  },
);

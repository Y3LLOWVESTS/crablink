/**
 * RO:WHAT — FINAL_BETA Phase 11A6 automated Site sandbox security regressions.
 * RO:WHY — Locks the existing defense-in-depth iframe and sanitizer boundary before Phase 11 closeout.
 * RO:INTERACTS — sandboxFrame, safeHtml, SiteSandboxPreview.
 * RO:INVARIANTS — scriptless sandbox, no same-origin privilege, no forms/popups, sanitized untrusted HTML.
 * RO:SECURITY — active browser content and dangerous iframe capability tokens remain forbidden.
 * RO:TEST — node --test siteSandboxSecurity.test.mjs.
 */

import assert from 'node:assert/strict';

import {
  readFile,
} from 'node:fs/promises';

import test from 'node:test';

import {
  SANDBOX_POLICY_VERSION,
  assertNoDangerousSandboxTokens,
  describeSandboxPolicy,
  getSiteIframeSandboxProps,
} from '../../shared/embed/sandboxFrame.js';

import {
  SAFE_HTML_VERSION,
  buildSandboxedSiteHtml,
  sanitizeUntrustedHtml,
} from '../../shared/embed/safeHtml.js';

const previewUrl =
  new URL(
    './SiteSandboxPreview.jsx',
    import.meta.url,
  );

test(
  'Phase 11A6 strict sandbox policy is versioned and capability free',
  () => {
    const policy =
      describeSandboxPolicy();

    assert.equal(
      SANDBOX_POLICY_VERSION,
      'crablink.sandbox-frame.v1',
    );

    assert.equal(
      policy.sandbox,
      '',
    );

    assert.equal(
      policy.referrer_policy,
      'no-referrer',
    );

    assert.equal(
      policy.allow,
      '',
    );

    assert.deepEqual(
      policy.allows,
      [],
    );

    for (
      const blocked
      of [
        'scripts',
        'forms',
        'popups',
        'downloads',
        'top-navigation',
        'same-origin privileges',
        'extension APIs',
        'wallet authority',
      ]
    ) {
      assert.equal(
        policy.blocks.includes(
          blocked,
        ),
        true,
      );
    }
  },
);

test(
  'Phase 11A6 iframe props expose no browser capabilities',
  () => {
    const props =
      getSiteIframeSandboxProps();

    assert.equal(
      props.sandbox,
      '',
    );

    assert.equal(
      props.referrerPolicy,
      'no-referrer',
    );

    assert.equal(
      props.allow,
      '',
    );

    const review =
      assertNoDangerousSandboxTokens(
        props.sandbox,
      );

    assert.equal(
      review.ok,
      true,
    );

    assert.deepEqual(
      review.dangerous_tokens,
      [],
    );
  },
);

test(
  'Phase 11A6 dangerous sandbox capability tokens are detected',
  () => {
    for (
      const token
      of [
        'allow-scripts',
        'allow-forms',
        'allow-popups',
        'allow-same-origin',
        'allow-top-navigation',
        'allow-downloads',
      ]
    ) {
      const review =
        assertNoDangerousSandboxTokens(
          token,
        );

      assert.equal(
        review.ok,
        false,
      );

      assert.equal(
        review.dangerous_tokens.includes(
          token,
        ),
        true,
      );
    }
  },
);

test(
  'Phase 11A6 sanitizer removes active browser execution surfaces',
  () => {
    const unsafe =
      [
        '<script>window.bad = 1</script>',
        '<iframe src="/frame"></iframe>',
        '<object data="/object"></object>',
        '<embed src="/embed">',
        '<form action="/submit"><input value="x"></form>',
        '<button onclick="run()">Run</button>',
        '<a href="javascript:run()">link</a>',
      ].join(
        '',
      );

    const safe =
      sanitizeUntrustedHtml(
        unsafe,
      );

    for (
      const forbidden
      of [
        '<script',
        '<iframe',
        '<object',
        '<embed',
        '<form',
        '<input',
        'onclick=',
        'javascript:',
      ]
    ) {
      assert.equal(
        safe
          .toLowerCase()
          .includes(
            forbidden,
          ),
        false,
      );
    }
  },
);

test(
  'Phase 11A6 safe renderer reports malicious input without granting authority',
  () => {
    const result =
      buildSandboxedSiteHtml(
        [
          '<main>',
          '<script>run()</script>',
          '<iframe src="/frame"></iframe>',
          '<form><input></form>',
          '<a onclick="run()" href="javascript:run()">x</a>',
          '</main>',
        ].join(
          '',
        ),
        {
          source:
            'local',
        },
      );

    assert.equal(
      SAFE_HTML_VERSION,
      'crablink.safe-html.v3',
    );

    assert.equal(
      result.policy.sanitizer.removed_scripts,
      true,
    );

    assert.equal(
      result.policy.sanitizer.removed_forms,
      true,
    );

    assert.equal(
      result.policy.sanitizer.removed_frames,
      true,
    );

    assert.equal(
      result.policy.sanitizer.removed_event_handlers,
      true,
    );

    assert.equal(
      result.policy.sanitizer.blocked_unsafe_urls,
      true,
    );

    assert.equal(
      result.policy.sandbox_policy.sandbox,
      '',
    );

    assert.equal(
      result.policy.sandbox_policy.allow,
      '',
    );
  },
);

test(
  'Phase 11A6 SiteSandboxPreview renders only through safe HTML and strict iframe policy',
  async () => {
    const source =
      await readFile(
        previewUrl,
        'utf8',
      );

    assert.equal(
      source.includes(
        'buildSandboxedSiteHtml',
      ),
      true,
    );

    assert.equal(
      source.includes(
        'getSiteIframeSandboxProps',
      ),
      true,
    );

    assert.equal(
      source.includes(
        '...iframeSandboxProps',
      ),
      true,
    );

    assert.equal(
      source.includes(
        'srcDoc: sandboxed.html',
      ),
      true,
    );

    assert.equal(
      source.includes(
        'dangerouslySetInnerHTML',
      ),
      false,
    );

    const executableSource =
      source
        .replace(
          /\/\*[\s\S]*?\*\//g,
          '',
        )
        .replace(
          /\/\/.*$/gm,
          '',
        );

    assert.equal(
      executableSource.includes(
        'allow-scripts',
      ),
      false,
    );

    assert.equal(
      executableSource.includes(
        'allow-same-origin',
      ),
      false,
    );
  },
);

test(
  'Phase 11A6 sandbox object URL lifecycle is explicitly released',
  async () => {
    const source =
      await readFile(
        previewUrl,
        'utf8',
      );

    assert.equal(
      source.includes(
        'URL.createObjectURL',
      ),
      true,
    );

    assert.equal(
      source.includes(
        'URL.revokeObjectURL',
      ),
      true,
    );
  },
);

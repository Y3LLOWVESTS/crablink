import assert from 'node:assert/strict';
import {
  readFile,
} from 'node:fs/promises';
import test from 'node:test';

const surfaceUrl =
  new URL(
    './ProfileTimelineSurface.jsx',
    import.meta.url,
  );

const styleUrl =
  new URL(
    './profileTimeline.css',
    import.meta.url,
  );

const modelUrl =
  new URL(
    './profileTimelineModel.js',
    import.meta.url,
  );

async function sources() {
  const [
    surface,
    styles,
    model,
  ] =
    await Promise.all([
      readFile(
        surfaceUrl,
        'utf8',
      ),
      readFile(
        styleUrl,
        'utf8',
      ),
      readFile(
        modelUrl,
        'utf8',
      ),
    ]);

  return {
    surface,
    styles,
    model,
  };
}

test(
  'phase7a2 exports one marked public-profile timeline surface',
  async () => {
    const {
      surface,
    } =
      await sources();

    assert.match(
      surface,
      /FINAL_BETA_PHASE7A2_PROFILE_TIMELINE_SURFACE_V1/,
    );

    assert.match(
      surface,
      /export default function ProfileTimelineSurface/,
    );

    assert.match(
      surface,
      /aria-label="Public profile publications"/,
    );
  },
);

test(
  'phase7a2 renders model-owned Posts About and conditional Sites tabs',
  async () => {
    const {
      surface,
      model,
    } =
      await sources();

    assert.match(
      surface,
      /model\.tabs\.filter/,
    );

    assert.match(
      surface,
      /role="tablist"/,
    );

    assert.match(
      surface,
      /role="tab"/,
    );

    assert.match(
      surface,
      /model\.activeTab === 'posts'/,
    );

    assert.match(
      surface,
      /model\.activeTab === 'about'/,
    );

    assert.match(
      surface,
      /model\.activeTab === 'sites'/,
    );

    assert.match(
      model,
      /id:\s*'posts'/,
    );

    assert.match(
      model,
      /id:\s*'about'/,
    );

    assert.match(
      model,
      /id:\s*'sites'/,
    );
  },
);

test(
  'phase7a2 renders pinned and regular backend publications separately',
  async () => {
    const {
      surface,
    } =
      await sources();

    assert.match(
      surface,
      /model\.pinnedPublication/,
    );

    assert.match(
      surface,
      /aria-label="Pinned publication"/,
    );

    assert.match(
      surface,
      /model\.postItems/,
    );

    assert.match(
      surface,
      /function PublicationCard/,
    );

    assert.match(
      surface,
      /data-publication-kind=/,
    );
  },
);

test(
  'phase7a2 includes honest loading error empty stale and offline states',
  async () => {
    const {
      surface,
    } =
      await sources();

    for (const required of [
      "model.status === 'loading'",
      "model.status === 'error'",
      "model.status === 'stale'",
      "model.status === 'offline'",
      'model.empty',
      'model.emptyState',
    ]) {
      assert.equal(
        surface.includes(
          required,
        ),
        true,
        `missing timeline state: ${required}`,
      );
    }
  },
);

test(
  'phase7a2 preserves bounded pagination and the opaque backend cursor',
  async () => {
    const {
      surface,
      model,
    } =
      await sources();

    assert.match(
      surface,
      /model\.pagination\.canLoadMore/,
    );

    assert.match(
      surface,
      /model\.pagination\.nextCursor/,
    );

    assert.match(
      surface,
      /Load more/,
    );

    assert.match(
      model,
      /maximumPageSize:\s*50/,
    );

    assert.equal(
      surface.includes(
        'nextCursor +',
      ),
      false,
    );
  },
);

test(
  'phase7a2 exposes owner edit only through the reviewed owner action',
  async () => {
    const {
      surface,
    } =
      await sources();

    assert.match(
      surface,
      /model\.owner\.editAction/,
    );

    assert.match(
      surface,
      /onEditProfile/,
    );

    assert.equal(
      surface.includes(
        'Edit profile',
      ),
      false,
    );

    assert.equal(
      surface.includes(
        'followAction',
      ),
      false,
    );

    assert.equal(
      surface.includes(
        '>Follow<',
      ),
      false,
    );
  },
);

test(
  'phase7a2 renders media and content cards without inventing profile counts',
  async () => {
    const {
      surface,
    } =
      await sources();

    assert.match(
      surface,
      /profile-publication-card-media/,
    );

    assert.match(
      surface,
      /publication\.kind/,
    );

    assert.match(
      surface,
      /publication\.summary/,
    );

    assert.equal(
      surface.includes(
        'followerCount',
      ),
      false,
    );

    assert.equal(
      surface.includes(
        'followingCount',
      ),
      false,
    );

    assert.equal(
      surface.includes(
        'likeCount',
      ),
      false,
    );
  },
);

test(
  'phase7a2 states backend authority and excludes local catalog access',
  async () => {
    const {
      surface,
    } =
      await sources();

    assert.match(
      surface,
      /backend publication projection/i,
    );

    assert.match(
      surface,
      /Local catalog authority: none/,
    );

    assert.equal(
      surface.includes(
        'localCatalog',
      ),
      false,
    );

    assert.equal(
      surface.includes(
        'publishCreatorPublication',
      ),
      false,
    );

    assert.equal(
      surface.includes(
        'walletMutation',
      ),
      false,
    );

    assert.equal(
      surface.includes(
        'receiptAuthority',
      ),
      false,
    );
  },
);

test(
  'phase7a2 styles the timeline with shared design tokens only',
  async () => {
    const {
      styles,
    } =
      await sources();

    for (const required of [
      '.profile-timeline-surface',
      '.profile-timeline-tabs',
      '.profile-publication-card',
      '.profile-pinned-publication',
      '.profile-about-panel',
      '.profile-timeline-pagination',
      '@media (max-width: 720px)',
    ]) {
      assert.equal(
        styles.includes(
          required,
        ),
        true,
        `missing timeline style: ${required}`,
      );
    }

    assert.equal(
      /#[0-9a-f]{3,8}\b/iu.test(
        styles,
      ),
      false,
    );

    assert.equal(
      /rgb[a]?\(/iu.test(
        styles,
      ),
      false,
    );

    assert.match(
      styles,
      /var\(--cl-/,
    );
  },
);

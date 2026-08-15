import assert from 'node:assert/strict';
import {
  readFile,
} from 'node:fs/promises';
import test from 'node:test';

const homeUrl =
  new URL(
    './HomePage.jsx',
    import.meta.url,
  );

const cssUrl =
  new URL(
    './home.css',
    import.meta.url,
  );

async function homeSource() {
  return readFile(
    homeUrl,
    'utf8',
  );
}

async function cssSource() {
  return readFile(
    cssUrl,
    'utf8',
  );
}

test(
  'phase10a1 marks local presentation pagination',
  async () => {
    const source =
      await homeSource();

    assert.match(
      source,
      /FINAL_BETA_PHASE10A1_HOME_LOCAL_PRESENTATION_PAGINATION_V1/,
    );
  },
);

test(
  'phase10a1 starts with a bounded ten-item presentation page',
  async () => {
    const source =
      await homeSource();

    assert.match(
      source,
      /HOME_FEED_PRESENTATION_PAGE_SIZE\s*=\s*10/,
    );

    assert.match(
      source,
      /visibleFeedCount[\s\S]*useState\([\s\S]*HOME_FEED_PRESENTATION_PAGE_SIZE/,
    );
  },
);

test(
  'phase10a1 resets presentation pagination on feed refresh',
  async () => {
    const source =
      await homeSource();

    assert.match(
      source,
      /async function loadFollowingFeed\(\)[\s\S]*setVisibleFeedCount\([\s\S]*HOME_FEED_PRESENTATION_PAGE_SIZE/,
    );
  },
);

test(
  'phase10a1 renders only the visible reviewed feed slice',
  async () => {
    const source =
      await homeSource();

    assert.match(
      source,
      /visibleFeedItems\s*=[\s\S]*feedItems\.slice\([\s\S]*visibleFeedCount/,
    );

    assert.match(
      source,
      /visibleFeedItems\.map\(/,
    );
  },
);

test(
  'phase10a1 load more stays bounded by reviewed feed length',
  async () => {
    const source =
      await homeSource();

    assert.match(
      source,
      />\s*Load more\s*</,
    );

    assert.match(
      source,
      /Math\.min\([\s\S]*HOME_FEED_PRESENTATION_PAGE_SIZE[\s\S]*feedItems\.length/,
    );

    assert.match(
      source,
      /Showing[\s\S]*visibleFeedItems\.length[\s\S]*feedItems\.length/,
    );
  },
);

test(
  'phase10a1 pagination adds no transport cursor ranking or economic authority',
  async () => {
    const source =
      await homeSource();

    const start =
      source.indexOf(
        'className="cl-home-feed-pagination"',
      );

    const end =
      source.indexOf(
        '<div className="cl-home-next-list">',
        start,
      );

    assert.equal(
      start >= 0,
      true,
    );

    assert.equal(
      end > start,
      true,
    );

    const pagination =
      source.slice(
        start,
        end,
      )
        .toLowerCase();

    for (
      const forbidden
      of [
        'listcreatorpublications',
        'refreshlocalfollowingfeed',
        'loadofflinelocalfollowingfeed',
        'cursor',
        'rank',
        'score',
        'wallet',
        'ledger',
        'quickchain',
        'rox',
        'solana',
      ]
    ) {
      assert.equal(
        pagination.includes(
          forbidden,
        ),
        false,
        `pagination contains forbidden authority token: ${forbidden}`,
      );
    }
  },
);

test(
  'phase10a1 pagination styling stays on shared theme tokens',
  async () => {
    const css =
      await cssSource();

    const start =
      css.indexOf(
        'FINAL_BETA_PHASE10A1_HOME_LOCAL_PRESENTATION_PAGINATION_V1',
      );

    assert.equal(
      start >= 0,
      true,
    );

    const phaseCss =
      css.slice(
        start,
      );

    assert.match(
      phaseCss,
      /var\(--cl-space-3\)/,
    );

    assert.match(
      phaseCss,
      /var\(--cl-text-muted\)/,
    );

    assert.doesNotMatch(
      phaseCss,
      /#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i,
    );
  },
);

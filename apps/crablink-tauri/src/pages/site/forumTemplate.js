/**
 * RO:WHAT — FINAL_BETA Phase 15 Forum specialization over the shared Site template engine.
 * RO:WHY — Registers the discussion-first Forum product without creating a separate renderer or backend.
 * RO:INTERACTS — forumModel, siteTemplateEngine, siteThemePolicy, siteTemplates, SiteGuidedSetup.
 * RO:INVARIANTS — Forum is template seven; typed Post/Comment behavior remains owned by forumModel; sticky/locked truth is not invented by the static template.
 * RO:SECURITY — declarative shared-engine definition only; no raw HTML/CSS/JS, publication mutation, moderation mutation, wallet authority, ledger authority, ROC bypass, QuickChain, ROX, or Solana authority.
 * RO:TEST — siteForumTemplateRegistration.test.mjs.
 */

import {
  createSiteTemplateDefinitionV1,
} from './siteTemplateEngine.js';

import {
  DEFAULT_SITE_THEME_TOKENS,
} from './siteThemePolicy.js';

import {
  FORUM_MODEL_VERSION,
} from './forumModel.js';

export {
  FORUM_MODEL_VERSION,
};

export const FORUM_TEMPLATE_ID =
  'forum';

export const FORUM_TEMPLATE_VERSION =
  1;

export function createForumTemplateDefinitionV1() {
  return createSiteTemplateDefinitionV1({
    id:
      FORUM_TEMPLATE_ID,

    version:
      FORUM_TEMPLATE_VERSION,

    name:
      'Forum',

    description:
      'Discussion-first Forum powered by the shared structured Site engine.',

    themeTokens:
      DEFAULT_SITE_THEME_TOKENS,

    navigation: [
      {
        id:
          'home',

        label:
          'Forum',

        href:
          '/',
      },

      {
        id:
          'threads',

        label:
          'Threads',

        href:
          '/threads',
      },
    ],

    sections: [
      {
        id:
          'hero',

        type:
          'hero',

        title:
          'Forum',

        subtitle:
          'Discussion threads built from typed CrabLink Posts and Comments.',
      },

      {
        id:
          'threads',

        type:
          'thread_list',

        title:
          'Latest discussions',

        limit:
          20,

        order:
          'latest_activity',

        category:
          'general',
      },
    ],
  });
}

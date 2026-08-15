/**
 * RO:WHAT — Structured definitions for CrabLink's four existing Site built-ins.
 * RO:WHY — FINAL_BETA Phase 12 moves normal built-in generation onto one declarative engine.
 * RO:INTERACTS — siteTemplates, siteTemplateEngine, siteThemePolicy.
 * RO:INVARIANTS — existing IDs and versions preserved; definitions use reviewed blocks only.
 * RO:SECURITY — no raw HTML, CSS, JavaScript, remote navigation, or remote asset authority.
 * RO:TEST — node --test siteStructuredTemplates.test.mjs.
 */

import {
  createSiteTemplateDefinitionV1,
} from './siteTemplateEngine.js';

import {
  DEFAULT_SITE_THEME_TOKENS,
} from './siteThemePolicy.js';

export const STRUCTURED_BUILTIN_TEMPLATE_IDS =
  Object.freeze([
    'reference_graph_smoke',
    'creator_landing',
    'image_showcase',
    'minimal_article',
  ]);

export function buildStructuredSiteTemplateDefinitions({
  templates,
  knownGoodImageUrl,
  knownGoodPostUrl,
  knownGoodCommentUrl,
  knownGoodArticleUrl,
}) {
  const metadata =
    new Map(
      templates.map(
        (template) => [
          template.id,
          template,
        ],
      ),
    );

  for (
    const id
    of STRUCTURED_BUILTIN_TEMPLATE_IDS
  ) {
    if (
      metadata.has(
        id,
      ) ===
      false
    ) {
      throw new Error(
        `Missing built-in Site template metadata: ${id}`,
      );
    }
  }

  const define =
    (
      id,
      sections,
      navigation = [],
    ) => {
      const template =
        metadata.get(
          id,
        );

      return createSiteTemplateDefinitionV1({
        id,

        version:
          Number(
            template.version ??
            1,
          ),

        name:
          String(
            template.name ??
            id,
          ),

        description:
          String(
            template.description ??
            '',
          ),

        themeTokens:
          DEFAULT_SITE_THEME_TOKENS,

        navigation,

        sections,
      });
    };

  const homeNavigation =
    [
      {
        id:
          'home',

        label:
          'Home',

        href:
          '/',
      },
    ];

  return Object.freeze({
    reference_graph_smoke:
      define(
        'reference_graph_smoke',
        [
          {
            id:
              'hero',

            type:
              'hero',

            title:
              'Reference Graph Smoke',

            subtitle:
              'Image, post, comment, and article references rendered through the shared Site engine.',
          },

          {
            id:
              'image',

            type:
              'asset_reference',

            title:
              'B3 Image',

            crabUrl:
              knownGoodImageUrl,

            caption:
              'Image bytes remain an independent typed CrabLink asset.',
          },

          {
            id:
              'post',

            type:
              'asset_reference',

            title:
              'Post',

            crabUrl:
              knownGoodPostUrl,
          },

          {
            id:
              'comment',

            type:
              'asset_reference',

            title:
              'Comment',

            crabUrl:
              knownGoodCommentUrl,
          },

          {
            id:
              'article',

            type:
              'asset_reference',

            title:
              'Article',

            crabUrl:
              knownGoodArticleUrl,
          },
        ],
        homeNavigation,
      ),

    creator_landing:
      define(
        'creator_landing',
        [
          {
            id:
              'hero',

            type:
              'hero',

            title:
              'Creator Landing',

            subtitle:
              'A structured creator homepage backed by typed CrabLink references.',
          },

          {
            id:
              'featured_image',

            type:
              'asset_reference',

            title:
              'Featured Image',

            crabUrl:
              knownGoodImageUrl,

            caption:
              'The image retains its independent canonical asset identity.',
          },

          {
            id:
              'about',

            type:
              'text',

            title:
              'About this Site',

            body:
              'The root is generated from reviewed declarative blocks instead of arbitrary page code.',
          },
        ],
        homeNavigation,
      ),

    image_showcase:
      define(
        'image_showcase',
        [
          {
            id:
              'hero',

            type:
              'hero',

            title:
              'Image Showcase',

            subtitle:
              'A structured image-first Site root.',
          },

          {
            id:
              'featured_image',

            type:
              'asset_reference',

            title:
              'Featured Image',

            crabUrl:
              knownGoodImageUrl,

            caption:
              'Rendered through the shared declarative asset-reference block.',
          },
        ],
      ),

    minimal_article:
      define(
        'minimal_article',
        [
          {
            id:
              'hero',

            type:
              'hero',

            title:
              'Minimal Article',

            subtitle:
              'A text-first root for the Blog specialization.',
          },

          {
            id:
              'cover',

            type:
              'asset_reference',

            title:
              'Cover Image',

            crabUrl:
              knownGoodImageUrl,
          },

          {
            id:
              'article',

            type:
              'asset_reference',

            title:
              'Featured Article',

            crabUrl:
              knownGoodArticleUrl,
          },

          {
            id:
              'why',

            type:
              'text',

            title:
              'Reference-native publishing',

            body:
              'Layout and referenced content can evolve independently while assets retain canonical identity.',
          },
        ],
        homeNavigation,
      ),
  });
}

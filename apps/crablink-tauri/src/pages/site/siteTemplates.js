/**
 * RO:WHAT — Built-in metadata and structured-engine handoff for the React crab://site workspace.
 * RO:WHY — Preserves reviewed built-in metadata while one shared declarative engine owns root generation.
 * RO:INTERACTS — SiteGuidedSetup.jsx, siteDraftModel.js, SiteRender.jsx, SiteSandboxPreview.jsx.
 * RO:INVARIANTS — local template only; no fake b3 CID; no fake site launch; no wallet/ROC mutation.
 * RO:METRICS — none.
 * RO:CONFIG — known-good local-dev proof URLs may be refreshed after stack restarts.
 * RO:SECURITY — built-ins carry no executable renderer; shared structured rendering remains scriptless and bounded.
 * RO:TEST — manual crab://site template insert + sandbox preview smoke.
 */

import {
  SAFE_HTML_VERSION,
} from '../../shared/embed/safeHtml.js';

import {
  SITE_TEMPLATE_ENGINE_VERSION,
  createSiteTemplateInstanceV1,
  renderSiteTemplateInstanceV1,
} from './siteTemplateEngine.js';

import {
  buildStructuredSiteTemplateDefinitions,
} from './siteStructuredTemplates.js';

import {
  BLOG_TEMPLATE_ID,
  BLOG_TEMPLATE_MODEL_VERSION,
  BLOG_TEMPLATE_VERSION,
  createBlogTemplateDefinitionV1,
  normalizeBlogSettings,
  renderBlogTemplateV1,
} from './blogTemplate.js';

import {
  IMAGEBOARD_MODEL_VERSION,
  IMAGEBOARD_TEMPLATE_ID,
  IMAGEBOARD_TEMPLATE_VERSION,
  createImageboardTemplateDefinitionV1,
} from './imageboardTemplate.js';

import {
  FORUM_MODEL_VERSION,
  FORUM_TEMPLATE_ID,
  FORUM_TEMPLATE_VERSION,
  createForumTemplateDefinitionV1,
} from './forumTemplate.js';

export const KNOWN_GOOD_IMAGE_URL =
  'crab://2e24f045f01a1bc77c57a94d622365e6b291936fcdd3ae64b45b0578e99c2058.image';

export const KNOWN_GOOD_POST_URL =
  'crab://b23f4c579201e17ab391dd3bff54635718a0b4c1371782ef87115b50f80bb1d3.post';

export const KNOWN_GOOD_COMMENT_URL =
  'crab://ad0fd74aa4c20095c3a08ae9f8e111b68ccff6537ed5f8fb769fa43f782d8f63.comment';

export const KNOWN_GOOD_ARTICLE_URL =
  'crab://35f307de7f34f0115420306703bf0d227404dbe91cc0743be7119b9b32b8af82.article';

export const SITE_TEMPLATE_VERSION = 1;

export const DEVELOPER_CUSTOM_HTML_TEMPLATE_ID =
  'developer_custom_html';

export const DEVELOPER_CUSTOM_HTML_TEMPLATE_VERSION =
  1;

const BLOG_SITE_TEMPLATE =
  Object.freeze({
    id:
      BLOG_TEMPLATE_ID,

    name:
      'Blog',

    tone:
      'Articles + posts + comments',

    description:
      'A creator-owned personal Blog with chronological articles, posts, archive, profile integration, and typed comments.',

    version:
      BLOG_TEMPLATE_VERSION,

    rendererVersion:
      SAFE_HTML_VERSION,

    patch: {
      title:
        'My Blog',

      description:
        'Articles, notes, and updates.',

      tags:
        'blog, articles, posts',

      routeMapJson:
        '{\n  "/": "local-root-draft",\n  "/archive": "blog-archive"\n}',

      assetMapJson:
        '{}',

      renderPolicy:
        'safe_embeds_only',
    },
  });

const IMAGEBOARD_SITE_TEMPLATE =
  Object.freeze({
    id:
      IMAGEBOARD_TEMPLATE_ID,

    name:
      'Imageboard',

    tone:
      'Image threads + replies',

    description:
      'An image-first board with categories, typed Image threads, replies, warnings, moderation projection, and bounded pagination.',

    version:
      IMAGEBOARD_TEMPLATE_VERSION,

    rendererVersion:
      SAFE_HTML_VERSION,

    modelVersion:
      IMAGEBOARD_MODEL_VERSION,

    patch: {
      title:
        'My Imageboard',

      description:
        'Image-first threads and replies built from typed CrabLink assets.',

      tags:
        'imageboard, images, threads',

      routeMapJson:
        '{\n  "/": "local-root-draft",\n  "/threads": "imageboard-thread-list"\n}',

      assetMapJson:
        '{}',

      renderPolicy:
        'safe_embeds_only',
    },
  });

const FOUNDATION_SITE_TEMPLATES = Object.freeze([
  {
    id: 'reference_graph_smoke',
    version: SITE_TEMPLATE_VERSION,
    rendererVersion: SAFE_HTML_VERSION,
    name: 'Reference Graph Smoke',
    tone: 'Image + post + comments + article',
    description:
      'Prebaked dev template for quickly testing crab-image, crab-post, crab-comment, and crab-article embeds after a stack run.',
    patch: {
      title: 'Reference Graph Smoke Site',
      description: 'A fast test root for b3-backed social/content embeds.',
      tags: 'site, reference-graph, post, comment, article, image',
      routeMapJson: '{\n  "/": "local-root-draft",\n  "/post": "known-good-post",\n  "/article": "known-good-article"\n}',
      assetMapJson: `{\n  "hero_image": "${KNOWN_GOOD_IMAGE_URL}",\n  "featured_post": "${KNOWN_GOOD_POST_URL}",\n  "featured_comment": "${KNOWN_GOOD_COMMENT_URL}",\n  "featured_article": "${KNOWN_GOOD_ARTICLE_URL}"\n}`,
      renderPolicy: 'safe_embeds_only',
    },
  },
  {
    id: 'creator_landing',
    version: SITE_TEMPLATE_VERSION,
    rendererVersion: SAFE_HTML_VERSION,
    name: 'Creator Landing',
    tone: 'Clean creator homepage',
    description: 'A polished landing page for a creator, small project, or personal CrabLink site.',
    patch: {
      title: 'My CrabLink Site',
      description: 'A clean creator site built from b3-addressed references.',
      tags: 'site, creator, landing',
      routeMapJson: '{\n  "/": "local-root-draft",\n  "/about": "local-about-section"\n}',
      assetMapJson: `{\n  "hero_image": "${KNOWN_GOOD_IMAGE_URL}"\n}`,
      renderPolicy: 'safe_embeds_only',
    },
  },
  {
    id: 'image_showcase',
    version: SITE_TEMPLATE_VERSION,
    rendererVersion: SAFE_HTML_VERSION,
    name: 'Image Showcase',
    tone: 'Gallery-style image reference',
    description: 'A visual template for proving that images are independent assets referenced from a site root.',
    patch: {
      title: 'Image Showcase',
      description: 'A b3-backed gallery where the site references image assets.',
      tags: 'site, image, gallery',
      routeMapJson: '{\n  "/": "local-root-draft",\n  "/gallery": "local-gallery-section"\n}',
      assetMapJson: `{\n  "featured_image": "${KNOWN_GOOD_IMAGE_URL}"\n}`,
      renderPolicy: 'safe_embeds_only',
    },
  },
  {
    id: 'minimal_article',
    version: SITE_TEMPLATE_VERSION,
    rendererVersion: SAFE_HTML_VERSION,
    name: 'Minimal Article',
    tone: 'Text-first article page',
    description: 'A simple article-style root with optional image and typed article references.',
    patch: {
      title: 'The Dusty Onion Dispatch',
      description: 'A simple article shell for testing future post/article embeds.',
      tags: 'site, article, writing',
      routeMapJson: '{\n  "/": "local-root-draft",\n  "/article": "local-article-section"\n}',
      assetMapJson: `{\n  "cover_image": "${KNOWN_GOOD_IMAGE_URL}",\n  "article": "${KNOWN_GOOD_ARTICLE_URL}"\n}`,
      renderPolicy: 'safe_embeds_only',
    },
  },
]);

const FORUM_SITE_TEMPLATE =
  Object.freeze({
    id:
      FORUM_TEMPLATE_ID,

    name:
      'Forum',

    tone:
      'Discussion threads + replies',

    description:
      'A discussion-first Forum with categories, typed Post threads, Comment reply chains, moderation projection, reviewed sticky and locked state, latest activity, and bounded pagination.',

    version:
      FORUM_TEMPLATE_VERSION,

    rendererVersion:
      SAFE_HTML_VERSION,

    modelVersion:
      FORUM_MODEL_VERSION,

    patch: {
      title:
        'My Forum',

      description:
        'Discussion threads and replies built from typed CrabLink Posts and Comments.',

      tags:
        'forum, discussions, threads',

      routeMapJson:
        '{\n  "/": "local-root-draft",\n  "/threads": "forum-thread-list"\n}',

      assetMapJson:
        '{}',

      renderPolicy:
        'safe_embeds_only',
    },
  });

export const SITE_TEMPLATES =
  Object.freeze([
    ...FOUNDATION_SITE_TEMPLATES,
    BLOG_SITE_TEMPLATE,
    IMAGEBOARD_SITE_TEMPLATE,
    FORUM_SITE_TEMPLATE,
  ]);

const FOUNDATION_SITE_TEMPLATE_DEFINITIONS =
  buildStructuredSiteTemplateDefinitions({
    templates:
      SITE_TEMPLATES,

    knownGoodImageUrl:
      KNOWN_GOOD_IMAGE_URL,

    knownGoodPostUrl:
      KNOWN_GOOD_POST_URL,

    knownGoodCommentUrl:
      KNOWN_GOOD_COMMENT_URL,

    knownGoodArticleUrl:
      KNOWN_GOOD_ARTICLE_URL,
  });

const IMAGEBOARD_SITE_TEMPLATE_DEFINITION =
  createImageboardTemplateDefinitionV1(
    FOUNDATION_SITE_TEMPLATE_DEFINITIONS.image_showcase,
  );

export const SITE_TEMPLATE_DEFINITIONS =
  Object.freeze({
    ...FOUNDATION_SITE_TEMPLATE_DEFINITIONS,

    [BLOG_TEMPLATE_ID]:
      createBlogTemplateDefinitionV1(),

    [IMAGEBOARD_TEMPLATE_ID]:
      IMAGEBOARD_SITE_TEMPLATE_DEFINITION,

    [FORUM_TEMPLATE_ID]:
      createForumTemplateDefinitionV1(),
  });

export const DEFAULT_SITE_TEMPLATE = SITE_TEMPLATES[0];

export function getSiteTemplateById(id) {
  const safeId = String(id || '').trim();
  return SITE_TEMPLATES.find((template) => template.id === safeId) || DEFAULT_SITE_TEMPLATE;
}

export function buildSiteTemplatePatch(
  templateId,
  currentDraft = {},
) {
  const template =
    getSiteTemplateById(
      templateId,
    );

  const patch =
    template.patch ||
    {};

  const next = {
    ...currentDraft,
    ...patch,

    rootDocumentCid:
      '',

    templateId:
      template.id,

    templateVersion:
      template.version,

    rendererVersion:
      template.rendererVersion,
  };

  if (
    template.id ===
    BLOG_TEMPLATE_ID
  ) {
    const priorTemplateSettings =
      currentDraft.templateId ===
        BLOG_TEMPLATE_ID &&
      currentDraft.templateSettings &&
      typeof currentDraft.templateSettings ===
        'object' &&
      Array.isArray(
        currentDraft.templateSettings,
      ) ===
        false
        ? currentDraft.templateSettings
        : {};

    const blogSettings =
      normalizeBlogSettings({
        ...priorTemplateSettings,

        title:
          next.title,

        description:
          next.description,

        authorProfileCrabUrl:
          priorTemplateSettings
            .authorProfileCrabUrl ??
          blogAuthorProfileRoute(
            currentDraft.creatorDisplay,
          ),
      });

    const blogOutput =
      renderBlogTemplateV1(
        blogSettings,
      );

    return {
      ...next,

      templateModelVersion:
        BLOG_TEMPLATE_MODEL_VERSION,

      templateSettings:
        blogSettings,

      templateEngineVersion:
        blogOutput.engineVersion,

      templateInstance:
        blogOutput.instance,

      rootHtml:
        blogOutput.rendered.html,
    };
  }

  const definition =
    SITE_TEMPLATE_DEFINITIONS[
      template.id
    ];

  if (
    definition == null
  ) {
    throw new Error(
      `Structured Site template definition missing: ${template.id}`,
    );
  }

  const instance =
    createSiteTemplateInstanceV1(
      definition,
      {
        title:
          next.title,

        description:
          next.description,

        themeTokens:
          next.themeTokens ??
          definition.themeTokens,

        references:
          next.templateReferences ??
          {},
      },
    );

  const rendered =
    renderSiteTemplateInstanceV1(
      instance,
    );

  return {
    ...next,

    templateEngineVersion:
      SITE_TEMPLATE_ENGINE_VERSION,

    templateInstance:
      instance,

    rootHtml:
      rendered.html,
  };
}

function blogAuthorProfileRoute(
  creatorDisplay,
) {
  const raw =
    String(
      creatorDisplay ??
      '',
    ).trim();

  const handle =
    raw.startsWith(
      '@',
    )
      ? raw.slice(
          1,
        )
      : raw;

  if (
    /^[a-zA-Z0-9._-]{1,64}$/.test(
      handle,
    )
  ) {
    return `crab://@${handle}`;
  }

  return 'crab://profile';
}

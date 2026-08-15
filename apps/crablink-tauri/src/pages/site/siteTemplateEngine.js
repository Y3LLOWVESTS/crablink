/**
 * RO:WHAT — Shared structured Site template engine foundation for FINAL_BETA Phase 12.
 * RO:WHY — Blog, imageboard, forum, and future beta Site types must share one declarative engine instead of custom HTML implementations.
 * RO:INTERACTS — siteThemePolicy, embedRegistry, Site templates, Site launch/manifest integration.
 * RO:INVARIANTS — declarative blocks only; bounded theme/navigation/query fields; deterministic scriptless render output.
 * RO:SECURITY — no raw HTML/CSS/JS fields, no remote navigation/resources, no opaque ranking, no arbitrary plugins.
 * RO:TEST — node --test siteTemplateEngine.test.mjs.
 */

import {
  DEFAULT_SITE_THEME_TOKENS,
  reviewSiteThemeTokens,
} from './siteThemePolicy.js';

export const SITE_TEMPLATE_ENGINE_VERSION =
  'crablink.site-template-engine.v1';

export const SITE_TEMPLATE_DEFINITION_SCHEMA =
  'crablink.site-template-definition.v1';

export const SITE_TEMPLATE_INSTANCE_SCHEMA =
  'crablink.site-template-instance.v1';

export const SITE_TEMPLATE_RENDER_SCHEMA =
  'crablink.site-template-render.v1';

export const SITE_TEMPLATE_LEGACY_INSTANCE_SCHEMA =
  'crablink.site-template-instance.v0';

export const SITE_TEMPLATE_ALLOWED_BLOCKS =
  Object.freeze([
    'hero',
    'text',
    'navigation',
    'content_query',
    'thread_list',
    'thread_detail',
    'asset_reference',
    'divider',
  ]);

export const SITE_TEMPLATE_CONTENT_KINDS =
  Object.freeze([
    'post',
    'article',
    'comment',
    'image',
  ]);

export const SITE_TEMPLATE_QUERY_ORDERS =
  Object.freeze([
    'chronological',
  ]);

export const SITE_TEMPLATE_THREAD_ORDERS =
  Object.freeze([
    'chronological',
    'latest_activity',
  ]);

const MAX_NAVIGATION_ITEMS =
  12;

const MAX_SECTIONS =
  24;

const MAX_QUERY_LIMIT =
  50;

const CRAB_ASSET_TAGS =
  Object.freeze({
    image:
      'crab-image',

    post:
      'crab-post',

    comment:
      'crab-comment',

    article:
      'crab-article',
  });

/**
 * @typedef {Object} SiteTemplateDefinitionV1
 * @property {string} schema
 * @property {string} id
 * @property {number} version
 * @property {string} name
 * @property {string} description
 * @property {Object} themeTokens
 * @property {Array<Object>} navigation
 * @property {Array<Object>} sections
 */

/**
 * @typedef {Object} SiteTemplateInstanceV1
 * @property {string} schema
 * @property {string} engineVersion
 * @property {number} instanceVersion
 * @property {string} templateId
 * @property {number} templateVersion
 * @property {string} title
 * @property {string} description
 * @property {Object} themeTokens
 * @property {Array<Object>} navigation
 * @property {Array<Object>} sections
 * @property {Object} references
 */

export class SiteTemplateEngineError extends Error {
  constructor(
    message,
    {
      reason =
        'site_template_engine_error',

      field =
        '',
    } = {},
  ) {
    super(
      message,
    );

    this.name =
      'SiteTemplateEngineError';

    this.reason =
      reason;

    this.field =
      field;
  }
}

export function createSiteTemplateDefinitionV1(
  input,
) {
  const value =
    plainObject(
      input,
      'definition',
    );

  assertOnlyKeys(
    value,
    [
      'schema',
      'id',
      'version',
      'name',
      'description',
      'themeTokens',
      'navigation',
      'sections',
    ],
    'definition',
  );

  if (
    value.schema != null &&
    value.schema !==
      SITE_TEMPLATE_DEFINITION_SCHEMA
  ) {
    fail(
      'Unsupported Site template definition schema.',
      'invalid_definition_schema',
      'schema',
    );
  }

  const id =
    canonicalId(
      value.id,
      'id',
    );

  const version =
    boundedVersion(
      value.version,
      'version',
    );

  const name =
    boundedText(
      value.name,
      80,
      'name',
      {
        required:
          true,
      },
    );

  const description =
    boundedText(
      value.description,
      240,
      'description',
    );

  const themeTokens =
    normalizeThemeTokens(
      value.themeTokens,
    );

  const navigation =
    normalizeNavigation(
      value.navigation,
    );

  const sections =
    normalizeSections(
      value.sections,
    );

  return deepFreeze({
    schema:
      SITE_TEMPLATE_DEFINITION_SCHEMA,

    id,

    version,

    name,

    description,

    themeTokens,

    navigation,

    sections,
  });
}

export function createSiteTemplateInstanceV1(
  definitionInput,
  instanceInput = {},
) {
  const definition =
    createSiteTemplateDefinitionV1(
      definitionInput,
    );

  const input =
    plainObject(
      instanceInput,
      'instance',
    );

  assertOnlyKeys(
    input,
    [
      'schema',
      'engineVersion',
      'instanceVersion',
      'templateId',
      'templateVersion',
      'title',
      'description',
      'themeTokens',
      'navigation',
      'sections',
      'references',
    ],
    'instance',
  );

  if (
    input.templateId != null &&
    input.templateId !==
      definition.id
  ) {
    fail(
      'Site template instance templateId does not match its definition.',
      'template_id_mismatch',
      'templateId',
    );
  }

  if (
    input.templateVersion != null &&
    Number(
      input.templateVersion,
    ) !==
      definition.version
  ) {
    fail(
      'Site template instance templateVersion does not match its definition.',
      'template_version_mismatch',
      'templateVersion',
    );
  }

  return normalizeSiteTemplateInstanceV1({
    schema:
      SITE_TEMPLATE_INSTANCE_SCHEMA,

    engineVersion:
      SITE_TEMPLATE_ENGINE_VERSION,

    instanceVersion:
      1,

    templateId:
      definition.id,

    templateVersion:
      definition.version,

    title:
      input.title ??
      definition.name,

    description:
      input.description ??
      definition.description,

    themeTokens:
      input.themeTokens ??
      definition.themeTokens,

    navigation:
      input.navigation ??
      definition.navigation,

    sections:
      input.sections ??
      definition.sections,

    references:
      input.references ??
      {},
  });
}

export function normalizeSiteTemplateInstanceV1(
  input,
) {
  const value =
    plainObject(
      input,
      'instance',
    );

  assertOnlyKeys(
    value,
    [
      'schema',
      'engineVersion',
      'instanceVersion',
      'templateId',
      'templateVersion',
      'title',
      'description',
      'themeTokens',
      'navigation',
      'sections',
      'references',
    ],
    'instance',
  );

  if (
    value.schema !==
    SITE_TEMPLATE_INSTANCE_SCHEMA
  ) {
    fail(
      'Unsupported Site template instance schema.',
      'invalid_instance_schema',
      'schema',
    );
  }

  if (
    value.engineVersion !==
    SITE_TEMPLATE_ENGINE_VERSION
  ) {
    fail(
      'Unsupported Site template engine version.',
      'invalid_engine_version',
      'engineVersion',
    );
  }

  if (
    Number(
      value.instanceVersion,
    ) !==
    1
  ) {
    fail(
      'Unsupported Site template instance version.',
      'invalid_instance_version',
      'instanceVersion',
    );
  }

  const templateId =
    canonicalId(
      value.templateId,
      'templateId',
    );

  const templateVersion =
    boundedVersion(
      value.templateVersion,
      'templateVersion',
    );

  const title =
    boundedText(
      value.title,
      120,
      'title',
      {
        required:
          true,
      },
    );

  const description =
    boundedText(
      value.description,
      320,
      'description',
    );

  const themeTokens =
    normalizeThemeTokens(
      value.themeTokens,
    );

  const navigation =
    normalizeNavigation(
      value.navigation,
    );

  const sections =
    normalizeSections(
      value.sections,
    );

  const references =
    normalizeReferences(
      value.references,
    );

  return deepFreeze({
    schema:
      SITE_TEMPLATE_INSTANCE_SCHEMA,

    engineVersion:
      SITE_TEMPLATE_ENGINE_VERSION,

    instanceVersion:
      1,

    templateId,

    templateVersion,

    title,

    description,

    themeTokens,

    navigation,

    sections,

    references,
  });
}

export function migrateSiteTemplateInstanceV1(
  input,
) {
  const value =
    plainObject(
      input,
      'legacyInstance',
    );

  if (
    value.schema ===
    SITE_TEMPLATE_INSTANCE_SCHEMA
  ) {
    return normalizeSiteTemplateInstanceV1(
      value,
    );
  }

  if (
    value.schema != null &&
    value.schema !==
      SITE_TEMPLATE_LEGACY_INSTANCE_SCHEMA
  ) {
    fail(
      'Unsupported legacy Site template instance schema.',
      'unsupported_instance_migration',
      'schema',
    );
  }

  const references =
    plainObjectOrEmpty(
      value.references,
    );

  return normalizeSiteTemplateInstanceV1({
    schema:
      SITE_TEMPLATE_INSTANCE_SCHEMA,

    engineVersion:
      SITE_TEMPLATE_ENGINE_VERSION,

    instanceVersion:
      1,

    templateId:
      value.templateId ??
      value.template_id,

    templateVersion:
      value.templateVersion ??
      value.template_version ??
      1,

    title:
      value.title ??
      value.name ??
      'Site',

    description:
      value.description ??
      '',

    themeTokens:
      value.themeTokens ??
      value.theme ??
      DEFAULT_SITE_THEME_TOKENS,

    navigation:
      value.navigation ??
      value.nav ??
      [],

    sections:
      value.sections ??
      value.blocks ??
      [],

    references: {
      definitionB3Cid:
        references.definitionB3Cid ??
        value.definition_b3_cid ??
        null,

      sourceManifestB3Cid:
        references.sourceManifestB3Cid ??
        value.source_manifest_b3_cid ??
        null,
    },
  });
}

export function renderSiteTemplateInstanceV1(
  input,
) {
  const instance =
    normalizeSiteTemplateInstanceV1(
      input,
    );

  const theme =
    instance.themeTokens;

  const attributes =
    [
      [
        'data-site-template-engine',
        SITE_TEMPLATE_ENGINE_VERSION,
      ],

      [
        'data-site-template-id',
        instance.templateId,
      ],

      [
        'data-site-template-version',
        String(
          instance.templateVersion,
        ),
      ],

      [
        'data-theme-surface',
        theme.surface,
      ],

      [
        'data-theme-text',
        theme.text,
      ],

      [
        'data-theme-accent',
        theme.accent,
      ],

      [
        'data-theme-border',
        theme.border,
      ],

      [
        'data-theme-radius',
        theme.radius,
      ],

      [
        'data-theme-spacing',
        theme.spacing,
      ],

      [
        'data-theme-font',
        theme.font,
      ],
    ];

  if (
    instance.references
      .definitionB3Cid
  ) {
    attributes.push([
      'data-definition-b3',
      instance.references
        .definitionB3Cid,
    ]);
  }

  if (
    instance.references
      .sourceManifestB3Cid
  ) {
    attributes.push([
      'data-source-manifest-b3',
      instance.references
        .sourceManifestB3Cid,
    ]);
  }

  const attributeText =
    attributes
      .map(
        ([key, value]) =>
          `${key}="${escapeAttribute(value)}"`,
      )
      .join(
        ' ',
      );

  const lines =
    [
      `<main class="cl-site-template" ${attributeText}>`,
      '  <header data-site-template-header="true">',
      `    <h1>${escapeHtml(instance.title)}</h1>`,
    ];

  if (
    instance.description
  ) {
    lines.push(
      `    <p>${escapeHtml(instance.description)}</p>`,
    );
  }

  lines.push(
    '  </header>',
  );

  for (
    const section
    of instance.sections
  ) {
    lines.push(
      ...renderSection(
        section,
        instance.navigation,
      ),
    );
  }

  lines.push(
    '</main>',
  );

  const html =
    lines.join(
      '\n',
    );

  assertScriptlessOutput(
    html,
  );

  return deepFreeze({
    schema:
      SITE_TEMPLATE_RENDER_SCHEMA,

    engineVersion:
      SITE_TEMPLATE_ENGINE_VERSION,

    templateId:
      instance.templateId,

    templateVersion:
      instance.templateVersion,

    blockCount:
      instance.sections.length,

    references:
      instance.references,

    html,
  });
}

export function assertScriptlessOutput(
  html,
) {
  const value =
    String(
      html ??
      '',
    );

  const forbiddenPatterns =
    [
      {
        field:
          'script_element',

        pattern:
          /<\s*script\b/i,
      },

      {
        field:
          'style_element',

        pattern:
          /<\s*style\b/i,
      },

      {
        field:
          'iframe_element',

        pattern:
          /<\s*iframe\b/i,
      },

      {
        field:
          'object_element',

        pattern:
          /<\s*object\b/i,
      },

      {
        field:
          'embed_element',

        pattern:
          /<\s*embed\b/i,
      },

      {
        field:
          'form_element',

        pattern:
          /<\s*form\b/i,
      },

      {
        field:
          'javascript_url',

        pattern:
          /<[^>]+\b(?:href|src)\s*=\s*["']?\s*javascript:/i,
      },

      {
        field:
          'event_handler',

        pattern:
          /<[^>]+\son[a-z0-9_-]+\s*=/i,
      },
    ];

  for (
    const check
    of forbiddenPatterns
  ) {
    if (
      check.pattern.test(
        value,
      )
    ) {
      fail(
        'Structured Site renderer produced a forbidden active-content surface.',
        'non_scriptless_render_output',
        check.field,
      );
    }
  }

  return true;
}

function normalizeThemeTokens(
  input,
) {
  const review =
    reviewSiteThemeTokens(
      input,
      {
        allowAbsent:
          false,
      },
    );

  if (
    review.accepted ===
    false
  ) {
    fail(
      'Site template theme tokens are outside the reviewed allowlist.',
      'invalid_theme_tokens',
      review.key ||
      'themeTokens',
    );
  }

  return {
    ...review.tokens,
  };
}

function normalizeNavigation(
  input,
) {
  const value =
    input == null
      ? []
      : input;

  if (
    Array.isArray(
      value,
    ) ===
    false
  ) {
    fail(
      'Site template navigation must be an array.',
      'invalid_navigation',
      'navigation',
    );
  }

  if (
    value.length >
    MAX_NAVIGATION_ITEMS
  ) {
    fail(
      'Site template navigation exceeds the reviewed item bound.',
      'navigation_limit_exceeded',
      'navigation',
    );
  }

  return value.map(
    (item, index) =>
      normalizeNavigationItem(
        item,
        index,
      ),
  );
}

function normalizeNavigationItem(
  input,
  index,
) {
  const value =
    plainObject(
      input,
      `navigation[${index}]`,
    );

  assertOnlyKeys(
    value,
    [
      'id',
      'label',
      'href',
    ],
    `navigation[${index}]`,
  );

  return {
    id:
      canonicalId(
        value.id,
        `navigation[${index}].id`,
      ),

    label:
      boundedText(
        value.label,
        64,
        `navigation[${index}].label`,
        {
          required:
            true,
        },
      ),

    href:
      normalizeInternalHref(
        value.href,
        `navigation[${index}].href`,
      ),
  };
}

function normalizeSections(
  input,
) {
  const value =
    input == null
      ? []
      : input;

  if (
    Array.isArray(
      value,
    ) ===
    false
  ) {
    fail(
      'Site template sections must be an array.',
      'invalid_sections',
      'sections',
    );
  }

  if (
    value.length >
    MAX_SECTIONS
  ) {
    fail(
      'Site template sections exceed the reviewed block bound.',
      'section_limit_exceeded',
      'sections',
    );
  }

  return value.map(
    (section, index) =>
      normalizeSection(
        section,
        index,
      ),
  );
}

function normalizeSection(
  input,
  index,
) {
  const value =
    plainObject(
      input,
      `sections[${index}]`,
    );

  const type =
    boundedText(
      value.type,
      32,
      `sections[${index}].type`,
      {
        required:
          true,
      },
    );

  if (
    SITE_TEMPLATE_ALLOWED_BLOCKS.includes(
      type,
    ) ===
    false
  ) {
    fail(
      'Site template contains an unreviewed block type.',
      'unsupported_block_type',
      `sections[${index}].type`,
    );
  }

  const id =
    canonicalId(
      value.id,
      `sections[${index}].id`,
    );

  switch (
    type
  ) {
    case 'hero':
      assertOnlyKeys(
        value,
        [
          'id',
          'type',
          'title',
          'subtitle',
        ],
        `sections[${index}]`,
      );

      return {
        id,
        type,

        title:
          boundedText(
            value.title,
            120,
            `sections[${index}].title`,
            {
              required:
                true,
            },
          ),

        subtitle:
          boundedText(
            value.subtitle,
            320,
            `sections[${index}].subtitle`,
          ),
      };

    case 'text':
      assertOnlyKeys(
        value,
        [
          'id',
          'type',
          'title',
          'body',
        ],
        `sections[${index}]`,
      );

      return {
        id,
        type,

        title:
          boundedText(
            value.title,
            120,
            `sections[${index}].title`,
          ),

        body:
          boundedText(
            value.body,
            4000,
            `sections[${index}].body`,
            {
              required:
                true,
            },
          ),
      };

    case 'navigation':
      assertOnlyKeys(
        value,
        [
          'id',
          'type',
          'title',
        ],
        `sections[${index}]`,
      );

      return {
        id,
        type,

        title:
          boundedText(
            value.title,
            120,
            `sections[${index}].title`,
          ),
      };

    case 'content_query':
      assertOnlyKeys(
        value,
        [
          'id',
          'type',
          'title',
          'kinds',
          'limit',
          'order',
          'tag',
        ],
        `sections[${index}]`,
      );

      return {
        id,
        type,

        title:
          boundedText(
            value.title,
            120,
            `sections[${index}].title`,
          ),

        kinds:
          normalizeContentKinds(
            value.kinds,
            `sections[${index}].kinds`,
          ),

        limit:
          normalizeLimit(
            value.limit,
            `sections[${index}].limit`,
          ),

        order:
          normalizeOrder(
            value.order,
            SITE_TEMPLATE_QUERY_ORDERS,
            'chronological',
            `sections[${index}].order`,
          ),

        tag:
          normalizeOptionalSlug(
            value.tag,
            `sections[${index}].tag`,
          ),
      };

    case 'thread_list':
      assertOnlyKeys(
        value,
        [
          'id',
          'type',
          'title',
          'limit',
          'order',
          'category',
        ],
        `sections[${index}]`,
      );

      return {
        id,
        type,

        title:
          boundedText(
            value.title,
            120,
            `sections[${index}].title`,
          ),

        limit:
          normalizeLimit(
            value.limit,
            `sections[${index}].limit`,
          ),

        order:
          normalizeOrder(
            value.order,
            SITE_TEMPLATE_THREAD_ORDERS,
            'latest_activity',
            `sections[${index}].order`,
          ),

        category:
          normalizeOptionalSlug(
            value.category,
            `sections[${index}].category`,
          ),
      };

    case 'thread_detail':
      assertOnlyKeys(
        value,
        [
          'id',
          'type',
          'title',
          'binding',
        ],
        `sections[${index}]`,
      );

      if (
        value.binding !==
        'route.thread'
      ) {
        fail(
          'Thread detail blocks must use the reviewed route.thread binding.',
          'invalid_thread_binding',
          `sections[${index}].binding`,
        );
      }

      return {
        id,
        type,

        title:
          boundedText(
            value.title,
            120,
            `sections[${index}].title`,
          ),

        binding:
          'route.thread',
      };

    case 'asset_reference':
      assertOnlyKeys(
        value,
        [
          'id',
          'type',
          'title',
          'crabUrl',
          'caption',
        ],
        `sections[${index}]`,
      );

      return {
        id,
        type,

        title:
          boundedText(
            value.title,
            120,
            `sections[${index}].title`,
          ),

        crabUrl:
          normalizeTypedCrabAssetUrl(
            value.crabUrl,
            `sections[${index}].crabUrl`,
          ),

        caption:
          boundedText(
            value.caption,
            320,
            `sections[${index}].caption`,
          ),
      };

    case 'divider':
      assertOnlyKeys(
        value,
        [
          'id',
          'type',
        ],
        `sections[${index}]`,
      );

      return {
        id,
        type,
      };

    default:
      fail(
        'Site template block type is not implemented.',
        'unsupported_block_type',
        `sections[${index}].type`,
      );
  }
}

function normalizeContentKinds(
  input,
  field,
) {
  const value =
    Array.isArray(
      input,
    )
      ? input
      : [];

  if (
    value.length ===
    0
  ) {
    fail(
      'Content query blocks require at least one content kind.',
      'missing_content_kinds',
      field,
    );
  }

  const normalized =
    [];

  for (
    const raw
    of value
  ) {
    const kind =
      String(
        raw ??
        '',
      )
        .trim()
        .toLowerCase();

    if (
      SITE_TEMPLATE_CONTENT_KINDS.includes(
        kind,
      ) ===
      false
    ) {
      fail(
        'Content query contains an unsupported kind.',
        'unsupported_content_kind',
        field,
      );
    }

    if (
      normalized.includes(
        kind,
      ) ===
      false
    ) {
      normalized.push(
        kind,
      );
    }
  }

  return normalized;
}

function normalizeLimit(
  input,
  field,
) {
  const value =
    Number(
      input ??
      12,
    );

  if (
    Number.isInteger(
      value,
    ) ===
      false ||
    value <
      1 ||
    value >
      MAX_QUERY_LIMIT
  ) {
    fail(
      'Site template query limit is outside the reviewed bound.',
      'invalid_query_limit',
      field,
    );
  }

  return value;
}

function normalizeOrder(
  input,
  allowed,
  fallback,
  field,
) {
  const value =
    String(
      input ??
      fallback,
    )
      .trim()
      .toLowerCase();

  if (
    allowed.includes(
      value,
    ) ===
    false
  ) {
    fail(
      'Site template query order is not reviewed.',
      'invalid_query_order',
      field,
    );
  }

  return value;
}

function normalizeReferences(
  input,
) {
  const value =
    plainObjectOrEmpty(
      input,
    );

  assertOnlyKeys(
    value,
    [
      'definitionB3Cid',
      'sourceManifestB3Cid',
    ],
    'references',
  );

  return {
    definitionB3Cid:
      normalizeOptionalB3Cid(
        value.definitionB3Cid,
        'references.definitionB3Cid',
      ),

    sourceManifestB3Cid:
      normalizeOptionalB3Cid(
        value.sourceManifestB3Cid,
        'references.sourceManifestB3Cid',
      ),
  };
}

function renderSection(
  section,
  navigation,
) {
  switch (
    section.type
  ) {
    case 'hero': {
      const lines =
        [
          `  <section data-site-block="hero" data-block-id="${escapeAttribute(section.id)}">`,
          `    <h2>${escapeHtml(section.title)}</h2>`,
        ];

      if (
        section.subtitle
      ) {
        lines.push(
          `    <p>${escapeHtml(section.subtitle)}</p>`,
        );
      }

      lines.push(
        '  </section>',
      );

      return lines;
    }

    case 'text': {
      const lines =
        [
          `  <section data-site-block="text" data-block-id="${escapeAttribute(section.id)}">`,
        ];

      if (
        section.title
      ) {
        lines.push(
          `    <h2>${escapeHtml(section.title)}</h2>`,
        );
      }

      lines.push(
        `    <p>${escapeHtml(section.body)}</p>`,
        '  </section>',
      );

      return lines;
    }

    case 'navigation': {
      const lines =
        [
          `  <section data-site-block="navigation" data-block-id="${escapeAttribute(section.id)}">`,
        ];

      if (
        section.title
      ) {
        lines.push(
          `    <h2>${escapeHtml(section.title)}</h2>`,
        );
      }

      lines.push(
        '    <nav aria-label="Site navigation">',
      );

      for (
        const item
        of navigation
      ) {
        lines.push(
          `      <a data-nav-id="${escapeAttribute(item.id)}" href="${escapeAttribute(item.href)}">${escapeHtml(item.label)}</a>`,
        );
      }

      lines.push(
        '    </nav>',
        '  </section>',
      );

      return lines;
    }

    case 'content_query':
      return [
        `  <section data-site-block="content_query" data-block-id="${escapeAttribute(section.id)}" data-content-kinds="${escapeAttribute(section.kinds.join(','))}" data-content-limit="${section.limit}" data-content-order="${escapeAttribute(section.order)}"${section.tag ? ` data-content-tag="${escapeAttribute(section.tag)}"` : ''}>`,
        section.title
          ? `    <h2>${escapeHtml(section.title)}</h2>`
          : '    <div data-site-query-heading="content"></div>',
        '    <div data-site-query-slot="content"></div>',
        '  </section>',
      ];

    case 'thread_list':
      return [
        `  <section data-site-block="thread_list" data-block-id="${escapeAttribute(section.id)}" data-thread-limit="${section.limit}" data-thread-order="${escapeAttribute(section.order)}"${section.category ? ` data-thread-category="${escapeAttribute(section.category)}"` : ''}>`,
        section.title
          ? `    <h2>${escapeHtml(section.title)}</h2>`
          : '    <div data-site-query-heading="threads"></div>',
        '    <div data-site-thread-slot="list"></div>',
        '  </section>',
      ];

    case 'thread_detail':
      return [
        `  <section data-site-block="thread_detail" data-block-id="${escapeAttribute(section.id)}" data-thread-binding="route.thread">`,
        section.title
          ? `    <h2>${escapeHtml(section.title)}</h2>`
          : '    <div data-site-query-heading="thread"></div>',
        '    <div data-site-thread-slot="detail"></div>',
        '  </section>',
      ];

    case 'asset_reference': {
      const parsed =
        parseTypedCrabAssetUrl(
          section.crabUrl,
        );

      const tag =
        CRAB_ASSET_TAGS[
          parsed.kind
        ];

      const lines =
        [
          `  <section data-site-block="asset_reference" data-block-id="${escapeAttribute(section.id)}">`,
        ];

      if (
        section.title
      ) {
        lines.push(
          `    <h2>${escapeHtml(section.title)}</h2>`,
        );
      }

      lines.push(
        `    <${tag} src="${escapeAttribute(section.crabUrl)}"></${tag}>`,
      );

      if (
        section.caption
      ) {
        lines.push(
          `    <p>${escapeHtml(section.caption)}</p>`,
        );
      }

      lines.push(
        '  </section>',
      );

      return lines;
    }

    case 'divider':
      return [
        `  <hr data-site-block="divider" data-block-id="${escapeAttribute(section.id)}">`,
      ];

    default:
      fail(
        'Renderer received an unsupported block type.',
        'unsupported_render_block',
        section.type,
      );
  }
}

function normalizeTypedCrabAssetUrl(
  input,
  field,
) {
  const value =
    boundedText(
      input,
      160,
      field,
      {
        required:
          true,
      },
    );

  const parsed =
    parseTypedCrabAssetUrl(
      value,
    );

  if (
    parsed ===
    null
  ) {
    fail(
      'Asset reference must be a reviewed typed crab:// B3 reference.',
      'invalid_asset_reference',
      field,
    );
  }

  return value;
}

function parseTypedCrabAssetUrl(
  input,
) {
  const value =
    String(
      input ??
      '',
    )
      .trim()
      .toLowerCase();

  const match =
    /^crab:\/\/([a-f0-9]{64})\.(image|post|comment|article)$/.exec(
      value,
    );

  if (
    match ===
    null
  ) {
    return null;
  }

  return {
    hash:
      match[1],

    kind:
      match[2],
  };
}

function normalizeInternalHref(
  input,
  field,
) {
  const value =
    boundedText(
      input,
      256,
      field,
      {
        required:
          true,
      },
    );

  if (
    value.startsWith(
      '/',
    ) &&
    value.startsWith(
      '//',
    ) ===
      false
  ) {
    return value;
  }

  if (
    /^crab:\/\/[a-zA-Z0-9@._:/-]+$/.test(
      value,
    )
  ) {
    return value;
  }

  fail(
    'Navigation href must remain local or crab://.',
    'invalid_navigation_href',
    field,
  );
}

function normalizeOptionalB3Cid(
  input,
  field,
) {
  if (
    input == null ||
    String(
      input,
    ).trim() ===
      ''
  ) {
    return null;
  }

  const value =
    String(
      input,
    ).trim();

  if (
    /^b3:[a-f0-9]{64}$/.test(
      value,
    ) ===
    false
  ) {
    fail(
      'B3 reference must use canonical b3:<64 lowercase hex> form.',
      'invalid_b3_reference',
      field,
    );
  }

  return value;
}

function normalizeOptionalSlug(
  input,
  field,
) {
  if (
    input == null ||
    String(
      input,
    ).trim() ===
      ''
  ) {
    return '';
  }

  return canonicalId(
    input,
    field,
  );
}

function canonicalId(
  input,
  field,
) {
  const value =
    String(
      input ??
      '',
    )
      .trim()
      .toLowerCase();

  if (
    /^[a-z0-9][a-z0-9_-]{0,63}$/.test(
      value,
    ) ===
    false
  ) {
    fail(
      'Site template identifier is not canonical.',
      'invalid_identifier',
      field,
    );
  }

  return value;
}

function boundedVersion(
  input,
  field,
) {
  const value =
    Number(
      input,
    );

  if (
    Number.isInteger(
      value,
    ) ===
      false ||
    value <
      1 ||
    value >
      65535
  ) {
    fail(
      'Site template version is outside the reviewed bound.',
      'invalid_version',
      field,
    );
  }

  return value;
}

function boundedText(
  input,
  maximum,
  field,
  {
    required =
      false,
  } = {},
) {
  const value =
    String(
      input ??
      '',
    ).trim();

  if (
    required &&
    value.length ===
      0
  ) {
    fail(
      'Required Site template text is missing.',
      'missing_required_text',
      field,
    );
  }

  if (
    value.length >
    maximum
  ) {
    fail(
      'Site template text exceeds its reviewed bound.',
      'text_limit_exceeded',
      field,
    );
  }

  return value;
}

function plainObject(
  input,
  field,
) {
  if (
    input &&
    typeof input ===
      'object' &&
    Array.isArray(
      input,
    ) ===
      false
  ) {
    return input;
  }

  fail(
    'Site template value must be an object.',
    'invalid_object',
    field,
  );
}

function plainObjectOrEmpty(
  input,
) {
  if (
    input &&
    typeof input ===
      'object' &&
    Array.isArray(
      input,
    ) ===
      false
  ) {
    return input;
  }

  return {};
}

function assertOnlyKeys(
  value,
  allowed,
  field,
) {
  for (
    const key
    of Object.keys(
      value,
    )
  ) {
    if (
      allowed.includes(
        key,
      ) ===
      false
    ) {
      fail(
        'Site template object contains an unreviewed field.',
        'unknown_field',
        `${field}.${key}`,
      );
    }
  }
}

function escapeHtml(
  input,
) {
  return String(
    input ??
    '',
  )
    .replace(
      /&/g,
      '&amp;',
    )
    .replace(
      /</g,
      '&lt;',
    )
    .replace(
      />/g,
      '&gt;',
    )
    .replace(
      /"/g,
      '&quot;',
    )
    .replace(
      /'/g,
      '&#39;',
    );
}

function escapeAttribute(
  input,
) {
  return escapeHtml(
    input,
  );
}

function deepFreeze(
  value,
) {
  if (
    value &&
    typeof value ===
      'object' &&
    Object.isFrozen(
      value,
    ) ===
      false
  ) {
    Object.freeze(
      value,
    );

    for (
      const child
      of Object.values(
        value,
      )
    ) {
      deepFreeze(
        child,
      );
    }
  }

  return value;
}

function fail(
  message,
  reason,
  field,
) {
  throw new SiteTemplateEngineError(
    message,
    {
      reason,
      field,
    },
  );
}

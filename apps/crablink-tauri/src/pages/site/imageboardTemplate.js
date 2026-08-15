/**
 * RO:WHAT — FINAL_BETA Imageboard structured Site-template specialization.
 * RO:WHY — Registers Imageboard on the existing Phase 12 shared renderer.
 * RO:INTERACTS — imageboardModel, siteTemplates, image_showcase structured foundation.
 * RO:INVARIANTS — one shared engine; scriptless definition; Imageboard owns no renderer authority.
 * RO:SECURITY — no raw HTML/CSS/JS, remote theme code, publication authority, wallet authority, or ledger authority.
 * RO:TEST — siteImageboardTemplateRegistration.test.mjs.
 */

import {
  IMAGEBOARD_MODEL_VERSION,
} from './imageboardModel.js';

export {
  IMAGEBOARD_MODEL_VERSION,
};

export const IMAGEBOARD_TEMPLATE_ID =
  'imageboard';

export const IMAGEBOARD_TEMPLATE_VERSION =
  1;

export function createImageboardTemplateDefinitionV1(
  foundationDefinition,
) {
  if (
    foundationDefinition === null ||
    typeof foundationDefinition !== 'object' ||
    Array.isArray(
      foundationDefinition,
    )
  ) {
    throw new TypeError(
      'Imageboard requires a structured foundation definition.',
    );
  }

  const definition =
    transformValue(
      foundationDefinition,
    );

  const serialized =
    JSON.stringify(
      definition,
    );

  if (
    serialized.includes(
      'image_showcase',
    )
  ) {
    throw new TypeError(
      'Imageboard retained the foundation template identifier.',
    );
  }

  if (
    serialized.includes(
      IMAGEBOARD_TEMPLATE_ID,
    ) === false
  ) {
    throw new TypeError(
      'Imageboard definition is missing its product identifier.',
    );
  }

  return deepFreeze(
    definition,
  );
}

function transformValue(
  value,
) {
  if (
    typeof value ===
      'string'
  ) {
    return value
      .replaceAll(
        'image_showcase',
        IMAGEBOARD_TEMPLATE_ID,
      )
      .replaceAll(
        'Image Showcase',
        'Imageboard',
      )
      .replaceAll(
        'Image showcase',
        'Imageboard',
      )
      .replaceAll(
        'image showcase',
        'imageboard',
      );
  }

  if (
    Array.isArray(
      value,
    )
  ) {
    return value.map(
      transformValue,
    );
  }

  if (
    value &&
    typeof value ===
      'object'
  ) {
    return Object.fromEntries(
      Object.entries(
        value,
      ).map(
        ([key, child]) => [
          String(
            key,
          ).replaceAll(
            'image_showcase',
            IMAGEBOARD_TEMPLATE_ID,
          ),

          transformValue(
            child,
          ),
        ],
      ),
    );
  }

  return value;
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
    ) === false
  ) {
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

    Object.freeze(
      value,
    );
  }

  return value;
}

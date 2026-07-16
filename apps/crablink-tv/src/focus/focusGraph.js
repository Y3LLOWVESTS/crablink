/**
 * Selects the closest eligible focus target in a requested TV direction.
 *
 * This module contains no DOM access so the same movement behavior can be
 * exercised with deterministic unit tests.
 */

export const TV_DIRECTIONS = Object.freeze([
  'up',
  'down',
  'left',
  'right',
]);

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeRect(rect) {
  const left = finiteNumber(rect?.left);
  const top = finiteNumber(rect?.top);

  const width = Math.max(
    0,
    finiteNumber(
      rect?.width,
      finiteNumber(rect?.right) - left,
    ),
  );

  const height = Math.max(
    0,
    finiteNumber(
      rect?.height,
      finiteNumber(rect?.bottom) - top,
    ),
  );

  return {
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    centerX: left + width / 2,
    centerY: top + height / 2,
  };
}

function movementMetrics(current, candidate, direction) {
  const deltaX = candidate.centerX - current.centerX;
  const deltaY = candidate.centerY - current.centerY;

  let primary;
  let secondary;
  let laneTolerance;

  switch (direction) {
    case 'left':
      if (deltaX >= -1) {
        return null;
      }

      primary = Math.abs(deltaX);
      secondary = Math.abs(deltaY);
      laneTolerance =
        current.height / 2 + candidate.height / 2;
      break;

    case 'right':
      if (deltaX <= 1) {
        return null;
      }

      primary = Math.abs(deltaX);
      secondary = Math.abs(deltaY);
      laneTolerance =
        current.height / 2 + candidate.height / 2;
      break;

    case 'up':
      if (deltaY >= -1) {
        return null;
      }

      primary = Math.abs(deltaY);
      secondary = Math.abs(deltaX);
      laneTolerance =
        current.width / 2 + candidate.width / 2;
      break;

    case 'down':
      if (deltaY <= 1) {
        return null;
      }

      primary = Math.abs(deltaY);
      secondary = Math.abs(deltaX);
      laneTolerance =
        current.width / 2 + candidate.width / 2;
      break;

    default:
      return null;
  }

  const lanePenalty = Math.max(
    0,
    secondary - laneTolerance,
  );

  const anglePenalty =
    secondary / Math.max(primary, 1);

  return {
    primary,
    secondary,
    score:
      primary +
      lanePenalty * 4 +
      anglePenalty * 80,
  };
}

/**
 * @param {DOMRect|object} currentRect
 * @param {Array<{id: string, rect: DOMRect|object}>} candidates
 * @param {'up'|'down'|'left'|'right'} direction
 * @returns {object|null}
 */
export function chooseNextFocus(
  currentRect,
  candidates,
  direction,
) {
  if (!TV_DIRECTIONS.includes(direction)) {
    return null;
  }

  const current = normalizeRect(currentRect);

  const ranked = candidates
    .map((candidate, index) => {
      const rect = normalizeRect(candidate.rect);
      const metrics = movementMetrics(
        current,
        rect,
        direction,
      );

      if (!metrics) {
        return null;
      }

      return {
        candidate,
        index,
        ...metrics,
      };
    })
    .filter(Boolean)
    .sort((left, right) => (
      left.score - right.score ||
      left.primary - right.primary ||
      left.secondary - right.secondary ||
      left.index - right.index
    ));

  return ranked[0]?.candidate ?? null;
}

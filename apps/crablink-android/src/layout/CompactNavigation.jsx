import {
  ANDROID_ROUTE_REGISTRY,
} from '../app/androidRouteRegistry.js';

export function CompactNavigation({
  activeRouteId,
  onNavigate,
}) {
  return (
    <nav
      className="android-nav android-nav--compact"
      aria-label="Primary"
    >
      {ANDROID_ROUTE_REGISTRY.map((route) => (
        <button
          key={route.id}
          type="button"
          className="android-nav__item"
          aria-current={
            activeRouteId === route.id
              ? 'page'
              : undefined
          }
          onClick={() => onNavigate(route.id)}
        >
          {route.compactLabel}
        </button>
      ))}
    </nav>
  );
}

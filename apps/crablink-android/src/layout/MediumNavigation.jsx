import {
  ANDROID_ROUTE_REGISTRY,
} from '../app/androidRouteRegistry.js';

export function MediumNavigation({
  activeRouteId,
  onNavigate,
}) {
  return (
    <nav
      className="android-nav android-nav--rail"
      aria-label="Primary"
    >
      <strong className="android-nav__brand">CrabLink</strong>
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
          {route.label}
        </button>
      ))}
    </nav>
  );
}

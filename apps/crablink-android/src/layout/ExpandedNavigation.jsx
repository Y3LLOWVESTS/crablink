import {
  ANDROID_ROUTE_REGISTRY,
} from '../app/androidRouteRegistry.js';

export function ExpandedNavigation({
  activeRouteId,
  onNavigate,
}) {
  return (
    <nav
      className="android-nav android-nav--expanded"
      aria-label="Primary"
    >
      <div>
        <strong className="android-nav__brand">CrabLink</strong>
        <span className="android-nav__caption">
          Android phone and tablet
        </span>
      </div>
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

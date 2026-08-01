import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

import {
  createAndroidRouteStack,
  currentAndroidRouteId,
  popAndroidRoute,
  pushAndroidRoute,
} from './androidRouteStack.js';

const AndroidAppContext = createContext(null);

export function AndroidAppProvider({ children }) {
  const [routeStack, setRouteStack] = useState(
    () => createAndroidRouteStack(),
  );

  const navigate = useCallback((routeId) => {
    setRouteStack((current) =>
      pushAndroidRoute(current, routeId),
    );
  }, []);

  const goBack = useCallback(() => {
    setRouteStack((current) =>
      popAndroidRoute(current),
    );
  }, []);

  const value = useMemo(
    () => Object.freeze({
      routeStack,
      activeRouteId:
        currentAndroidRouteId(routeStack),
      navigate,
      goBack,
      canGoBack: routeStack.length > 1,
    }),
    [routeStack, navigate, goBack],
  );

  return (
    <AndroidAppContext.Provider value={value}>
      {children}
    </AndroidAppContext.Provider>
  );
}

export function useAndroidApp() {
  const value = useContext(AndroidAppContext);

  if (!value) {
    throw new Error(
      'useAndroidApp must be used inside AndroidAppProvider.',
    );
  }

  return value;
}

import { AndroidAppProvider } from './AndroidAppContext.jsx';
import { AndroidShell } from '../layout/AndroidShell.jsx';

export function AndroidApp() {
  return (
    <AndroidAppProvider>
      <AndroidShell />
    </AndroidAppProvider>
  );
}

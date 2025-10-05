import { createRoot } from 'react-dom/client';

import RootApp from './RootApp';
import { setupAntdCSPNonce } from './utils/cspNonce';

// Initialize CSP nonce for Ant Design compatibility
setupAntdCSPNonce().then(() => {
  const root = createRoot(document.getElementById('root'));
  root.render(<RootApp />);
}).catch((error) => {
  console.warn('CSP nonce setup failed, continuing without nonce:', error);
  const root = createRoot(document.getElementById('root'));
  root.render(<RootApp />);
});

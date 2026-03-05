import { createRoot } from 'react-dom/client';
import { ToastProvider } from '../../components/ui/Toast';
import { Shell } from './Shell';

const view = new URLSearchParams(location.search).get('view');
if (view) document.body.classList.add(`view-${view}`);

const root = document.getElementById('root')!;
createRoot(root).render(
  <ToastProvider>
    <Shell />
  </ToastProvider>
);

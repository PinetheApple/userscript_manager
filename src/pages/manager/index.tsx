import { createRoot } from 'react-dom/client';
import { ToastProvider } from '../../components/ui/Toast';
import { Manager } from './Manager';

const root = document.getElementById('root')!;
createRoot(root).render(
  <ToastProvider>
    <Manager />
  </ToastProvider>
);

import { createRoot } from 'react-dom/client';
import { ToastProvider } from '../../components/ui/Toast';
import { Editor } from './Editor';

const root = document.getElementById('root')!;
createRoot(root).render(
  <ToastProvider>
    <Editor />
  </ToastProvider>
);

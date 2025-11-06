import { Routes } from '@angular/router';

export const routes: Routes = [
    {
    path: 'signals-advanced',
    loadComponent: () => import('./components/signal-advanced/signal-advanced.component')
      .then(m => m.SignalAdvancedComponent)
  },
  {
    path: 'signals-patterns',
    loadComponent: () => import('./components/signal-patterns-demo/signal-patterns-demo.component')
      .then(m => m.SignalPatternsDemoComponent)
  },
  {
    path: 'signals-internals',
    loadComponent: () => import('./components/signal-internals-demo/signal-internals-demo.component')
      .then(m => m.SignalInternalsDemoComponent)
  },
  {
    path: 'signals-deep-dive',
    loadComponent: () => import('./components/markdown-viewer/markdown-viewer.component')
      .then(m => m.MarkdownViewerComponent)
  },
  {
    path: '',
    redirectTo: '/signals-advanced',
    pathMatch: 'full'
  }
];

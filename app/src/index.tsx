// Moet de eerste import blijven: zie de uitleg in grpc/polyfills.ts.
import './grpc/polyfills.js';
import '@lynx-js/preact-devtools';
import '@lynx-js/react/debug';
import { root } from '@lynx-js/react';

import { App } from './App.js';

root.render(<App />);

if (import.meta.webpackHot) {
  import.meta.webpackHot.accept();
}

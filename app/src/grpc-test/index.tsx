import { root } from '@lynx-js/react';

import { GrpcTestPage } from './GrpcTestPage.js';

root.render(<GrpcTestPage />);

if (import.meta.webpackHot) {
  import.meta.webpackHot.accept();
}

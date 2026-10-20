import { pluginLynxConfig } from '@lynx-js/config-rsbuild-plugin';
import { pluginQRCode } from '@lynx-js/qrcode-rsbuild-plugin';
import { pluginReactLynx } from '@lynx-js/react-rsbuild-plugin';
import { defineConfig } from '@lynx-js/rspeedy';
import { pluginTypeCheck } from '@rsbuild/plugin-type-check';

export default defineConfig({
  source: {
    entry: {
      main: './src/index.tsx',
      // Testpagina om de verbinding met de gRPC-server te controleren, los van de app.
      'grpc-test': './src/grpc-test/index.tsx',
    },
  },
  plugins: [
    pluginQRCode({
      schema(url) {
        // We use `?fullscreen=true` to open the page in LynxExplorer in full screen mode
        return `${url}?fullscreen=true`;
      },
    }),
    pluginReactLynx(),
    pluginTypeCheck(),
    // Nodig voor live data (WatchRoom): fetch leest het antwoord dan stuk per stuk. Experimenteel in Lynx.
    pluginLynxConfig({ enableFetchAPIStandardStreaming: true }),
  ],
});

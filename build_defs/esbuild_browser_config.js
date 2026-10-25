import dedupePlugin from './esbuild_dedupe_plugin.js';
import postCssPlugin from './index.js';
import * as postCssConfig from './postcss.config.mjs';

export default {
  jsxFactory: 'corgi.createVirtualElement',
  jsxFragment: 'corgi.Fragment',
  plugins: [
    dedupePlugin(),
    postCssPlugin(postCssConfig),
  ],
};

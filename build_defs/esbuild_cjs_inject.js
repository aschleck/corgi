// Workaround for https://github.com/evanw/esbuild/issues/1921#issuecomment-1898197331
// ESM modules that import CJS modules that import node modules fail.

import {createRequire} from 'node:module';
import path from 'node:path';
import url from 'node:url';

globalThis.require = createRequire(import.meta.url);
globalThis.__filename = url.fileURLToPath(import.meta.url);
globalThis.__dirname = path.dirname(__filename);

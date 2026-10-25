import {existsSync, readFileSync} from 'node:fs';
import path from 'node:path';

// A dependency imported by both the main workspace and an external repo like corgi resolves to two
// copies, one in each repo's node_modules, and esbuild bundles both. We resolve bare imports from
// external repos against the main workspace's node_modules instead, but only when the two copies
// have the same version, or else the external repo would run against code it wasn't built for.
export default function dedupePlugin() {
  return {
    name: 'corgi-dedupe',
    setup(build) {
      // The launcher runs esbuild from the bin directory, so this is the main workspace's root.
      const root = process.cwd();

      build.onResolve({filter: /^[^./]/}, async (args) => {
        if (args.pluginData?.corgiDedupe) {
          return;
        }

        const importer = path.relative(root, args.importer).split(path.sep);
        if (importer[0] !== 'external' || importer.includes('node_modules')) {
          return;
        }

        const options = {
          importer: args.importer,
          kind: args.kind,
          namespace: args.namespace,
          pluginData: {...args.pluginData, corgiDedupe: true},
          resolveDir: args.resolveDir,
        };
        const theirs = await build.resolve(args.path, options);
        if (theirs.errors.length > 0 || theirs.external) {
          return theirs;
        }
        const ours = await build.resolve(args.path, {...options, resolveDir: root});
        if (ours.errors.length > 0 || ours.path === theirs.path) {
          return theirs;
        }

        const name = getPackageName(args.path);
        const theirVersion = getPackageVersion(theirs.path, name);
        const ourVersion = getPackageVersion(ours.path, name);
        if (theirVersion !== ourVersion) {
          return {
            errors: [{
              text:
                  `${importer[1]} depends on ${name}@${theirVersion} but the main workspace has `
                      + `${name}@${ourVersion}, so the bundle would contain both. Make the `
                      + `versions match.`,
            }],
          };
        }
        return ours;
      });
    },
  };
}

function getPackageName(specifier) {
  const parts = specifier.split('/');
  return specifier.startsWith('@') ? `${parts[0]}/${parts[1]}` : parts[0];
}

function getPackageVersion(file, name) {
  // Packages like @bufbuild/protobuf put nameless package.json files in subdirectories to set the
  // module type, so we walk up until we find the one that names the package.
  for (let dir = path.dirname(file); dir !== path.dirname(dir); dir = path.dirname(dir)) {
    const manifest = path.join(dir, 'package.json');
    if (!existsSync(manifest)) {
      continue;
    }
    const json = JSON.parse(readFileSync(manifest, 'utf8'));
    if (json.name === name) {
      return json.version;
    }
  }
  throw new Error(`Unable to find the package.json for ${name} above ${file}`);
}

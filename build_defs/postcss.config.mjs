import path from 'node:path';
import {compile} from '@tailwindcss/node';
import {Scanner} from '@tailwindcss/oxide'
import {Features as LightningCssFeatures, transform} from 'lightningcss';
import postcss from 'postcss';

export const plugins = [
  Object.assign(tailwindcss, {postcss: true}),
];

// We have our own tailwindcss plugin for unclear reasons. Theoretically Bazel copies everything
// needed into the bin dir, so Tailwind scanning **/* should work, and yet it doesn't. Anyway maybe
// passing in FILES_TO_SEARCH makes it faster in some weird way. Whatever.
function tailwindcss() {
  const files = [
    {FILES_TO_SEARCH}
  ].map(f => path.join(process.cwd(), f));

  return {
    postcssPlugin: 'corgi-tailwindcss',
    plugins: [
      fixRelativePathsPlugin(),
      {
        postcssPlugin: 'tailwindcss',
        async Once(root, {result}) {
          if (hasNoTailwind(root)) {
            return;
          }

          const scanner = new Scanner({
            sources: files.map(f => ({
              base: path.dirname(f),
              pattern: path.basename(f),
            })),
          });

          const addDependency = (file) => {
            result.messages.push({
              type: 'dependency',
              plugin: 'corgi-tailwindcss',
              file: path.resolve(file),
              parent: result.opts.from,
            });
          };

          for (const file of scanner.files) {
            addDependency(file);
          }

          const options = {
            base: path.dirname(path.resolve(result.opts.from ?? '')),
            onDependency: addDependency,
          };

          const candidates = scanner.scan();
          const ast =
            postcss.parse(
              optimizeCss(
                (await compile(root.toString(), options)).build(candidates),
                result.opts));
          root.removeAll();
          root.append(ast);
        },
      },
    ],
  };
}

// Code below is excerpted from tailwindcss to make v4 work with our setup. Original source:
// https://github.com/tailwindlabs/tailwindcss/blob/541c3d2331eb1aff1f053083b5d5b101586c4bfa
//
// MIT License
//
// Copyright (c) Tailwind Labs, Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

function hasNoTailwind(root) {
  let canBail = true;
  root.walkAtRules((node) => {
    if (
      node.name === 'import' ||
      node.name === 'reference' ||
      node.name === 'theme' ||
      node.name === 'variant' ||
      node.name === 'config' ||
      node.name === 'plugin' ||
      node.name === 'apply'
    ) {
      canBail = false;
      return false;
    }
  });
  return canBail;
}

const SINGLE_QUOTE = "'"
const DOUBLE_QUOTE = '"'

function fixRelativePathsPlugin() {
  // Retain a list of touched at-rules to avoid infinite loops
  let touched = new WeakSet()

  function fixRelativePath(atRule) {
    let rootPath = atRule.root().source?.input.file
    if (!rootPath) {
      return
    }

    let inputFilePath = atRule.source?.input.file
    if (!inputFilePath) {
      return
    }

    if (touched.has(atRule)) {
      return
    }

    let value = atRule.params[0]

    let quote =
      value[0] === DOUBLE_QUOTE && value[value.length - 1] === DOUBLE_QUOTE
        ? DOUBLE_QUOTE
        : value[0] === SINGLE_QUOTE && value[value.length - 1] === SINGLE_QUOTE
          ? SINGLE_QUOTE
          : null
    if (!quote) {
      return
    }
    let glob = atRule.params.slice(1, -1)

    // Handle eventual negative rules. We only support one level of negation.
    let negativePrefix = ''
    if (glob.startsWith('!')) {
      glob = glob.slice(1)
      negativePrefix = '!'
    }

    // We only want to rewrite relative paths.
    if (!glob.startsWith('./') && !glob.startsWith('../')) {
      return
    }

    let absoluteGlob = path.posix.join(normalizePath(path.dirname(inputFilePath)), glob)
    let absoluteRootPosixPath = path.posix.dirname(normalizePath(rootPath))

    let relative = path.posix.relative(absoluteRootPosixPath, absoluteGlob)

    // If the path points to a file in the same directory, `path.relative` will
    // remove the leading `./` and we need to add it back in order to still
    // consider the path relative
    if (!relative.startsWith('.')) {
      relative = './' + relative
    }

    atRule.params = quote + negativePrefix + relative + quote
    touched.add(atRule)
  }

  return {
    postcssPlugin: 'tailwindcss-postcss-fix-relative-paths',
    Once(root) {
      root.walkAtRules(/source|plugin|config/, fixRelativePath)
    },
  }
}

function optimizeCss(
  input,
  { file = 'input.css', minify = false },
) {
  function optimize(code) {
    return transform({
      filename: file,
      code,
      minify,
      sourceMap: false,
      drafts: {
        customMedia: true,
      },
      nonStandard: {
        deepSelectorCombinator: true,
      },
      include: LightningCssFeatures.Nesting,
      exclude:
        LightningCssFeatures.LogicalProperties |
        LightningCssFeatures.DirSelector |
        LightningCssFeatures.LightDark,
      targets: {
        safari: (16 << 16) | (4 << 8),
        ios_saf: (16 << 16) | (4 << 8),
        firefox: 128 << 16,
        chrome: 111 << 16,
      },
      errorRecovery: true,
    }).code
  }

  // Running Lightning CSS twice to ensure that adjacent rules are merged after
  // nesting is applied. This creates a more optimized output.
  return optimize(optimize(Buffer.from(input))).toString()
}

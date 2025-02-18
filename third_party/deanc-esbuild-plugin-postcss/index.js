import * as fs from "node:fs/promises";
import * as path from "node:path";
import postcss from "postcss";

const TMP_NAME = "postcss_temp";

export default (options = { plugins: [] }) => ({
  name: "postcss",
  setup: function (build) {
    build.onResolve(
      { filter: /.\.(css)$/, namespace: "file" },
      async (args) => {
        const sourceExt = path.extname(args.path);
        const sourceBaseName = path.basename(args.path, sourceExt);
        const sourceDir = path.dirname(args.path);

        // We take files from their source, run postcss over them, and then put them in TMP_NAME.
        // When those files then import other files, the resolveDir includes TMP_NAME, so we need
        // to remove it.
        let resolveDir;
        if (args.resolveDir.endsWith(`/${TMP_NAME}`)) {
          resolveDir = path.resolve(args.resolveDir, '../')
        } else {
          resolveDir = args.resolveDir;
        }
        const tmpDir = path.resolve(process.cwd(), TMP_NAME, sourceDir);
        const tmpFilePath = path.resolve(tmpDir, `${sourceBaseName}.css`);

        // Make tmpDir, if it doesn't already exist
        try {
          await fs.mkdir(tmpDir, {recursive: true});
        } catch {
          // It exists so that's fine
        }

        let errors = [];
        for (const guess of [
          path.resolve(resolveDir, args.path),
          path.resolve(process.cwd(), "node_modules", args.path),
        ]) {
          try {
            await run(guess, tmpFilePath, options);
            errors.length = 0;
            break;
          } catch (e) {
            errors.push(e);
          }
        }

        if (errors.length > 0) {
          throw errors[0];
        }

        return {
          path: tmpFilePath,
        };
      }
    );
  },
});

async function run(from, to, options) {
  const css = await fs.readFile(from);
  const result = await postcss(options.plugins).process(css, {
    from,
    to,
  });
  await fs.writeFile(to, result.css);
}

# corgi

This is a copy from https://github.com/aschleck/trailcatalog but of only the BSD licensed code.
In the future maybe I should make this the source of truth. It also had all absolute paths made
relative.

Please note that this is a super broken Bazel module. I do have other projects depending on it but
you should *not* expect this to Just Work™.

If you do want it to work, it's some combo of

(in `.bazelrc`)

```
common --experimental_isolated_extension_usages
```

(in `aspect_rules_ts.patch`)

```
diff -Naur ts/private/ts_lib.bzl ts/private/ts_lib.bzl
--- ts/private/ts_lib.bzl
+++ ts/private/ts_lib.bzl
@@ -167,7 +167,7 @@ def _join(*elements):
 def _relative_to_package(path, ctx):
     # TODO: "external/" should only be needed to be removed once
     path = path.removeprefix("external/").removeprefix(ctx.bin_dir.path + "/")
-    path = path.removeprefix("external/").removeprefix(ctx.label.workspace_name + "/")
+    path = path.removeprefix("../").removeprefix("external/").removeprefix(ctx.label.workspace_name + "/")
     if ctx.label.package:
         path = path.removeprefix("external/").removeprefix(ctx.label.package + "/")
     return path
```

+

(in `MODULE.bzl`)

```
archive_override(
    module_name = "aspect_rules_ts",
    integrity = "sha256-x38N+njEB4k4BkkSI8EmTCiQdP7vv3BnIXQ6NVb6fOo=",
    patches = ["aspect_rules_ts.patch"],
    strip_prefix = "rules_ts-2.2.0",
    urls = "https://github.com/aspect-build/rules_ts/archive/refs/tags/v2.2.0.tar.gz",
)
```

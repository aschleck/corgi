load("@aspect_bazel_lib//lib:copy_file.bzl", "copy_file")
load("@aspect_rules_esbuild//esbuild:defs.bzl", "esbuild")
load("@aspect_rules_jest//jest:defs.bzl", "jest_test")
load("@aspect_rules_js//js:defs.bzl", "js_library")
load("@aspect_rules_js//js:providers.bzl", "JsInfo")
load("@aspect_rules_ts//ts:defs.bzl", _ts_project = "ts_project")

def esbuild_binary(
            name,
            entry_point = None,
            css_deps = None,
            deps = None,
            platform = "browser",
            minify = True,
        ):
    has_css = len(native.glob(["*.css"], allow_empty=True)) > 0
    esbuild(
        name = name,
        # Some problem with the bazel-sandbox plugin not finding app.css
        bazel_sandbox_plugin = False,
        config = ":" + name + (
            "/esbuild_browser_config.js" if platform == "browser" else "/esbuild_node_config.js"
        ),
        entry_point = entry_point,
        tsconfig = "//:tsconfig",
        srcs = [
            entry_point,
        ],
        define = {
            "process.env.CORGI_FOR_BROWSER": "true" if platform == "browser" else "false",
        },
        deps = (css_deps or []) + (deps or []) + [
            ":" + name + "_esbuild_config",
            "@dev_april_corgi//third_party/deanc-esbuild-plugin-postcss",
        ],
        format = "esm",
        minify = minify,
        output_css = "%s.css" % name if has_css else None,
        platform = platform,
        sources_content = True,
        target = "es2022",
    )

    js_library(
        name = name + "_esbuild_config",
        srcs = [
            ":" + name + "_esbuild_config_copy",
            ":" + name + "_postcss_config",
        ],
        deps = [
            "//:node_modules/@tailwindcss/node",
            "//:node_modules/@tailwindcss/oxide",
            "//:node_modules/lightningcss",
            "//:node_modules/postcss",
            "@dev_april_corgi//third_party/deanc-esbuild-plugin-postcss",
        ],
    )

    _expand_tailwind_config(
        name = name + "_postcss_config",
        deps = deps,
        output = name + "/postcss.config.mjs",
        template = "@dev_april_corgi//build_defs:postcss.config.mjs",
    )

    native.genrule(
        name = name + "_esbuild_config_copy",
        srcs = [
            "@dev_april_corgi//build_defs:esbuild_browser_config.js",
            "@dev_april_corgi//build_defs:esbuild_node_config.js",
            "@dev_april_corgi//build_defs:esbuild_cjs_inject.js",
            "@dev_april_corgi//third_party/deanc-esbuild-plugin-postcss:index.js",
        ],
        outs = [
            name + "/esbuild_browser_config.js",
            name + "/esbuild_cjs_inject.js",
            name + "/esbuild_node_config.js",
            name + "/index.js",
        ],
        cmd = "\n".join([
            "mkdir -p \"$(@D)/" + name + "\"",
            "for i in $(SRCS); do",
            "  cp \"$${i}\" \"$(@D)/" + name + "/$$(basename \"$${i}\")\"",
            "done",
        ]),
    )

def c_ts_project(
            name,
            srcs = None,
            css_deps = None,
            data = None,
            deps = None,
            test_deps = None,
            testonly = None,
        ):
    srcs = srcs or native.glob(
        ["*.ts", "*.tsx"],
        allow_empty=True,
        exclude = ["*.test.ts", "*.test.tsx"]
    )

    ts_project(
        name = name,
        srcs = srcs,
        data = data,
        deps = deps,
        testonly = testonly,
    )

    if len(native.glob(["*.css"], allow_empty=True)):
        js_library(
            name = "css",
            srcs = native.glob(["*.css"]),
            deps = css_deps or [],
            testonly = testonly,
        )
    else:
        js_library(
            name = "css",
            deps = css_deps or [],
            testonly = testonly,
        )

    if len(native.glob(["*.test.ts", "*.test.tsx"], allow_empty=True)):
        ts_project(
            name = "tests",
            srcs = native.glob(["*.test.ts", "*.test.tsx"], allow_empty=True),
            testonly = True,
            deps = (test_deps or []) + [
                ":%s" % name,
                "//:node_modules/@types/jest",
                "//:node_modules/jest-environment-jsdom",
            ],
        )

        jest_test(
            name = "jest",
            config = "@dev_april_corgi//build_defs:jest_config",
            node_modules = "//:node_modules",
            node_options = ["--experimental-vm-modules"],
            data = [
                ":tests",
                "//:tsconfig",
            ],
        )

def ts_project(name, srcs, deps = None, **kwargs):
    _ts_project(
        name = name,
        assets = srcs + [
            "//:package_json",
        ],
        allow_js = True,
        composite = True,
        deps = deps or [],
        srcs = srcs,
        transpiler = "tsc",
        tsconfig = "//:tsconfig",
        **kwargs
    )

def _expand_tailwind_config_impl(ctx):
    sources = []
    for dep in ctx.attr.deps:
        # Note that npm deps end up in npm_sources, not transitive_sources
        for source in dep[JsInfo].transitive_sources.to_list():
            if source.extension not in ["js", "jsx", "ts", "tsx"]:
                continue
            sources.append(source)
    deduped = depset(sources).to_list()

    return ctx.actions.expand_template(
        output = ctx.outputs.output,
        substitutions = {
            "{FILES_TO_SEARCH}": ",".join([
                "'" + f.path[len(ctx.bin_dir.path) + 1:] + "'" for f in deduped
            ]),
        },
        template = ctx.file.template,
    )

_expand_tailwind_config = rule(
    implementation = _expand_tailwind_config_impl,
    attrs = dict({
        "deps": attr.label_list(providers = [JsInfo], mandatory = True),
        "template": attr.label(allow_single_file = True, mandatory = True),
        "output": attr.output(mandatory = True),
    }),
)

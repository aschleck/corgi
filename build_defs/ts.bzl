load("@aspect_bazel_lib//lib:copy_file.bzl", "copy_file")
load("@aspect_bazel_lib//lib:directory_path.bzl", "directory_path")
load("@aspect_rules_esbuild//esbuild:defs.bzl", "esbuild")
load("@aspect_rules_jest//jest:defs.bzl", "jest_test")
load("@aspect_rules_js//js:defs.bzl", "js_library")
load("@aspect_rules_js//js:providers.bzl", "JsInfo", "js_info")
load("@aspect_rules_ts//ts:defs.bzl", _ts_project = "ts_project")

# Bundles each of entry_points into the name/ directory. entry_points maps each entry's label to the
# name of its output file without the extension, and entry_point is shorthand for
# `entry_points = {entry_point: name}`. Code shared between entries goes into chunk files next to
# them, so a page and its workers download common dependencies once. name_entry points at
# name/name.js for a js_binary's entry_point.
def esbuild_binary(
            name,
            entry_point = None,
            entry_points = None,
            deps = None,
            platform = "browser",
            minify = True,
            **kwargs,
        ):
    if bool(entry_point) == bool(entry_points):
        fail("Exactly one of entry_point or entry_points must be set")
    if entry_point:
        entry_points = {entry_point: name}

    config_dir = name + "_esbuild"
    _entry_points(
        name = name + "_entry_points",
        entry_points = entry_points,
        deps = deps,
    )
    native.filegroup(
        name = name + "_entry_points_args",
        srcs = [":" + name + "_entry_points"],
        output_group = "args",
    )

    esbuild(
        name = name,
        args_file = ":" + name + "_entry_points_args",
        config = ":" + config_dir + (
            "/esbuild_browser_config.js" if platform == "browser" else "/esbuild_node_config.js"
        ),
        entry_points = [":" + name + "_entry_points"],
        tsconfig = "//:tsconfig",
        define = {
            "process.env.CORGI_FOR_BROWSER": "true" if platform == "browser" else "false",
        },
        deps = (deps or []) + [
            ":" + name + "_esbuild_config",
            "@dev_april_corgi//third_party/deanc-esbuild-plugin-postcss",
        ],
        format = "esm",
        minify = minify,
        output_dir = True,
        platform = platform,
        sources_content = True,
        splitting = True,
        target = "es2022",
        **kwargs,
    )

    directory_path(
        name = name + "_entry",
        directory = ":" + name,
        path = name + ".js",
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
            "//:node_modules/@tailwindcss/oxide-darwin-arm64",
            "//:node_modules/@tailwindcss/oxide-linux-x64-gnu",
            "//:node_modules/lightningcss",
            "//:node_modules/lightningcss-darwin-arm64",
            "//:node_modules/lightningcss-linux-x64-gnu",
            "//:node_modules/postcss",
            "//:node_modules/supports-color",
            "@dev_april_corgi//third_party/deanc-esbuild-plugin-postcss",
        ],
    )

    _expand_tailwind_config(
        name = name + "_postcss_config",
        deps = deps,
        output = config_dir + "/postcss.config.mjs",
        template = "@dev_april_corgi//build_defs:postcss.config.mjs",
    )

    native.genrule(
        name = name + "_esbuild_config_copy",
        srcs = [
            "@dev_april_corgi//build_defs:esbuild_browser_config.js",
            "@dev_april_corgi//build_defs:esbuild_node_config.js",
            "@dev_april_corgi//build_defs:esbuild_cjs_inject.js",
            "@dev_april_corgi//build_defs:esbuild_dedupe_plugin.js",
            "@dev_april_corgi//third_party/deanc-esbuild-plugin-postcss:index.js",
        ],
        outs = [
            config_dir + "/esbuild_browser_config.js",
            config_dir + "/esbuild_cjs_inject.js",
            config_dir + "/esbuild_dedupe_plugin.js",
            config_dir + "/esbuild_node_config.js",
            config_dir + "/index.js",
        ],
        cmd = "\n".join([
            "mkdir -p \"$(@D)/" + config_dir + "\"",
            "for i in $(SRCS); do",
            "  cp \"$${i}\" \"$(@D)/" + config_dir + "/$$(basename \"$${i}\")\"",
            "done",
        ]),
    )

def c_ts_project(
            name,
            srcs = None,
            css_deps = None,
            data = None,
            deps = None,
            snapshots = None,
            tags = [],
            target_compatible_with = None,
            test_data = None,
            test_deps = None,
            test_env = None,
            test_size = None,
            test_srcs = None,
            test_timeout = None,
            testonly = False,
            visibility = None,
        ):
    srcs = srcs or native.glob(
        ["*.ts", "*.tsx"],
        allow_empty=True,
        exclude = test_srcs or ["*.test.ts", "*.test.tsx"]
    )
    has_css = len(native.glob(["*.css"], allow_empty=True)) > 0

    ts_project(
        name = name,
        srcs = srcs,
        data = data,
        deps = (deps or []) + (["@dev_april_corgi//build_defs:css_types"] if has_css else []),
        tags = tags,
        target_compatible_with = target_compatible_with,
        testonly = testonly,
        visibility = visibility,
    )

    _collect_data(
        name = name + "_data",
        tags = tags,
        target_compatible_with = target_compatible_with,
        testonly = testonly,
        ts_project = ":" + name,
        visibility = visibility,
    )

    if has_css:
        js_library(
            name = "css",
            srcs = native.glob(["*.css"]),
            deps = (css_deps or []) + [
                "//:node_modules/tailwindcss",
            ],
            tags = tags,
            target_compatible_with = target_compatible_with,
            testonly = testonly,
            visibility = visibility,
        )
    else:
        js_library(
            name = "css",
            deps = css_deps or [],
            tags = tags,
            target_compatible_with = target_compatible_with,
            testonly = testonly,
            visibility = visibility,
        )

    if len(test_srcs or native.glob(["*.test.ts", "*.test.tsx"], allow_empty=True)):
        ts_project(
            name = "tests",
            srcs = test_srcs or native.glob(["*.test.ts", "*.test.tsx"], allow_empty=True),
            tags = tags,
            target_compatible_with = target_compatible_with,
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
            env = test_env,
            node_modules = "//:node_modules",
            node_options = ["--experimental-vm-modules"],
            size = test_size,
            snapshots = snapshots or native.glob(["__snapshots__/*.snap"], allow_empty=True),
            tags = tags,
            target_compatible_with = target_compatible_with,
            timeout = test_timeout,
            data = (test_data or []) + [
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

def _collect_data_impl(ctx):
    ts_target = ctx.attr.ts_project
    data_files = [
        f
        for f in ts_target[DefaultInfo].default_runfiles.files.to_list()
        if "/node_modules/" not in f.path
            and f.extension not in ["js", "json", "jsx", "ts", "tsx"]
    ]
    return js_info(target = ts_target.label, transitive_sources = depset(data_files))

_collect_data = rule(
    implementation = _collect_data_impl,
    attrs = {
        "ts_project": attr.label(mandatory = True),
    },
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

def _entry_points_impl(ctx):
    # esbuild needs the copies of the entries in the bin directory or it can't find their imports.
    # The ts_projects in deps already made those copies, so we look them up rather than copying
    # entries from other packages, which copy_to_bin refuses to do.
    bin_files = {}
    for dep in ctx.attr.deps:
        for f in dep[JsInfo].transitive_sources.to_list():
            if not f.is_source:
                bin_files[f.short_path] = f

    entries = []
    names = {}
    for target, out in ctx.attr.entry_points.items():
        for src in target.files.to_list():
            entry = bin_files.get(src.short_path)
            if not entry:
                fail("%s isn't in the sources of any dep" % src.short_path)
            entries.append(entry)
            names[out] = entry.path[len(ctx.bin_dir.path) + 1:]

    # The launcher merges this over the arguments the esbuild rule computes, so this replaces its
    # list of entry points with a map that names each output.
    args = ctx.actions.declare_file(ctx.label.name + "_args.json")
    ctx.actions.write(args, json.encode({"entryPoints": names}))

    return [
        DefaultInfo(files = depset(entries)),
        OutputGroupInfo(args = depset([args])),
    ]

_entry_points = rule(
    implementation = _entry_points_impl,
    attrs = {
        "deps": attr.label_list(providers = [JsInfo]),
        "entry_points": attr.label_keyed_string_dict(allow_files = True, mandatory = True),
    },
)

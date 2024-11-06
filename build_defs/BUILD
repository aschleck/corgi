package(default_visibility = ["//visibility:public"])

load("@aspect_rules_js//js:defs.bzl", "js_library")

exports_files([
    "esbuild_browser_config.js",
    "esbuild_node_config.js",
    "esbuild_cjs_inject.js",
    "postcss.config.mjs",
    "tailwind.config.mjs",
])

js_library(
    name = "jest_config",
    srcs = [
        "jest.config.js",
    ],
    deps = [
      "//:package_json",
    ],
)


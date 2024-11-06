package(default_visibility = ["//visibility:public"])

load("@aspect_rules_js//js:defs.bzl", "js_library")
load("@aspect_rules_ts//ts:defs.bzl", "ts_config")
load("@npm//:defs.bzl", "npm_link_all_packages")

exports_files(["jest.config.js", "tsconfig.json"])

js_library(
    name = "package_json",
    srcs = ["package.json"],
)

ts_config(
    name = "tsconfig",
    src = "tsconfig.json",
)

npm_link_all_packages(name = "node_modules")


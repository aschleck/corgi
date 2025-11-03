package(default_visibility = ["//visibility:public"])

load("//build_defs:ts.bzl", "c_ts_project", "ts_project")

c_ts_project(
    name = "corgi",
    srcs = glob(["*.ts", "*.tsx"], exclude = ["testing.ts", "*.test.ts", "*.test.tsx"]),
    deps = [
        "//js/common",
    ],
)

ts_project(
    name = "testing",
    srcs = ["testing.ts"],
    testonly = True,
    deps = [
        ":corgi",
    ],
)

package(default_visibility = ["//visibility:public"])

load("//build_defs:ts.bzl", "c_ts_project", "ts_project")

CLIENT_FILES = [
    "data.ts",
    "ssr_aware.ts",
]

c_ts_project(
    name = "server",
    srcs = glob(
        ["*.ts"],
        exclude = CLIENT_FILES,
    ),
    deps = [
        ":client",
        "//:node_modules/@fastify/request-context",
        "//:node_modules/@types/node",
        "//:node_modules/fastify",
        "//js/common",
        "//js/corgi",
    ],
)

ts_project(
    name = "client",
    srcs = CLIENT_FILES,
    deps = [
        "//js/common",
        "//js/corgi",
        "//js/corgi/history",
    ],
)

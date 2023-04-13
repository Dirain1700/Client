"use strict";

import * as path from "node:path";

import { build, buildSync } from "esbuild";
import { aliasPath } from "esbuild-plugin-alias-path";
import { globSync } from "glob";
import { cloneDeep } from "lodash";

const targetFiles = globSync(["src/**/*.ts", "data/**/*.ts", "config/**/*.ts"]);
const targetTestFiles = globSync(["test/**/*.ts"]);

const config = {
    allowOverwrite: true,
    entryPoints: targetFiles,
    platform: "node",
    target: "esnext",
    sourcemap: true,
    sourcesContent: false,
    write: true,
};

console.log("Transpiling to CommonJS...");

// @ts-expect-error format should be assignable
// prettier-ignore
buildSync(Object.assign(cloneDeep(config), {
    format: "cjs",
    outdir: "dist/cjs",
    tsconfig: path.resolve(__dirname, "tsconfig.cjs.json"),
}));

console.log("Transpiling to ES Module...");

// @ts-expect-error format should be assignable
// prettier-ignore
buildSync(Object.assign(cloneDeep(config), {
    format: "esm",
    outExtension: { ".js": ".mjs" },
    outdir: "dist/esm",
    tsconfig: path.resolve(__dirname, "tsconfig.esm.json"),
}));

console.log("Transpiling test modules...");

// @ts-expect-error format should be assignable
// prettier-ignore
build(Object.assign(cloneDeep(config), {
    bundle: true,
    entryPoints: targetTestFiles,
    format: "cjs",
    minify: true,
    outdir: "dist/test",
    tsconfig: path.resolve(__dirname, "tsconfig.test.json"),
    plugins: [
        aliasPath({
            alias: { "@dist/*": path.resolve(__dirname, "./dist") },
        }),
    ],
})).then(() => console.log("Sucessfully built files!"));

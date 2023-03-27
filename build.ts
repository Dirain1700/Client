"use strict";

import { readdirSync } from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

import { buildSync } from "esbuild";

const targetDir = "./src";
const targetFiles = readdirSync(targetDir).map((p) => targetDir + "/" + p);

const config = {
    allowOverwrite: true,
    entryPoints: targetFiles,
    platform: "node",
    target: "esnext",
    sourcemap: true,
    sourcesContent: false,
    write: true,
};

console.log("Running CommonJS esbuild...");

// @ts-expect-error format should be assignable
// prettier-ignore
buildSync(Object.assign({
    format: "cjs",
    outdir: "dist/cjs",
    tsconfig: path.resolve(__dirname, "tsconfig.cjs.json"),
}, config));

console.log("Running ES Module esbuild...");

// @ts-expect-error format should be assignable
// prettier-ignore
buildSync(Object.assign({
    format: "esm",
    outExtension: { ".js": ".mjs" },
    outdir: "dist/esm",
    tsconfig: path.resolve(__dirname, "tsconfig.esm.json"),
}, config));

console.log("Sucessfully built files!");

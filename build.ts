"use strict";

import * as fs from "node:fs";
import * as path from "node:path";

import { buildSync } from "esbuild";
import { globSync } from "glob";
import { cloneDeep } from "lodash";

const outputDir = path.resolve(__dirname, "dist");
const builder = __filename.replace(/\.js$/, ".ts");

const config = {
    allowOverwrite: true,
    platform: "node",
    target: "esnext",
    sourcemap: true,
    sourcesContent: false,
    write: true,
};

fs.rmSync(outputDir, { recursive: true });

console.log("Transpiling to CommonJS...");

// @ts-expect-error format should be assignable
// prettier-ignore
buildSync(Object.assign(cloneDeep(config), {
    entryPoints: [builder],
    format: "cjs",
    outdir: __dirname,
}));

// @ts-expect-error format should be assignable
// prettier-ignore
buildSync(Object.assign(cloneDeep(config), {
    entryPoints: globSync(["src/**/*.ts"]),
    format: "cjs",
    outdir: path.join(outputDir, "cjs"),
    tsconfig: path.resolve(__dirname, "tsconfig.cjs.json"),
}));

console.log("Transpiling to ES Module...");

// @ts-expect-error format should be assignable
// prettier-ignore
buildSync(Object.assign(cloneDeep(config), {
    entryPoints: globSync(["src/*.ts"]),
    format: "esm",
    outExtension: { ".js": ".mjs" },
    outdir: path.join(outputDir, "esm"),
    tsconfig: path.resolve(__dirname, "tsconfig.esm.json"),
}));

console.log("Successfully built files!");

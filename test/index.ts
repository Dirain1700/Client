"use strict";

import * as fs from "node:fs";
import * as path from "node:path";

import { Client } from "@dist/cjs/index";
import Mocha from "mocha";

if (!process.env.TEST_BOT_PASS) throw new Error("Test account's password was not provided.");

const PSClient = new Client({
    name: "Dirain's Bot",
    pass: process.env.TEST_BOT_PASS,
    autoJoin: ["botdevelopment"],
});

declare global {
    var client: typeof PSClient; // eslint-disable-line no-var
}

global.client = PSClient;

const mocha = new Mocha({
    reporter: "spec",
    ui: "bdd",
});

const baseDir = path.join(__dirname, "/modules/");
const testModules = fs.readdirSync(baseDir);

for (const f of testModules) {
    if (!f.endsWith(".js")) continue;
    mocha.addFile(path.join(baseDir, f));
}

mocha.run(() => process.exit());

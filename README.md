# @dirain/client

[![Node.js CI](https://github.com/Dirain1700/Client/actions/workflows/node.js.yml/badge.svg)](https://github.com/Dirain1700/Client/actions/workflows/node.js.yml)

## About

@dirain/client is a very fragile Node.js dual module to you create bots with Pokémon Showdown API.

-   Written in TypeScript
-   Support ESModule & CommonJS
-   Fragile

## Instlation

**Node.js v16.9.0 or higher required.**

```sh-session
npm i @dirain/client
```

## Examle usage

Run `npm i @dirain/client` before execing file.

Getting all existing battle formats:

```js
const { Client } = require("@dirain/client");

const client = new Client({});
let formats = {};

client.connect();

client.on("ready", () => {
    require("fs").writeFile("./formats.json", JSON.stringify(client.formats, null, 4), (err) => {
        if (err) throw err;
        console.log("Successfuly got a formats data!");
    });
});
```

Log into registered account:

```js
const { Client } = require("@dirain/client");

const client = new Client({ name: "myAccountName", pass: "thisIsMyRealPassWord", autoJoin: ["botdevelopment"] });

client.connect();

client.on("ready", () => console.log("Logged in as ", client.user.name));

client.on("messageCreate", (message) => {
    if (message.content === "ping") message.reply("Pong!");
});
```

With TypeScript:

```ts
import { Client } from "@dirain/client";

const client = new Client({ name: "My account ~", "NotRealPassL0L", autoJoin: ["botdevelopment"] });

client.connect();

client.on("ready", () => console.log("Logged in as ", client.user!.name);

client.on("messageCreate", (message) => {
    if (message.author.id === client.status.id) return;

    if (message.content === "ping") message.reply("Pong!");
});
```

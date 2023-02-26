"use strict";

import { User } from "./User";

import type { Client } from "./Client";

import type { UserSettings } from "../types/ClientUser";
import type { UserOptions } from "../types/User";

export class ClientUser extends User {
    trusted: boolean;
    settings: UserSettings = {};

    constructor(init: UserOptions, client: Client) {
        super(init, client);
        this.trusted = false;
    }

    setAvatar(avatar: string | number): Promise<User> {
        if (typeof avatar === "number") avatar = String(avatar);
        this.client.noreplySend(`|/avatar ${avatar as string}`);
        return this.client.fetchUser(this.userid);
    }

    setStatus(status: string): void {
        if (status.length > 52) return console.error(new Error("Status must be shorter than 52 characters."));
        this.client.noreplySend(`|/status ${status}`);
    }

    setSettings(data: UserSettings): void {
        if (typeof data !== "object") throw new TypeError("Input must be object.");
        this.client.noreplySend("|/updatesettings " + JSON.stringify(data));
    }

    blockChallenges(): void {
        this.client.noreplySend("|/blockchallenges");
    }
}

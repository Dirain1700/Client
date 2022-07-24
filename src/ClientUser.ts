import { User } from "./User";

import type { Client } from "./Client";
import type { UserOptions } from "./../types/User";
import type { UserSettings } from "./../types/ClientUser";

export class ClientUser extends User {
    trusted: boolean;
    settings: UserSettings = {};

    constructor(init: UserOptions, client: Client) {
        super(init, client);
        this.trusted = false;
    }

    setAvatar(avatar: string | number): Promise<User> {
        if (typeof avatar === "number") avatar = String(avatar);
        this.client.send(`|/avatar ${avatar as string}`);
        return this.client.fetchUser(this.userid);
    }

    setStatus(status: string): null | Promise<User> {
        if (status.length > 52) return null;
        this.client.send(`|/status ${status}`);
        return this.client.fetchUser(this.userid);
    }

    setSettings(data: UserSettings): void {
        if (typeof data !== "object") throw new TypeError("Input must be object.");

        this.client.send("|/updatesettings " + JSON.stringify(data));
        this.client.fetchUser(this.userid);
    }
}

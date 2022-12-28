"use strict";

import * as Tools from "./Tools";

import type { Client } from "./Client";
import type { UserOptions, GlobalPermissions } from "../types/User";
import type { MessageWaits, awaitMessageOptions, UserMessageOptions } from "../types/Message";
import type { AuthLevel, GroupSymbol } from "../types/UserGroups";
import type { Message } from "./Message";

export class User {
    id: string;
    userid: string;
    name: string;
    avatar: string | number | null;
    group: AuthLevel | null;
    customgroup: "Section Leader" | null;
    autoconfirmed: boolean;
    status?: string | null;
    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    rooms: { [key: string]: { [key: string]: any } } | null;
    friended: boolean;
    online: boolean;
    waits: MessageWaits<User>[];
    alts: string[];
    readonly client: Client;

    constructor(init: UserOptions, client: Client) {
        this.id = init.id;
        this.userid = init.userid;
        this.name = init.name;
        this.avatar = init.avatar || null;
        this.group = init.group ?? null;
        this.customgroup = init.customgroup ?? null;
        this.autoconfirmed = init.autoconfirmed ?? false;
        this.status = init.status ?? null;
        this.rooms = init.rooms || null;
        this.friended = init.friended ?? false;
        this.online = init.rooms ? true : false;
        this.waits = [];
        this.alts = [];
        this.client = init?.client ?? client;
    }

    send(content: UserMessageOptions): Promise<Message<User>> | void {
        return this.client.sendUser(this.userid, content);
    }

    awaitMessages(options: awaitMessageOptions<User>): Promise<Message<User>[] | null> {
        const isValidOption = (arg: unknown): arg is awaitMessageOptions<User> => {
            if (typeof arg !== "object") return false;
            return (
                !!(arg as awaitMessageOptions<User>)?.filter &&
                !!(arg as awaitMessageOptions<User>)?.max &&
                !!(arg as awaitMessageOptions<User>)?.time &&
                Object.keys(arg as awaitMessageOptions<User>).length === 3
            );
        };
        if (!isValidOption(options)) throw new Error("Input must be valid object with these keys: filter, max, time");
        const user = this;
        return new Promise((resolve, reject) => {
            const CollectorOptions: MessageWaits<User> = {
                id: Date.now().toString(),
                userid: user.userid,
                messages: [],
                filter: options.filter,
                max: options.max,
                time: options.time,
                resolve: (m: Message<User>[]): void => {
                    user.client.addUser(
                        Object.assign(user, {
                            waits: user.waits.filter(
                                (wait: MessageWaits<User>) => !user.client.resolvedUser.includes(wait.id)
                            ),
                        }) as UserOptions
                    );
                    resolve(m);
                },
                reject: (m: Message<User>[] | undefined): void => {
                    user.client.addUser(
                        Object.assign(user, {
                            waits: user.waits.filter(
                                (wait: MessageWaits<User>) => !user.client.resolvedUser.includes(wait.id)
                            ),
                        }) as UserOptions
                    );
                    reject(m);
                },
            };
            user.waits.push(CollectorOptions);
            const { messages, reject: rejectMessages } = CollectorOptions;
            setTimeout(rejectMessages, CollectorOptions.time, messages.length ? messages : null);
        });
    }

    can(permission: GlobalPermissions): boolean {
        permission = Tools.toId(permission);
        let auth: GroupSymbol = " ";
        switch (permission) {
            case "broadcast":
                auth = "+";
                break;
            case "warn":
            case "lock":
            case "alts":
            case "forcerename":
                auth = "%";
                break;
            case "globalban":
            case "ip":
                auth = "@";
                break;
            case "forcewin":
            case "forcetie":
            case "promote":
            case "demote":
            case "banip":
            case "hotpatch":
            case "eval":
                auth = "&";
                break;
        }
        if (auth === " ") return false;
        function isInRankList(rank: GroupSymbol | AuthLevel | null): rank is GroupSymbol {
            if (!rank) return false;
            return Tools.rankList.includes(rank as string);
        }
        if (!isInRankList(this.group)) return false;
        return Tools.isHigherRank(this.group, auth);
    }

    get isGlobalVoice(): boolean {
        return this.group === "+";
    }

    get isGlobalDriver(): boolean {
        return this.group === "%";
    }

    get isGlobalMod(): boolean {
        return this.group === "@";
    }

    get isGlobalBot(): boolean {
        return this.group === "*";
    }

    get isGlobalAdmin(): boolean {
        return this.group === "&";
    }

    get isGlobalStaff(): boolean {
        return this.isGlobalDriver || this.isGlobalMod || this.isGlobalAdmin;
    }
}

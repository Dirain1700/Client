"use strict";

import { Collection } from "@discordjs/collection";

import { PSAPIError } from "./Error";
import { Room } from "./Room";
import { Tools } from "./Tools";

import type { Client } from "./Client";
import type { Message } from "./Message";

import type { IUserOutGoingMessageOptions } from "../types/Client";
import type { MessageWaits, awaitMessageOptions } from "../types/Message";
import type { UserOptions, GlobalPermissions } from "../types/User";
import type { GroupSymbol, GroupNames } from "../types/UserGroups";

export class User {
    id: string;
    userid: string;
    name: string;
    avatar: string | number | null;
    group: GroupSymbol;
    locked: boolean;
    sectionLeader: boolean;
    autoconfirmed: boolean;
    status: string;
    rooms: Collection<string, Room>;
    friended: boolean;
    guestNumber: string;
    online: boolean;
    waits: MessageWaits<User>[];
    alts: string[];
    lastFetchTime: number = 0;
    readonly client: Client;

    constructor(init: UserOptions, client: Client, noinit?: boolean) {
        this.id = init.id;
        this.userid = init.userid;
        this.name = init.name;
        this.avatar = init.avatar ?? null;
        this.group = init.group ?? " ";
        this.locked = this.group === "‽";
        this.sectionLeader = init.customgroup === "Section Leader";
        this.autoconfirmed = init.autoconfirmed ?? false;
        this.status = init.status ?? "";
        this.rooms = new Collection();
        this.friended = init.friended ?? false;
        this.guestNumber = init.guestNumber ?? "";
        this.waits = [];
        this.alts = [];
        this.client = init?.client ?? client;
        Object.defineProperty(this, "waits", {
            enumerable: false,
            writable: true,
        });
        Object.defineProperty(this, "client", {
            enumerable: false,
            writable: true,
        });
        if (init.rooms) {
            Object.keys(init.rooms).forEach((r) => {
                const room = client.getRoom(r);
                if (!room || room.exists) return;
                this.rooms.set(room.roomid, room);
            });
        }
        if (!this.avatar && !noinit) this.update();
        this.online = this.setIsOnline();
    }

    send(content: string, options?: Partial<IUserOutGoingMessageOptions>): void {
        if (!this.online) throw new PSAPIError("USER_OFFLINE", this.userid);
        if (!content) throw new PSAPIError("EMPTY_MESSAGE");

        const outgoingMessage: IUserOutGoingMessageOptions = {
            userid: this.userid,
            text: this.setupMessage(content),
            raw: content,
            type: options && options.type ? options.type : undefined,
            measure: options && options.measure ? options.measure : undefined,
        };

        this.client.send(outgoingMessage);
    }

    setupMessage(content: string): string {
        if (!this.online) throw new PSAPIError("USER_OFFLINE", this.userid);
        return "|/pm " + this.userid + "," + content;
    }

    setLastFetchTime(time?: number): void {
        if (time && time > Date.now()) return;
        this.lastFetchTime = time ?? Date.now();
    }

    setIsOnline(): boolean {
        const raw = this.client.users.raw.get(this.id);
        this.online =
            this.avatar === 0 || this.avatar
                ? raw
                    ? !raw.userid.startsWith("guest")
                        ? true
                        : this.locked
                    : false
                : false;
        return this.online;
    }

    update(): this {
        const user = this.client.users.cache.get(this.id);
        if (!user) return this;
        Object.assign(this, user);
        return this;
    }

    addRoom(roomid: string): this {
        roomid = Tools.toRoomId(roomid);
        if (!roomid) return this;
        const room = this.client.getRoom(roomid);
        if (!room || !room.exists) return this;
        this.rooms.set(room.roomid, room);
        return this;
    }

    removeRoom(roomid: string): this {
        roomid = Tools.toRoomId(roomid);
        if (!roomid || !this.rooms.has(roomid)) return this;
        this.rooms.delete(roomid);
        return this;
    }

    fetch(useCache?: boolean): Promise<User> {
        return this.client.fetchUser(this.id, !!useCache);
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

    checkCan(permission: string & GlobalPermissions, strict?: boolean): boolean {
        if (this.locked) {
            if (strict) throw new PSAPIError("PERMISSION_DENIED", " ", "‽");
            else return false;
        }
        let auth: GroupSymbol = " ";
        switch (permission) {
            case "chat":
                auth = " ";
                break;
            case "groupchat":
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
            case "forceend":
            case "promote":
            case "banip":
            case "bypassall":
                auth = "&";
                break;
            default:
                if (strict) throw new PSAPIError("PERMISSION_NOT_FOUND", permission satisfies never);
                else return false;
        }
        const can = Tools.isHigherRank(this.group, auth);
        if (strict && !can) throw new PSAPIError("PERMISSION_DENIED", auth, this.group);
        else return can;
    }

    hasRank(rank: GroupNames | GroupSymbol, room?: Room): boolean {
        if (this.locked || !rank) return false;
        let auth = this.group;
        if (room instanceof Room) return room.hasRank(rank, this);
        if (!Tools.rankSymbols.includes(rank as GroupSymbol))
            rank = Tools.toGroupSymbol(rank as Exclude<typeof rank, GroupSymbol>);
        if (!Tools.rankSymbols.includes(auth as GroupSymbol))
            auth = Tools.toGroupSymbol(auth as Exclude<typeof rank, GroupSymbol>);
        return Tools.isHigherRank(auth, rank as GroupSymbol);
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

"use strict";

import * as Tools from "./Tools";
import { User as UserClass } from "./User";

import type { RoomOptions, HTMLOptions, RoomPermissions } from "../types/Room";
import type { Client } from "./Client";
import type { User } from "./User";
import type { Message } from "./Message";
import type { Tournament } from "./Tour";
import type { MessageWaits, awaitMessageOptions, RoomMessageOptions } from "../types/Message";
import type { GroupSymbol, AuthLevel } from "../types/UserGroups";

export class Room {
    id: string;
    roomid: string;
    title: string | null;
    type: "chat" | "battle" | "html";
    visibility: "public" | "hidden" | "secret";
    modchat: AuthLevel | null;
    modjoin: AuthLevel | null;
    tour: Tournament | null = null;
    auth: {
        [key: string]: string[];
    } | null;
    users: string[] | null;
    waits: MessageWaits<Room>[];
    readonly isExist: boolean;
    readonly client: Client;

    constructor(init: RoomOptions, client: Client) {
        this.id = init.id;
        this.roomid = init.roomid ?? init.id;
        this.title = init.title || null;
        this.type = init.id?.startsWith("view-") ? "html" : init.type;
        this.visibility = init.visibility || "secret";
        this.modchat = init.modchat || null;
        this.modjoin = init.modjoin || null;
        this.auth = init.auth || null;
        this.users = init.users || null;
        this.waits = init.waits ?? [];
        this.isExist = init.error ? false : true;
        this.client = client;
        Object.defineProperty(this, "waits", {
            enumerable: false,
            writable: true,
        });
    }

    send(content: RoomMessageOptions): Promise<Message<Room>> | void {
        return this.client.sendRoom(this.roomid!, content);
    }

    update(): this {
        const room = this.client.rooms.cache.get(this.id);
        if (!room) return this;
        Object.assign(this, room);
        return this;
    }

    setRoomIntro(html: string): void {
        this.send("/roomintro " + html);
    }

    setAnnounce(content?: string | null): void {
        if (content) this.send("/announcement create " + content);
        else this.send("/announcement end");
    }

    sendHTML(options: HTMLOptions): void {
        this.client.sendRoom(this.id, options);
    }

    changeHTML(options: HTMLOptions): void {
        this.client.sendRoom(this.id, options);
    }

    deleteMessages(user: string, clear: boolean, reason: string, lines?: number): Promise<Message<Room> | null> {
        const r = this;
        return new Promise((resolve, reject) => {
            r.client.sendRoom(
                r.id,
                `/${clear ? "clear" : "hide"}${lines ? "lines" : "text"} ${user},${lines ? lines + "," : ""}${
                    reason || ""
                }`
            );
            r.awaitMessages({
                filter: (m: Message<Room>) =>
                    m.author.id === "&" &&
                    m.content.endsWith(`by ${r.client.status.name}.${reason ? " (" + reason + ")" : ""}`),
                max: 1,
                time: 10 * 1000,
            })
                .then((m: Message<Room>[] | null) => resolve((m as Message<Room>[])[0]!))
                .catch(reject);
        });
    }

    awaitMessages(options: awaitMessageOptions<Room>): Promise<Message<Room>[] | null> {
        const isValidOption = (arg: unknown): arg is awaitMessageOptions<Room> => {
            if (typeof arg !== "object") return false;
            return (
                !!(arg as awaitMessageOptions<Room>)?.filter &&
                !!(arg as awaitMessageOptions<Room>)?.max &&
                !!(arg as awaitMessageOptions<Room>)?.time &&
                Object.keys(arg as awaitMessageOptions<Room>).length === 3
            );
        };
        if (!isValidOption(options)) throw new Error("Input must be valid object with these keys: filter, max, time");
        const room = this;
        return new Promise((resolve, reject) => {
            const CollectorOptions: MessageWaits<Room> = {
                id: Date.now().toString(),
                roomid: this.roomid!,
                messages: [],
                filter: options.filter,
                max: options.max,
                time: options.time,
                resolve: (m: Message<Room>[]): void => {
                    room.client.addRoom(
                        Object.assign(room, {
                            waits: room.waits.filter(
                                (wait: MessageWaits<Room>) => !room.client.resolvedRoom.includes(wait.id)
                            ),
                        }) as RoomOptions
                    );
                    resolve(m);
                },
                reject: (m: Message<Room>[]): void => {
                    room.client.addRoom(
                        Object.assign(room, {
                            waits: room.waits.filter(
                                (wait: MessageWaits<Room>) => !room.client.resolvedRoom.includes(wait.id)
                            ),
                        }) as RoomOptions
                    );
                    reject(m);
                },
            };
            room.waits.push(CollectorOptions);
            const { messages, reject: rejectMessages } = CollectorOptions;
            setTimeout(rejectMessages, CollectorOptions.time, messages.length ? messages : null);
        });
    }

    getRank(user: User | string): GroupSymbol {
        let GlobalRank: GroupSymbol = " ";
        if (typeof user === "string") {
            user = Tools.toId(user);
            GlobalRank = this.client.users.cache.get(user)?.group ?? " ";
        } else {
            GlobalRank = user.group ?? " ";
            user = user.id;
        }
        if (this.visibility === "secret") return this.getRoomRank(user);
        const RoomRank: GroupSymbol = this.getRoomRank(user);
        return Tools.sortByRank([RoomRank, GlobalRank])[0] as GroupSymbol;
    }

    getRoomRank(userid: string): GroupSymbol {
        userid = Tools.toId(userid);
        let rank: GroupSymbol = " ";
        if (!this.auth) return rank;

        for (const [auth, users] of Object.entries(this.auth)) {
            if (users.includes(userid)) {
                rank = auth as GroupSymbol;
                break;
            }
        }
        return rank;
    }

    can(permission: RoomPermissions, user: User): boolean;
    can(permission: string, user: User): boolean;
    can(permission: string | RoomPermissions, user: User): boolean {
        permission = Tools.toId(permission);
        let auth: GroupSymbol = " ";
        switch (permission) {
            case "broadcast":
                auth = "+";
                break;
            case "show":
            case "warn":
            case "tour":
            case "mute":
            case "announce":
            case "announcement":
                auth = "%";
                break;
            case "ban":
            case "roomban":
            case "rfaq":
                auth = "@";
                break;
            case "html":
            case "declare":
                auth = "*";
                break;
            case "intro":
                auth = "#";
                break;
        }
        if (auth === " ") return false;
        const userAuth = this.getRank(user.id);
        return Tools.isHigherRank(userAuth, auth);
    }

    isVoice(userid: string): boolean {
        userid = Tools.toId(userid);
        if (this.auth && this.isExist) return this.auth["+"]?.includes(userid) ?? false;
        return false;
    }

    isDriver(userid: string): boolean {
        userid = Tools.toId(userid);
        if (this.auth && this.isExist) return this.auth["%"]?.includes(userid) ?? false;
        return false;
    }

    isMod(userid: string): boolean {
        userid = Tools.toId(userid);
        if (this.auth && this.isExist) return this.auth["@"]?.includes(userid) ?? false;
        return false;
    }

    isBot(userid: string): boolean {
        userid = Tools.toId(userid);
        if (this.auth && this.isExist) return this.auth["*"]?.includes(userid) ?? false;
        return false;
    }

    isOwner(userid: string): boolean {
        userid = Tools.toId(userid);
        if (this.auth && this.isExist) return this.auth["#"]?.includes(userid) ?? false;
        return false;
    }

    isRoomStaff(userid: string): boolean {
        if (this.auth && this.isExist) return this.isDriver(userid) || this.isMod(userid) || this.isOwner(userid);
        return false;
    }

    isStaff(user: User): boolean {
        if (user instanceof UserClass && this.auth && this.isExist) {
            if (user.online) return (user as User).isGlobalStaff || this.isRoomStaff(user.userid);
            else return this.isRoomStaff(user.userid);
        }
        return false;
    }
}

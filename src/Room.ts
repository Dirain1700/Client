"use strict";

import { Tools } from "./Tools";
import { User } from "./User";
import { PSAPIError } from "./Error";

import type { RoomOptions, RoomPermissions } from "../types/Room";
import type { Client } from "./Client";
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
        [key: GroupSymbol | string]: string[];
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

    useCommand(command: string): void {
        this.client.send(this.roomid + "|" + command);
    }

    update(): this {
        const room = this.client.rooms.cache.get(this.id);
        if (!room) return this;
        Object.assign(this, room);
        return this;
    }

    setRoomIntro(html: string): void {
        this.checkCan("roomintro", this.client.status.id, true);
        this.useCommand("/roomintro " + html);
    }

    setAnnounce(content?: string | null): void {
        this.checkCan("announcement", this.client.status.id, true);
        if (content) this.send("/announcement create " + content);
        else this.useCommand("/announcement end");
    }

    sendUhtml(id: string, html: string, change?: boolean): void {
        this.checkCan("html", this.client.status.id, true);
        if (change) this.changeUhtml(id, html);
        if (!id || !html) throw new PSAPIError("EMPTY", !id ? "ID" : "HTML");
        this.useCommand(`/adduhtml ${id},${html}`);
    }

    changeUhtml(id: string, html: string): void {
        this.checkCan("html", this.client.status.id, true);
        if (!id || !html) throw new PSAPIError("EMPTY", !id ? "ID" : "HTML");
        this.useCommand(`/changeuhtml ${id},${html}`);
    }

    clearUhtml(id: string): void {
        this.checkCan("html", this.client.status.id, true);
        if (!id) throw new PSAPIError("EMPTY", "ID");
        this.useCommand(`/changeuhtml ${id},<div></div>`);
    }

    sendHtmlBox(html: string): void {
        this.checkCan("html", this.client.status.id, true);
        if (!html) throw new PSAPIError("EMPTY", "HTML");
        this.useCommand(`/addhtmlbox ${html}`);
    }

    sendAuthUhtml(rank: GroupSymbol, id: string, html: string, change?: boolean): void {
        this.checkCan("html", this.client.status.id, true);
        if (change) this.changeAuthUhtml(rank, id, html);
        if (!id || !html) throw new PSAPIError("EMPTY", !id ? "ID" : "HTML");
        this.useCommand(`/addrankuhtml ${rank},${id},${html}`);
    }

    changeAuthUhtml(rank: GroupSymbol, id: string, html: string): void {
        this.checkCan("html", this.client.status.id, true);
        if (!id || !html) throw new PSAPIError("EMPTY", !id ? "ID" : "HTML");
        this.useCommand(`/changerankuhtml ${rank},${id},${html}`);
    }

    clearAuthUhtml(rank: GroupSymbol, id: string): void {
        this.checkCan("html", this.client.status.id, true);
        if (!id) throw new PSAPIError("EMPTY", "ID");
        this.useCommand(`/changeuhtml ${rank},${id},<div></div>`);
    }

    sendAuthHtmlBox(rank: GroupSymbol, html: string): void {
        this.checkCan("html", this.client.status.id, true);
        if (!html) throw new PSAPIError("EMPTY", "HTML");
        this.useCommand(`/addrankhtmlbox ${rank},${html}`);
    }

    sendPrivateUhtml(user: string, id: string, html: string, change?: boolean): void {
        this.checkCan("html", this.client.status.id, true);
        if (change) return this.changePrivateUhtml(user, id, html);
        user = Tools.toId(user);
        if (!user || !id || !html) throw new PSAPIError("EMPTY", !user ? "User" : !id ? "ID" : "HTML");
        this.useCommand(`/sendprivateuhtml ${user},${id},${html}}`);
    }

    changePrivateUhtml(user: string, id: string, html: string): void {
        this.checkCan("html", this.client.status.id, true);
        user = Tools.toId(user);
        if (!user || !html || !id) throw new PSAPIError("EMPTY", !user ? "User" : !id ? "uhtml ID" : "HTML");
        this.useCommand(`/changeprivateuhtml ${user},${id},${html}`);
    }

    clearPrivateUhtml(user: string, id: string): void {
        this.checkCan("html", this.client.status.id, true);
        user = Tools.toId(user);
        if (!user || !id) throw new PSAPIError("EMPTY", !user ? "User" : "ID");
        this.useCommand(`/changeprivateuhtml ${user},${id},<div></div>`);
    }

    sendPrivateHtmlBox(user: string, html: string): void {
        this.checkCan("html", this.client.status.id, true);
        user = Tools.toId(user);
        if (!user || !html) throw new PSAPIError("EMPTY", !user ? "User" : "HTML");
        this.useCommand(`/sendprivatehtmlbox ${user},${html}`);
    }

    sendPmUhtml(user: string, id: string, html: string, change?: boolean): void {
        this.checkCan("html", this.client.status.id, true);
        if (change) return this.changePmUhtml(user, id, html);
        user = Tools.toId(user);
        if (!user || !id || !html) throw new PSAPIError("EMPTY", !user ? "User" : !id ? "ID" : "HTML");
        this.useCommand(`/pmuhtml ${user},${id},${html}`);
    }

    changePmUhtml(user: string, id: string, html: string): void {
        this.checkCan("html", this.client.status.id, true);
        user = Tools.toId(user);
        if (!user || !id || !html) throw new PSAPIError("EMPTY", !user ? "User" : !id ? "ID" : "HTML");
        this.useCommand(`/pmuhtmlchange ${user},${id},${html}`);
    }

    clearPmUhtml(user: string, id: string): void {
        this.checkCan("html", this.client.status.id, true);
        user = Tools.toId(user);
        if (!user || !id) throw new PSAPIError("EMPTY", !user ? "User" : "ID");
        this.useCommand(`/pmuhtmlchange ${user},${id},<div></div>`);
    }

    sendPmHtmlBox(user: string, html: string): void {
        this.checkCan("html", this.client.status.id, true);
        user = Tools.toId(user);
        if (!user || !html) throw new PSAPIError("EMPTY", !user ? "User" : "ID");
        this.useCommand(`/pminfobox ${user},${html}`);
    }

    sendHtmlPage(user: string, id: string, html: string): void {
        this.checkCan("html", this.client.status.id, true);
        user = Tools.toId(user);
        if (!user || !id || !html) throw new PSAPIError("EMPTY", !user ? "User" : !id ? "ID" : "HTML");
        this.useCommand(`/sendhtmlpage ${user},${id},${html}`);
    }

    deleteMessages(user: string, clear: boolean, reason: string, lines?: number): Promise<Message<Room> | null> {
        this.checkCan("hidetext", this.client.status.id);
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

    checkCan(permission: RoomPermissions, user: User | string, strict?: boolean): boolean;
    checkCan(permission: string, user: User | string, strict?: boolean): boolean;
    checkCan(permission: string | RoomPermissions, user: User | string, strict?: boolean): boolean {
        if (!this.isExist || !this.auth) {
            if (strict) throw new PSAPIError("EMPTY", "Room");
            else return false;
        }
        if (!this.client.status.loggedIn) {
            if (strict) throw new PSAPIError("NOT_LOGGED_IN");
            else return false;
        }
        permission = Tools.toId(permission);
        let auth: GroupSymbol = " ";
        switch (permission) {
            case "broadcast":
                auth = "+";
                break;
            case "show":
            case "hidetext":
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
        if (auth === " ") {
            if (strict) throw new PSAPIError("PERMISSION_NOT_FOUND", permission);
            else return false;
        }
        const userAuth = this.getRank(user instanceof User ? user.id : user);
        const can = Tools.isHigherRank(userAuth, auth);
        if (strict && !can) throw new PSAPIError("PERMISSION_DENIED", auth, userAuth);
        else return can;
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

    hasRank(user: string | User, auth: GroupSymbol): boolean {
        if (!this.auth || !this.isExist) return false;
        const rank = this.getRank(user);
        return Tools.isHigherRank(rank, auth);
    }

    isRoomStaff(userid: string): boolean {
        if (this.auth && this.isExist) return this.isDriver(userid) || this.isMod(userid) || this.isOwner(userid);
        return false;
    }

    isStaff(user: User): boolean {
        if (user instanceof User && this.auth && this.isExist) {
            if (user.online) return user.isGlobalStaff || this.isRoomStaff(user.userid);
            else return this.isRoomStaff(user.userid);
        }
        return false;
    }
}

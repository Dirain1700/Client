"use strict";

import { Collection } from "@discordjs/collection";

import { PSAPIError } from "./Error";
import { Tools } from "./Tools";
import { User } from "./User";

import type { Client } from "./Client";
import type { Message } from "./Message";
import type { Tournament } from "./Tour";

import type { IRoomOutGoingMessageOptions } from "../types/Client";
import type { MessageWaits, awaitMessageOptions } from "../types/Message";
import type { RoomOptions, RoomPermissions } from "../types/Room";
import type { GroupSymbol, GroupNames, AuthLevel } from "../types/UserGroups";

export class Room {
    id: string;
    roomid: string;
    title: string;
    type: "chat" | "battle" | "html";
    visibility: "public" | "hidden" | "secret";
    modchat: AuthLevel | null;
    modjoin: AuthLevel | null;
    tour: Tournament | null = null;
    auth: {
        [key: GroupSymbol | string]: string[];
    };
    userCollection: Collection<string, User>;
    users: string[];
    lastFetchTime: number = 0;
    waits: MessageWaits<Room>[];
    readonly isExist: boolean;
    readonly client: Client;

    constructor(init: RoomOptions, client: Client) {
        this.id = init.id;
        this.roomid = init.roomid || init.id;
        this.title = init.title || init.id;
        this.type = init.id?.startsWith("view-") ? "html" : init.type;
        this.visibility = init.visibility || "secret";
        this.modchat = init.modchat || null;
        this.modjoin = init.modjoin || null;
        this.auth = init.auth || {};
        this.userCollection = new Collection();
        this.users = init.users || [];
        this.waits = init.waits ?? [];
        this.isExist = init.error ? false : true;
        this.client = client;
        Object.defineProperty(this, "waits", {
            enumerable: false,
            writable: true,
        });
        this.setVisibility();
        this.update();
    }

    setVisibility(): void {
        if (this.visibility !== "secret") return;
        const users: [string, GroupSymbol][] = this.users.map((u) => [Tools.toId(u), u.charAt(0) as GroupSymbol]);
        if (users.some(([u, a]) => !Tools.isHigherRank(this.getRoomRank(u), a))) this.visibility = "hidden";
    }

    send(content: string, options?: Partial<IRoomOutGoingMessageOptions>): void {
        if (!this.isExist || !this.roomid) throw new PSAPIError("ROOM_NONEXIST", this.id);
        if (!content) throw new PSAPIError("EMPTY_MESSAGE");

        const outgoingMessage: IRoomOutGoingMessageOptions = {
            roomid: this.roomid,
            text: this.setupMessage(content),
            raw: content,
            type: options && options.type ? options.type : undefined,
            measure: options && options.measure ? options.measure : undefined,
        };

        this.client.send(outgoingMessage);
    }

    setupMessage(content: string): string {
        if (!this.isExist || !this.roomid) throw new PSAPIError("ROOM_NONEXIST", this.id);
        return this.roomid + "|" + content;
    }

    setLastFetchTime(time?: number): void {
        if (time && time > Date.now()) return;
        this.lastFetchTime = time ?? Date.now();
    }

    update(): this {
        const room = this.client.rooms.cache.get(this.id);
        if (!room) return this;
        Object.assign(this, room);
        this.users.forEach((u) => {
            if (this.userCollection.has(Tools.toId(u))) return;
        });
        return this;
    }

    addUser(name: string): this {
        const userid = Tools.toId(name);
        if (!userid) return this;
        const user = this.client.getUser(userid);
        if (!user) return this;
        if (this.users.map(Tools.toId).includes(userid)) {
            const nameIndex = this.users.map(Tools.toId).indexOf(userid);
            if (nameIndex === -1) return this;
            this.users.splice(nameIndex, 1);
        }
        this.users.push(user.group + user.name);
        this.userCollection.set(user.userid, user);
        return this;
    }

    removeUser(userid: string): this {
        userid = Tools.toId(userid);
        if (userid) {
            const nameIndex = this.users.map(Tools.toId).indexOf(userid);
            if (nameIndex === -1) return this;
            this.users.splice(nameIndex, 1);
        }
        if (this.userCollection.has(userid)) this.userCollection.delete(userid);
        return this;
    }

    announce(text: string): void {
        if (!this.client.user) throw new PSAPIError("NOT_LOGGED_IN");
        this.checkCan("warn", this.client.user, true);
        this.send("/announce " + text, { type: "command", measure: false });
    }

    setModchat(rank: GroupSymbol): void {
        if (!this.client.user) throw new PSAPIError("NOT_LOGGED_IN");
        if (Tools.isHigherRank(rank, "%")) this.checkCan("roomban", this.client.user, true);
        else this.checkCan("warn", this.client.user, true);
        this.send("/modchat " + rank, { type: "command", measure: false });
    }

    setAnnounce(content?: string | null): void {
        if (!this.client.user) throw new PSAPIError("NOT_LOGGED_IN");
        this.checkCan("announcement", this.client.user, true);
        if (content) this.send("/announcement create " + content);
        else this.send("/announcement end", { type: "command", measure: false });
    }

    sendUhtml(id: string, html: string, change?: boolean): void {
        if (!this.client.user) throw new PSAPIError("NOT_LOGGED_IN");
        this.checkCan("html", this.client.user, true);
        if (change) this.changeUhtml(id, html);
        if (!id || !html) throw new PSAPIError("EMPTY", !id ? "ID" : "HTML");
        this.send(`/adduhtml ${id},${html}`, { type: "command", measure: false });
    }

    changeUhtml(id: string, html: string): void {
        if (!this.client.user) throw new PSAPIError("NOT_LOGGED_IN");
        this.checkCan("html", this.client.user, true);
        if (!id || !html) throw new PSAPIError("EMPTY", !id ? "ID" : "HTML");
        this.send(`/changeuhtml ${id},${html}`, { type: "command", measure: false });
    }

    clearUhtml(id: string): void {
        if (!this.client.user) throw new PSAPIError("NOT_LOGGED_IN");
        this.checkCan("html", this.client.user, true);
        if (!id) throw new PSAPIError("EMPTY", "ID");
        this.send(`/changeuhtml ${id},<div></div>`, { type: "command", measure: false });
    }

    sendHtmlBox(html: string): void {
        if (!this.client.user) throw new PSAPIError("NOT_LOGGED_IN");
        this.checkCan("html", this.client.user, true);
        if (!html) throw new PSAPIError("EMPTY", "HTML");
        this.send(`/addhtmlbox ${html}`, { type: "command", measure: false });
    }

    sendAuthUhtml(rank: GroupSymbol, id: string, html: string, change?: boolean): void {
        if (!this.client.user) throw new PSAPIError("NOT_LOGGED_IN");
        this.checkCan("html", this.client.user, true);
        if (change) this.changeAuthUhtml(rank, id, html);
        if (!id || !html) throw new PSAPIError("EMPTY", !id ? "ID" : "HTML");
        this.send(`/addrankuhtml ${rank},${id},${html}`, { type: "command", measure: false });
    }

    changeAuthUhtml(rank: GroupSymbol, id: string, html: string): void {
        if (!this.client.user) throw new PSAPIError("NOT_LOGGED_IN");
        this.checkCan("html", this.client.user, true);
        if (!id || !html) throw new PSAPIError("EMPTY", !id ? "ID" : "HTML");
        this.send(`/changerankuhtml ${rank},${id},${html}`, { type: "command", measure: false });
    }

    clearAuthUhtml(rank: GroupSymbol, id: string): void {
        if (!this.client.user) throw new PSAPIError("NOT_LOGGED_IN");
        this.checkCan("html", this.client.user, true);
        if (!id) throw new PSAPIError("EMPTY", "ID");
        this.send(`/changeuhtml ${rank},${id},<div></div>`, { type: "command", measure: false });
    }

    sendAuthHtmlBox(rank: GroupSymbol, html: string): void {
        if (!this.client.user) throw new PSAPIError("NOT_LOGGED_IN");
        this.checkCan("html", this.client.user, true);
        if (!html) throw new PSAPIError("EMPTY", "HTML");
        this.send(`/addrankhtmlbox ${rank},${html}`, { type: "command", measure: false });
    }

    sendPrivateUhtml(user: string, id: string, html: string, change?: boolean): void {
        if (!this.client.user) throw new PSAPIError("NOT_LOGGED_IN");
        this.checkCan("html", this.client.user, true);
        if (change) return this.changePrivateUhtml(user, id, html);
        user = Tools.toId(user);
        if (!user || !id || !html) throw new PSAPIError("EMPTY", !user ? "User" : !id ? "ID" : "HTML");
        this.send(`/sendprivateuhtml ${user},${id},${html}`, { type: "command", measure: false });
    }

    changePrivateUhtml(user: string, id: string, html: string): void {
        if (!this.client.user) throw new PSAPIError("NOT_LOGGED_IN");
        this.checkCan("html", this.client.user, true);
        user = Tools.toId(user);
        if (!user || !html || !id) throw new PSAPIError("EMPTY", !user ? "User" : !id ? "uhtml ID" : "HTML");
        this.send(`/changeprivateuhtml ${user},${id},${html}`, { type: "command", measure: false });
    }

    clearPrivateUhtml(user: string, id: string): void {
        if (!this.client.user) throw new PSAPIError("NOT_LOGGED_IN");
        this.checkCan("html", this.client.user, true);
        user = Tools.toId(user);
        if (!user || !id) throw new PSAPIError("EMPTY", !user ? "User" : "ID");
        this.send(`/changeprivateuhtml ${user},${id},<div></div>`, { type: "command", measure: false });
    }

    sendPrivateHtmlBox(user: string, html: string): void {
        if (!this.client.user) throw new PSAPIError("NOT_LOGGED_IN");
        this.checkCan("html", this.client.user, true);
        user = Tools.toId(user);
        if (!user || !html) throw new PSAPIError("EMPTY", !user ? "User" : "HTML");
        this.send(`/sendprivatehtmlbox ${user},${html}`, { type: "command", measure: false });
    }

    sendPmUhtml(user: string, id: string, html: string, change?: boolean): void {
        if (!this.client.user) throw new PSAPIError("NOT_LOGGED_IN");
        this.checkCan("html", this.client.user, true);
        if (change) return this.changePmUhtml(user, id, html);
        user = Tools.toId(user);
        if (!user || !id || !html) throw new PSAPIError("EMPTY", !user ? "User" : !id ? "ID" : "HTML");
        this.send(`/pmuhtml ${user},${id},${html}`, { type: "command", measure: false });
    }

    changePmUhtml(user: string, id: string, html: string): void {
        if (!this.client.user) throw new PSAPIError("NOT_LOGGED_IN");
        this.checkCan("html", this.client.user, true);
        user = Tools.toId(user);
        if (!user || !id || !html) throw new PSAPIError("EMPTY", !user ? "User" : !id ? "ID" : "HTML");
        this.send(`/pmuhtmlchange ${user},${id},${html}`, { type: "command", measure: false });
    }

    clearPmUhtml(user: string, id: string): void {
        if (!this.client.user) throw new PSAPIError("NOT_LOGGED_IN");
        this.checkCan("html", this.client.user, true);
        user = Tools.toId(user);
        if (!user || !id) throw new PSAPIError("EMPTY", !user ? "User" : "ID");
        this.send(`/pmuhtmlchange ${user},${id},<div></div>`, { type: "command", measure: false });
    }

    sendPmHtmlBox(user: string, html: string): void {
        if (!this.client.user) throw new PSAPIError("NOT_LOGGED_IN");
        this.checkCan("html", this.client.user, true);
        user = Tools.toId(user);
        if (!user || !html) throw new PSAPIError("EMPTY", !user ? "User" : "ID");
        this.send(`/pminfobox ${user},${html}`, { type: "command", measure: false });
    }

    sendHtmlPage(user: string, id: string, html: string): void {
        if (!this.client.user) throw new PSAPIError("NOT_LOGGED_IN");
        this.checkCan("html", this.client.user, true);
        user = Tools.toId(user);
        if (!user || !id || !html) throw new PSAPIError("EMPTY", !user ? "User" : !id ? "ID" : "HTML");
        this.send(`/sendhtmlpage ${user},${id},${html}`, { type: "command", measure: false });
    }

    modnote(text: string): void {
        if (!this.client.user) throw new PSAPIError("NOT_LOGGED_IN");
        this.checkCan("warn", this.client.user);
        this.send("/modnote " + text, { type: "command", measure: false });
    }

    hidetext(user: string, clear: boolean, lines?: number | null, reason?: string): Promise<Message<Room> | null> {
        if (!this.client.user) throw new PSAPIError("NOT_LOGGED_IN");
        this.checkCan("hidetext", this.client.user);
        const r = this;
        return new Promise((resolve, reject) => {
            r.send(
                `/${clear ? "clear" : "hide"}${lines ? "lines" : "text"} ${user},${lines ? lines + "," : ""}${
                    reason || ""
                }`,
                { type: "command", measure: false }
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

    warn(targetUser: User, reason?: string): void {
        if (!targetUser.online) return;
        if (!this.client.user) throw new PSAPIError("NOT_LOGGED_IN");
        this.checkCan("warn", this.client.user, true);
        if (this.isStaff(targetUser)) return;
        this.send("/warn " + targetUser.userid + (reason ? "," + reason : ""), { type: "command", measure: false });
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
        if (!this.isExist || !this.auth) return GlobalRank;
        if (this.visibility === "secret") return this.getRoomRank(user);
        const RoomRank: GroupSymbol = this.getRoomRank(user);
        if (!Tools.rankSymbols.includes(RoomRank)) return "+";
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

    checkCan(permission: string & RoomPermissions, user: User | string, strict?: boolean): boolean {
        if (!this.isExist || !this.auth) {
            if (strict) throw new PSAPIError("EMPTY", "Room");
            else return false;
        }
        if (!this.client.status.loggedIn) {
            if (strict) throw new PSAPIError("NOT_LOGGED_IN");
            else return false;
        }
        let auth: GroupSymbol = " ";
        switch (permission) {
            case "chat":
                auth = " ";
                break;
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
            case "roomintro":
                auth = "#";
                break;
            default:
                if (strict) throw new PSAPIError("PERMISSION_NOT_FOUND", permission satisfies never);
                else return false;
        }
        const userAuth = this.getRank(user instanceof User ? user.id : user);
        const can = Tools.isHigherRank(userAuth, auth);
        if (strict && !can) throw new PSAPIError("PERMISSION_DENIED", auth, userAuth);
        else return can;
    }

    hasRank(rank: GroupNames | GroupSymbol, user: User | string): boolean {
        if ((user instanceof User && user.locked) || !rank) return false;
        let auth = this.getRank(user);
        if (!Tools.rankSymbols.includes(auth as GroupSymbol))
            auth = Tools.toGroupSymbol(auth as Exclude<typeof auth, GroupSymbol>);
        if (!Tools.rankSymbols.includes(rank as GroupSymbol))
            rank = Tools.toGroupSymbol(rank as Exclude<typeof rank, GroupSymbol>);
        return Tools.isHigherRank(auth, rank as GroupSymbol);
    }

    isMuted(userid: string): boolean {
        const mutedUsers = this.users.filter((e) => e.startsWith("!")).map(Tools.toId);
        if (!mutedUsers.length) return false;
        userid = Tools.toId(userid);
        return mutedUsers.includes(userid);
    }

    isVoice(userid: string): boolean {
        userid = Tools.toId(userid);
        const rank = this.getRoomRank(userid);
        if (!Tools.rankSymbols.includes(rank)) return true;
        return rank === "+";
    }

    isDriver(userid: string): boolean {
        userid = Tools.toId(userid);
        if (!this.isExist) return false;
        return this.auth["%"]?.includes(userid) ?? false;
    }

    isMod(userid: string): boolean {
        userid = Tools.toId(userid);
        if (!this.isExist) return false;
        return this.auth["@"]?.includes(userid) ?? false;
    }

    isBot(userid: string): boolean {
        userid = Tools.toId(userid);
        if (!this.isExist) return false;
        return this.auth["*"]?.includes(userid) ?? false;
    }

    isOwner(userid: string): boolean {
        userid = Tools.toId(userid);
        if (!this.isExist) return false;
        return this.auth["#"]?.includes(userid) ?? false;
    }

    isRoomStaff(userid: string): boolean {
        if (!this.isExist) return false;
        return this.isDriver(userid) || this.isMod(userid) || this.isOwner(userid);
    }

    isStaff(user: User): boolean {
        if (this.isExist) {
            if (user.online) return user.isGlobalStaff || this.isRoomStaff(user.userid);
            else return this.isRoomStaff(user.userid);
        }
        return false;
    }

    getOnlineStaffs(ignoreGlobals?: boolean): Collection<string, User> {
        return this.userCollection.filter((u) => {
            if (!this.isStaff(u)) return false;
            if (ignoreGlobals) {
                if (!this.isRoomStaff(u.userid)) return false;
                else return true;
            } else return true;
        });
    }
}

import * as Tools from "./Tools";
import { User as UserClass } from "./User";

import type { RoomOptions, HTMLOptions } from "../types/Room";
import type { Client } from "./Client";
import type { User } from "./User";
import type { Message } from "./Message";
import type { MessageWaits, awaitMessageOptions, RoomMessageOptions } from "../types/Message";
import type { GroupSymbol, AuthLevel } from "../types/UserGroups";

export class Room {
    id: string;
    roomid: string | null;
    title: string | null;
    type: "chat" | "battle" | "html";
    visibility: "public" | "hidden" | "secret" | null;
    modchat: AuthLevel | null;
    modjoin: AuthLevel | null;
    auth: {
        [key: string]: string[];
    } | null;
    users: string[] | null;
    waits: MessageWaits<Room>[];
    readonly isExist: boolean;
    readonly client: Client;

    constructor(init: RoomOptions, client: Client) {
        this.id = init.id;
        this.roomid = init.roomid || null;
        this.title = init.title || null;
        this.type = init.id?.startsWith("view-") ? "html" : init.type;
        this.visibility = init.visibility || null;
        this.modchat = init.modchat || null;
        this.modjoin = init.modjoin || null;
        this.auth = init.auth || null;
        this.users = init.users || null;
        this.waits = init.waits ?? [];
        this.isExist = init.error ? false : true;
        this.client = client;
    }

    send(content: RoomMessageOptions): Promise<Message<Room>> | void {
        return this.client.sendRoom(this.roomid!, content);
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
                Object.keys(arg as awaitMessageOptions<Room>).length === 4
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

    getRank(userid: string): GroupSymbol {
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

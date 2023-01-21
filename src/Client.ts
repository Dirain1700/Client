"use strict";

import * as https from "https";
import { EventEmitter } from "node:events";
import * as url from "url";
import * as util from "util";
import { WebSocket } from "ws";
import * as querystring from "querystring";
import { Tools } from "./Tools";
import { ClientUser } from "./ClientUser";
import { Message } from "./Message";
import { Room } from "./Room";
import { User } from "./User";
import { Tournament } from "./Tour";
import { TimeoutError, AccessError } from "./Error";

import type { ClientOptions as wsClientOptions } from "ws";
import type { IncomingMessage } from "http";
import type {
    ClientOptions,
    ClientEvents,
    ClientEventNames,
    PromisedRoom,
    PromisedUser,
    StatusType,
    ServerConfig,
    PostLoginOptions,
    PendingMessage,
} from "../types/Client";
import type { UserOptions } from "../types/User";
import type { RoomOptions, RankHTMLOptions, PrivateHTMLOptions, HTMLOptions } from "../types/Room";
import type { TourUpdateData, EliminationBracket, RoundRobinBracket, TourEndData } from "../types/Tour";
import type { MessageInput, UserMessageOptions, RoomMessageOptions } from "./../types/Message";

const MAIN_HOST = "sim3.psim.us";
const Events: ClientEventNames = {
    READY: "ready",
    QUERY_RESPONSE: "queryResponse",
    RAW_DATA: "rawData",
    MESSAGE_CREATE: "messageCreate",
    COMMAND_EMIT: "commandEmit",
    MESSAGE_DELETE: "messageDelete",
    ROOM_USER_ADD: "roomUserAdd",
    ROOM_USER_REMOVE: "roomUserRemove",
    USER_RENAME: "userRename",
    CLIENT_ROOM_ADD: "clientRoomAdd",
    CLIENT_ROOM_REMOVE: "clientRoomRemove",
    TOUR_CREATE: "tourCreate",
    TOUR_UPDATE: "tourUpdate",
    TOUR_UPDATE_END: "tourUpdateEnd",
    TOUR_JOIN: "tourJoin",
    TOUR_LEAVE: "tourLeave",
    TOUR_REPLACE: "tourReplace",
    TOUR_BATTLE_START: "tourBattleStart",
    TOUR_BATTLE_END: "tourBattleEnd",
    TOUR_START: "tourStart",
    TOUR_END: "tourEnd",
    OPEN_HTML_PAGE: "openHtmlPage",
    CLOSE_HTML_PAGE: "closeHtmlPage",
    CHAT_ERROR: "chatError",
    CLIENT_ERROR: "error",
};

export class Client extends EventEmitter {
    private readonly options: ClientOptions = {};
    private loggedIn: boolean = false;
    readonly serverURL: string = "play.pokemonshowdown.com";
    readonly serverId: string = "showdown";
    readonly actionURL = new url.URL("https://play.pokemonshowdown.com/~~showdown/action.php");
    readonly mainServer: string = "play.pokemonshowdown.com";
    readonly messageThrottle = 3;
    throttleInterval: 25 | 100 | 600 = 600;
    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    webSocket: any;
    private _autoReconnect: NodeJS.Timeout = setTimeout(() => null, 0);
    events = Events;
    rooms: {
        cache: Map<string, Room>;
        raw: Map<string, RoomOptions>;
        fetch: (roomid: string, force?: boolean) => Promise<Room>;
    };
    users: {
        cache: Map<string, User>;
        raw: Map<string, UserOptions>;
        fetch: (userid: string, useCache?: boolean) => Promise<User>;
    };
    user: ClientUser | null;
    status: StatusType = {
        connected: false,
        loggedIn: false,
        name: "",
        id: "",
    };
    connected: boolean = false;
    closed: boolean = true;
    trusted: boolean = false;
    formats: {
        [key: string]: string[];
    } = {};

    private sendTimer: NodeJS.Timeout | undefined = undefined;
    outGoingMessage: string[] = [];
    private userdetailsQueue: PromisedUser[] = [];
    private roominfoQueue: PromisedRoom[] = [];
    resolvedRoom: string[] = [];
    resolvedUser: string[] = [];
    private PromisedPM: PendingMessage<Message<User>>[] = [];
    private PromisedChat: PendingMessage<Message<Room>>[] = [];
    private challstr: { key: string; value: string } = { key: "", value: "" };

    constructor(options: ClientOptions) {
        super();
        options.retryLogin ||= 10 * 1000;
        options.autoReconnect ||= 30 * 1000;
        this.options = options;
        const defineOptions = {
            enumerable: false,
            writable: true,
        };
        Object.defineProperties(this, {
            options: defineOptions,
            sendTimer: defineOptions,
            userdetailsQueue: defineOptions,
            roominfoQueue: defineOptions,
            outGoingMessage: defineOptions,
            resolvedRoom: defineOptions,
            resolvedUser: defineOptions,
            PromisedPM: defineOptions,
            PromisedChat: defineOptions,
            challstr: defineOptions,
        });
        this.user = null;
        this.rooms = { cache: new Map(), raw: new Map(), fetch: this.fetchRoom };
        this.users = { cache: new Map(), raw: new Map(), fetch: this.fetchUser };
    }

    /* eslint-disable @typescript-eslint/no-explicit-any */
    public on<T extends keyof ClientEvents>(event: T, listener: (...args: ClientEvents[T]) => void): this;
    public on<U extends string | symbol>(
        event: Exclude<U, keyof ClientEvents>,
        listener: (...args: any[]) => void
    ): this;
    public on<K extends keyof ClientEvents | string | symbol>(
        event: K extends keyof ClientEvents ? K : Exclude<K, keyof ClientEvents>,
        listener: (...args: any[]) => void
    ): this {
        return super.on(event, listener);
    }

    public once<T extends keyof ClientEvents>(event: T, listener: (...args: ClientEvents[T]) => void): this;
    public once<U extends string | symbol>(
        event: Exclude<U, keyof ClientEvents>,
        listener: (...args: any[]) => void
    ): this;
    public once<K extends keyof ClientEvents | string | symbol>(
        event: K extends keyof ClientEvents ? K : Exclude<K, keyof ClientEvents>,
        listener: (...args: any[]) => void
    ): this {
        return super.once(event, listener);
    }

    public emit<T extends keyof ClientEvents>(event: T, ...args: ClientEvents[T]): boolean;
    // prettier-ignore
    public emit<U extends string | symbol>(
        event: Exclude<U, keyof ClientEvents>,
        ...args: unknown[]
    ): boolean;
    public emit<K extends keyof ClientEvents | string | symbol>(
        event: K extends keyof ClientEvents ? K : Exclude<K, keyof ClientEvents>,
        ...args: K extends keyof ClientEvents ? ClientEvents[K] : unknown[]
    ): boolean {
        return super.emit(event, ...args);
    }
    /* eslint-enable */

    public connect(): void {
        const httpsOptions = {
            hostname: this.mainServer,
            path:
                "/crossdomain.php?" +
                querystring.stringify({
                    host: this.serverURL,
                    path: "",
                }),
            method: "GET",
            headers: {
                "Cache-Control": "no-cache",
            },
        };

        console.log("Trying to connect to the server " + this.serverURL + "...");
        https
            .get(httpsOptions, (response: IncomingMessage) => {
                response.setEncoding("utf8");
                let data: string = "";
                response.on("data", (chunk: string) => {
                    data += chunk;
                });
                response.on("end", () => {
                    const configData = data.split("var config = ")[1];
                    if (configData) {
                        let config = JSON.parse(configData.split(";")[0] as string) as ServerConfig | string;

                        if (typeof config === "string") config = JSON.parse(config) as ServerConfig;
                        if (config.host) {
                            let address: string;
                            if (config.host === "showdown") {
                                address = "wss://" + MAIN_HOST + "/showdown/websocket";
                            } else {
                                address = "ws://" + config.host + ":" + (config.port || 8000) + "/showdown/websocket";
                            }

                            const wsOptions: wsClientOptions = {
                                maxPayload: 8 * 100 * 1024 * 1024,
                                perMessageDeflate: false,
                                headers: {
                                    "Cache-Control": "no-cache",
                                    "User-Agent": "ws",
                                },
                            };

                            this.webSocket = new WebSocket(address, [], wsOptions);
                            this.connected = true;
                            this.closed = false;
                            this.setEventListeners();

                            this.webSocket.on("message", (message: Buffer) => {
                                this.onMessage(message.toString());
                            });

                            this.webSocket.on("close", () => {
                                if (!this.closed) this._autoReconnect = setInterval(() => this.connect(), 1000 * 30);
                            });
                        }
                    } else console.log("Error: failed to get data for server " + this.serverURL);
                });
            })
            .on("error", (error) => {
                console.error("Error: " + error.message);
            });
    }

    public logout(): void {
        this.disconnect();
    }

    public disconnect(): void {
        this.connected = false;
        this.loggedIn = false;
        this.closed = true;
        this.webSocket.close();
    }

    private setEventListeners(): void {
        if (this.options.openListener)
            this.webSocket.addEventListener(
                "open",
                this.options.openListener.function,
                this.options.openListener.options ?? {}
            );
        if (this.options.messageListener)
            this.webSocket.addEventListener(
                "message",
                this.options.messageListener.function,
                this.options.messageListener.options ?? {}
            );
        if (this.options.closeListener)
            this.webSocket.addEventListener(
                "close",
                this.options.closeListener.function,
                this.options.closeListener.options ?? {}
            );
        if (this.options.errorListener)
            this.webSocket.addEventListener(
                "error",
                this.options.errorListener.function,
                this.options.errorListener.options ?? {}
            );
        if (this.options.customListener) {
            for (const Listener of this.options.customListener) {
                this.webSocket.addEventListener(Listener.event, Listener.function, Listener.options ?? {});
            }
        }
    }

    private setMessageInterval(): void {
        const isPublicBot: boolean = (() => {
            if (!this.user) return false;
            return this.user.group === "*" ? true : Object.keys(this.user.rooms ?? {}).some((r) => r.startsWith("*"));
        })();

        const isTrusted: boolean = (() => {
            if (!this.user) return false;
            return this.user?.trusted ?? false;
        })();

        this.throttleInterval = isPublicBot ? 25 : isTrusted ? 100 : 600;
    }

    private login(name: string, password?: string): void {
        const options: PostLoginOptions = {
            hostname: this.actionURL.hostname,
            path: this.actionURL.pathname,
            agent: false,
            method: "",
        };
        let postData: string = "";
        if (password) {
            options.method = "POST";
            postData = querystring.stringify({
                serverid: this.serverId,
                act: "login",
                name: name,
                pass: password,
                challengekeyid: this.challstr.key,
                challenge: this.challstr.value,
            });
            options.headers = {
                "Content-Type": "application/x-www-form-urlencoded",
                "Content-Length": postData.length,
            };
        } else {
            options.method = "GET";
            options.path +=
                "?" +
                querystring.stringify({
                    serverid: this.serverId,
                    act: "getassertion",
                    userid: Tools.toId(name),
                    challstr: `${this.challstr.key}|${this.challstr.value}`,
                });
        }

        const client = this;
        const request = https.request(options, (response: IncomingMessage) => {
            response.setEncoding("utf8");
            //eslint-disable-next-line @typescript-eslint/no-explicit-any
            let data: any = "" as string;
            response.on("data", (chunk: string) => (data += chunk));
            response.on("end", function () {
                if (data.length < 50) {
                    if (data === ";")
                        console.log("Failed to login. Specified account is registered or wrong password.");
                    else console.error("Failed to login: " + data);
                    if (client.options.retryLogin) {
                        console.log(`Retrying login in ${client.options.retryLogin / 1000}s.`);
                        setTimeout(client.login.bind(client), client.options.retryLogin, name, password);
                    }
                    return;
                }
                if (data.includes("heavy load")) {
                    console.log("The login server is under heavy load.");
                    if (client.options.retryLogin) {
                        console.log(`Retrying login in ${client.options.retryLogin / 1000}s.`);
                        setTimeout(client.login.bind(client), client.options.retryLogin, name, password);
                    }
                    return;
                }
                try {
                    data = JSON.parse(data.substring(1));
                    if (data.actionsuccess) data = data.assertion;
                    else {
                        console.error(`Unable to login: ${JSON.stringify(data)}`);
                        if (client.options.retryLogin) {
                            console.log(`Retrying login in ${client.options.retryLogin / 1000}s.`);
                            setTimeout(client.login.bind(client), client.options.retryLogin, name, password);
                        }
                        return;
                    }
                    //eslint-disable-next-line no-empty
                } catch (e) {}
                console.log("Sending login trn...");
                client.send(`|/trn ${name},0,${data}`);
                setInterval(client.upkeep.bind(client), 10 * 60 * 1000);
            });
        });
        request.on("error", function (err) {
            console.error(`Login error: ${util.inspect(err)}`);
            if (client.options.retryLogin) {
                console.log(`Retrying login in ${client.options.retryLogin / 1000}s.`);
                setTimeout(client.login.bind(client), client.options.retryLogin, name, password);
            }
            return;
        });
        if (postData) request.write(postData);
        request.end();
    }

    upkeep(): void {
        const upkeepURL: string = `https://play.pokemonshowdown.com/action.php?act=upkeep&challstr=${this.challstr.key}|${this.challstr.value}`;
        https.get(upkeepURL, (response: IncomingMessage) => {
            response.setEncoding("utf8");

            let data: string = "";
            let ended: boolean = false;
            response.on("data", (chunk: string) => {
                data += chunk;
            });

            response.on("end", async () => {
                ended = true;
                if ((response.statusCode ?? 200) >= 400) {
                    this.emit(Events.CLIENT_ERROR, data);
                    this.disconnect();
                    await Tools.sleep(5000);
                    this.connect();
                    this._autoReconnect = setInterval(() => this.connect(), 1000 * 30);
                }
            });

            setTimeout(async () => {
                if (ended) return;
                this.disconnect();
                await Tools.sleep(5000);
                this.connect();
                this._autoReconnect = setInterval(() => this.connect(), 1000 * 30);
            }, 15 * 1000);
        });
    }

    private runOutGoingMessage(): void {
        if (!this.outGoingMessage.length) {
            clearTimeout(this.sendTimer);
            this.sendTimer = undefined;
        }
        const arr = this.outGoingMessage.splice(
            0,
            this.outGoingMessage.length <= this.messageThrottle ? this.outGoingMessage.length : this.messageThrottle
        );
        arr.forEach((e) => this.webSocket.send(e));
    }

    send(content: string | string[], code?: boolean): void {
        if (Array.isArray(content)) return void content.forEach((e) => this.send(e, code));
        if (!code && content.match(/\\n/g)) content.split("\n").forEach((e) => this.outGoingMessage.push(e));
        else this.outGoingMessage.push(content);
        if (!this.sendTimer) this.sendTimer = setInterval(() => this.runOutGoingMessage(), this.throttleInterval);
    }

    sendUser(user: string, input: string | UserMessageOptions): Promise<Message<User>> | void {
        let str: string = "";
        if (typeof input === "string") str += input;
        else str += input.content;

        user = Tools.toId(user);

        this.send(`|/pm ${user},${str}`);
        if (str.startsWith("/")) return;
        const client = this;
        return new Promise((resolve, reject) => {
            const PM: PendingMessage<Message<User>> = {
                id: user,
                resolve: (message: Message<User>) => {
                    resolve(message);
                    client.PromisedPM = client.PromisedPM.filter((e) => e.id !== user);
                },
                reject: function (reason: TimeoutError) {
                    if (!client.PromisedPM.includes(this)) return;
                    reject(reason);
                    client.PromisedPM = client.PromisedPM.filter((e) => e.id !== user);
                },
            };
            client.PromisedPM.push(PM);
            setTimeout(PM.reject, 3 * 1000, new TimeoutError(`sendUser: ${user}, content: ${str})`));
        });
    }

    sendRoom(room: string, input: RoomMessageOptions): Promise<Message<Room>> | void {
        let str: string = "";
        if (typeof input === "string") str += input!;
        else {
            const { id, content, edit, box } = input;
            if (edit && box) throw new TypeError("You cannot edit HTML box.");

            //eslint-disable-next-line no-inner-declarations
            function hasAllowedDisplay(init: HTMLOptions): init is RankHTMLOptions {
                return Object.keys(init as RankHTMLOptions).includes("allowedDisplay");
            }
            //eslint-disable-next-line no-inner-declarations
            function isPrivate(init: HTMLOptions): init is PrivateHTMLOptions {
                return Object.keys(init as PrivateHTMLOptions).includes("Private");
            }
            if (hasAllowedDisplay(input)) {
                const { allowedDisplay } = input;
                if (!box) str += `/${edit ? "change" : "add"}rankuhtml ${allowedDisplay},`;
                else str += `/addrankhtmlbox ${allowedDisplay},`;
            } else if (isPrivate(input)) {
                const { private: name } = input;
                if (!box) str += `/${edit ? "change" : "send"}privateuhtml ${name},`;
                else str += `/sendprivatehtmlbox ${name},`;
            } else {
                if (!box) str += `/${edit ? "change" : "add"}uhtml ${id},`;
                else str += "/addhtmlbox";
            }
            if (!box) str += `${id},`;
            str += content;
        }

        room = Tools.toRoomId(room);
        this.send(`${room}|${str}`);
        if (str.startsWith("/")) return;
        const client = this;
        return new Promise((resolve, reject) => {
            const chat: PendingMessage<Message<Room>> = {
                id: room,
                resolve: (message: Message<Room>) => {
                    resolve(message);
                    client.PromisedChat = client.PromisedChat.filter((e) => e.id !== room);
                },
                reject: function (reason: TimeoutError) {
                    if (!client.PromisedChat.includes(this)) return;
                    reject(reason);
                    client.PromisedChat = client.PromisedChat.filter((e) => e.id !== room);
                },
            };
            client.PromisedChat.push(chat);
            setTimeout(chat.reject, 3 * 1000, new TimeoutError(`sendRoom(roomid: ${room}, content: ${str})`));
        });
    }

    joinRoom(roomid: string): Promise<Room> {
        roomid = Tools.toRoomId(roomid);
        if (!roomid) throw new Error("Room ID should not be empty.");
        this.send("|/j " + roomid);
        const client = this;
        //eslint-disable-next-line no-async-promise-executor
        return new Promise(async (resolve, reject) => {
            await Tools.sleep(client.throttleInterval);
            client.fetchRoom.bind(client)(roomid, true).then(resolve).catch(reject);
        });
    }

    leaveRoom(roomid: string): Room {
        roomid = Tools.toRoomId(roomid);
        if (!roomid) throw new Error("Room ID should not be empty.");
        const room = this.rooms.cache.get(roomid);
        if (!room) throw new Error(`Room "${roomid}" does not exist.`);
        this.send("|/l " + roomid);
        return room;
    }

    async onMessage(message: string): Promise<void> {
        const lines: string[] = message.trim().split("\n");
        let roomid: string;
        if (lines[0]!.startsWith(">")) {
            roomid = lines[0]!.substring(1).trim();
            lines.shift();
        } else roomid = "defaultRoom";

        const room: Room | null =
            roomid === "defaultRoom"
                ? null
                : new Room(
                      {
                          id: roomid,
                          roomid: roomid,
                          type: roomid.startsWith("battle-") ? "battle" : roomid.startsWith("view-") ? "html" : "chat",
                      },
                      this
                  );

        if (room && room.type === "chat") this.fetchRoom(room.id, false).catch(() => this.rooms.cache.get(room.id));

        for (let i = 0; i < lines.length; i++) {
            const line: string | undefined = lines[i]!.trim();
            if (!line) continue;

            try {
                this.parseMessage(line!, room);

                if (line.startsWith("|init|")) {
                    const page = room!.type === "html";
                    const chat = !page && room!.type === "chat";
                    for (let n = i + 1; n < lines.length; n++) {
                        let nextLine: string = lines[n]!.trim();
                        if (page) {
                            if (nextLine!.startsWith("|pagehtml|")) {
                                this.parseMessage(nextLine, room!);
                                break;
                            }
                        } else if (chat) {
                            if (nextLine!.startsWith("|users|")) {
                                this.parseMessage(nextLine.trim(), room!);
                                for (let p = n + 1; p < lines.length; p++) {
                                    nextLine = lines[p]!.trim();
                                    // prettier-ignore
                                    if (
                                        nextLine.startsWith("|raw|<div class=\"infobox infobox-roomintro\">") &&
                                        nextLine.endsWith("</div>")
                                    ) {
                                        this.parseMessage(nextLine!, room);
                                        continue;
                                        // prettier-ignore
                                    } else if (
                                        nextLine.startsWith("|raw|<div class=\"broadcast-blue\">") &&
                                        nextLine.endsWith("</div>")
                                    ) {
                                        this.parseMessage(nextLine, room!);
                                        continue;
                                    } else if (nextLine.startsWith("|:|")) {
                                        this.parseMessage(nextLine, room!);
                                        continue;
                                    }
                                }
                            }
                            break;
                        }
                    }

                    if (page || chat) return;
                }
            } catch (e) {
                console.error(e);
            }
        }
    }

    async parseMessage(rawMessage: string, room: Room | null | undefined): Promise<void> {
        const eventName: string = rawMessage.split("|")[1] as string;
        const event: string[] = rawMessage.split("|").slice(2)!;

        function isRoomNotEmp(r: Room | null | undefined): r is Room {
            return r instanceof Room;
        }

        switch (eventName) {
            case "raw": {
                if (!isRoomNotEmp(room)) return;
                this.emit(Events.RAW_DATA, event.join("|")!, room);
                break;
            }
            case "formats": {
                let key: string = "";
                let valueArr: string[] = [];
                let i = 1;
                for (const format of event.slice(1)!) {
                    i++;
                    if (!format.startsWith("[")) {
                        if (valueArr.length) this.formats[key] = valueArr;
                        key = format;
                        valueArr = [];
                    } else valueArr.push(format.split(",")[0]!);
                    if (i === event.slice(1)!.length) this.formats[key] = valueArr;
                }
                break;
            }

            case "updateuser": {
                this.status.name = event[0]!.substring(1) as string;
                this.status.id = Tools.toId(this.status.name);
                if (!event[0]!.startsWith(" Guest")) {
                    clearTimeout(this._autoReconnect);
                    this.status.loggedIn = true;
                    this.send("|/ip");
                    if (this.options.autoJoin)
                        this.send(this.options.autoJoin.map((r: string) => "|/j " + Tools.toRoomId(r)));
                    if (this.options.avatar) this.send(`|/avatar ${this.options.avatar as string | number}`);
                    if (this.options.status) this.send(`|/status ${this.options.status as string}`);
                    await Tools.sleep(this.throttleInterval);
                    if (this.status.id) await this.fetchUser(this.status.id, true);
                    if (this.user) this.user.settings = JSON.parse(event[3] as string);
                    this.emit(Events.READY);
                }
                break;
            }
            case "challstr": {
                this.challstr = {
                    key: event[0]!,
                    value: event[1]!,
                };
                for (const id of ["~", "&"]) {
                    this.users.cache.set(
                        id,
                        new User(
                            {
                                id: id,
                                userid: id,
                                name: id,
                                rooms: false,
                            },
                            this
                        )
                    );
                }

                if (!this.options.name) break;
                if (this.options.pass) this.login(this.options.name, this.options.pass);
                else this.login(this.options.name);
                break;
            }
            case "init": {
                if (!isRoomNotEmp(room)) return;
                this.fetchUser((this.user as ClientUser)?.userid ?? this.status.id!, true);
                if (room.id.startsWith("view-")) this.emit(Events.OPEN_HTML_PAGE, room);
                else {
                    room = await this.fetchRoom(room.id).catch(() => room);
                    if (!isRoomNotEmp(room)) return;
                    this.emit(Events.CLIENT_ROOM_ADD, room);
                }
                break;
            }
            case "deinit": {
                if (!isRoomNotEmp(room)) return;
                this.fetchUser((this.user as ClientUser)?.userid ?? this.status.id!, false);
                if (room.id.startsWith("view-")) this.emit(Events.CLOSE_HTML_PAGE, room!);
                else this.emit(Events.CLIENT_ROOM_REMOVE, room!);

                if (this.rooms.cache.has(room.id)) this.rooms.cache.delete(room!.id);
                break;
            }
            case "html": {
                if (this.status.loggedIn) {
                    //prettier-ignore
                    if (rawMessage.includes("<small style=\"color:gray\">(trusted)</small>")) {
                        this.trusted = true;
                        if (this.user) this.user.trusted = true;
                    }
                    this.setMessageInterval();
                }
                break;
            }
            case "queryresponse": {
                const client = this;
                switch (event[0]) {
                    case "roominfo": {
                        let roominfo: RoomOptions | undefined = undefined;
                        try {
                            roominfo = JSON.parse(event.slice(1).join("|")) as RoomOptions;
                        } catch (e: unknown) {
                            console.error(`Error in parsing roominfo: ${(e as SyntaxError).message}`);
                        }
                        if (!roominfo || !roominfo.id) return;
                        this.rooms.raw.set(roominfo.id, roominfo);
                        if (roominfo.users && !this.rooms.cache.has(roominfo.id)) {
                            await Tools.sleep(this.throttleInterval);
                            await this.send(
                                roominfo.users
                                    .filter((u) => !client.users.cache.has(Tools.toId(u)))
                                    .map((u) => `|/cmd userdetails ${Tools.toId(u)}`)
                            );
                        }

                        const PendingRoom: PromisedRoom[] = this.roominfoQueue.filter((r) => r.id === roominfo!.id);
                        if (!PendingRoom.length) return;
                        if (roominfo.error) {
                            if (roominfo.id.startsWith("view-")) {
                                delete roominfo.error;
                                roominfo = {
                                    id: roominfo.id,
                                    roomid: roominfo.id,
                                    type: "html",
                                };
                            } else {
                                roominfo.type = "chat";
                                PendingRoom.forEach((e) => e.reject(roominfo!));
                            }

                            break;
                        }

                        PendingRoom.forEach((e) => e.resolve(this.addRoom(roominfo!)));
                        break;
                    }
                    case "userdetails": {
                        let userdetails: UserOptions | undefined = undefined;
                        try {
                            userdetails = JSON.parse(event.slice(1).join("|")) as UserOptions;
                        } catch (e: unknown) {
                            console.error(`Error in parsing userdetails: ${(e as SyntaxError).message}`);
                        }
                        if (!userdetails || !userdetails.userid) return;
                        this.users.raw.set(userdetails.id, userdetails);
                        if (userdetails.id === this.status.id!) {
                            if (this.user) Object.assign(this.user, userdetails);
                            else this.user = new ClientUser(userdetails, client);
                            this.setMessageInterval();
                        }
                        const user = this.addUser(userdetails);
                        if (!user) return;
                        const PendingUser: PromisedUser[] = this.userdetailsQueue.filter(
                            (u) => u.id === userdetails!.id
                        );
                        if (!PendingUser.length) break;
                        PendingUser.forEach((e) => e.resolve(user));
                        break;
                    }
                }
                this.emit(Events.QUERY_RESPONSE, event.slice(1).join("|"));
                break;
            }
            case "chat":
            case "c": {
                if (!isRoomNotEmp(room)) return;
                if (!event[0] || !Tools.toId(event[0])) break;
                room = this.rooms.cache.get(room.id) ?? room;
                const author = await this.fetchUser(event[0] as string, false),
                    content = event.slice(1).join("|") as string,
                    message = new Message<Room>({
                        author: author,
                        content: content,
                        type: "Room",
                        target: room,
                        raw: rawMessage,
                        time: Date.now(),
                        client: this,
                    } as MessageInput<Room>);
                if (!this.user) return;
                for (const element of this.PromisedChat) {
                    if (element.id === message.target.roomid && this.user!.userid === message.author.userid) {
                        element.resolve(message);
                        break;
                    }
                }
                this.emit(Events.MESSAGE_CREATE, message);
                break;
            }

            case "c:": {
                if (!isRoomNotEmp(room)) return;
                room = this.rooms.cache.get(room.id);
                if (!isRoomNotEmp(room)) return;
                const by = await this.fetchUser(event[1] as string, true),
                    value = event.slice(2).join("|"),
                    message = new Message<Room>({
                        author: by,
                        content: value,
                        type: "Room",
                        target: room,
                        raw: rawMessage,
                        client: this,
                        time: parseInt(event[0] as string),
                    } as MessageInput<Room>);
                if (this.user) {
                    for (const element of this.PromisedChat) {
                        if (element.id === message.target.roomid && this.user!.userid === message.author.userid) {
                            element.resolve(message);
                            break;
                        }
                    }
                }
                this.emit(Events.MESSAGE_CREATE, message);
                if (this.options.prefix && value.startsWith(this.options.prefix)) this.emit(Events.COMMAND_EMIT);
                break;
            }

            case "pm": {
                if (!event[0] || !event[1] || !Tools.toId(event[0]) || !Tools.toId(event[1])) {
                    const value = event.slice(2).join("|") as string;
                    if (!this.trusted && value.startsWith("/raw ") && this.status.loggedIn) {
                        //prettier-ignore
                        if (value.includes("<small style=\"color:gray\">(trusted)</small>")) this.trusted = true;
                        else this.trusted = false;
                        if (this.user) this.user.trusted = this.trusted;

                        this.setMessageInterval();
                    }
                    break;
                }
                const author = await this.fetchUser(event[0] as string, true),
                    sendTo = await this.fetchUser(event[1] as string, true),
                    value = event.slice(2).join("|") as string;
                let target: User;
                if (author.id === this.status.id) target = sendTo;
                else target = author;
                const message = new Message<User>({
                    author: author,
                    content: value,
                    type: "PM",
                    target: target,
                    raw: rawMessage,
                    client: this,
                    time: Date.now(),
                } as MessageInput<User>);
                this.emit(Events.MESSAGE_CREATE, message);
                if (this.options.prefix && value.startsWith(this.options.prefix)) this.emit(Events.COMMAND_EMIT);

                if (!this.user) break;
                for (const element of this.PromisedPM) {
                    if (element.id === message.target.userid && this.user.userid === message.author.userid) {
                        element.resolve(message);
                        break;
                    }
                }
                break;
            }

            case "j":
            case "J":
            case "join": {
                if (!isRoomNotEmp(room)) return;
                const user = await this.fetchUser(Tools.toId(event.join("|")), true);
                room = await this.fetchRoom(room.id, false).catch(() => room as Room);
                this.emit(Events.ROOM_USER_ADD, room, user);
                break;
            }

            case "l":
            case "L":
            case "leave": {
                if (!isRoomNotEmp(room)) return;
                const user = await this.fetchUser(Tools.toId(event.join("|")), true);
                room = await this.fetchRoom(room.id, false).catch(() => room as Room);
                this.emit(Events.ROOM_USER_REMOVE, room, user);
                break;
            }

            case "n":
            case "N":
            case "name": {
                const Old = Tools.toId(event[1] as string),
                    New = await this.fetchUser(Tools.toId(event[0] as string), true);
                if (!this.users.cache.has(Old)) break;

                const user =
                    this.users.cache.get(Old) ?? new User({ id: Old, userid: Old, name: Old, rooms: false }, this);
                New.alts.push(Old);
                this.users.cache.set(New.userid, New);
                this.emit(Events.USER_RENAME, New, user);
                this.users.cache.delete(Old);
                break;
            }

            case "error": {
                const error = event.join("|");
                this.emit(Events.CHAT_ERROR, error, room ?? null);
                break;
            }

            case "tournament": {
                if (!isRoomNotEmp(room)) return;
                room = this.rooms.cache.get(room.id);
                if (!isRoomNotEmp(room)) return;
                const tourEventName = event[0]!;
                const tourEvent = event.slice(1);
                switch (tourEventName) {
                    case "create": {
                        const format = tourEvent[0]!,
                            type = tourEvent[1]!;
                        let playerCap: number = parseInt(tourEvent[2] ?? "");
                        if (!playerCap || Number.isNaN(playerCap)) playerCap = 0;
                        const isElim = type.endsWith("Elimination");
                        let tour: Tournament<EliminationBracket | RoundRobinBracket>;
                        if (isElim) tour = new Tournament<EliminationBracket>(format, type, playerCap ?? 0, room);
                        else tour = new Tournament<RoundRobinBracket>(format, type, playerCap ?? 0, room);
                        room.tour = tour;
                        this.rooms.cache.set(room.id, room);

                        this.emit(Events.TOUR_CREATE, room, format, type, playerCap);
                        break;
                    }

                    case "update": {
                        const data: TourUpdateData = JSON.parse(tourEvent[0]!);
                        if (room.tour) room.tour.update(data);

                        this.emit(Events.TOUR_UPDATE, room, data);
                        break;
                    }

                    case "updateEnd": {
                        this.emit(Events.TOUR_UPDATE_END, room);
                        break;
                    }

                    case "start": {
                        const numPlayers = parseInt(tourEvent[0]!);
                        if (room.tour) room.tour.onStart();
                        this.emit(Events.TOUR_START, room, numPlayers);
                        break;
                    }

                    case "join": {
                        const user: string = tourEvent.join("|");
                        if (room.tour) room.tour.addPlayer(user);
                        this.emit(Events.TOUR_JOIN, room, this.getUser(user)!);
                        break;
                    }

                    case "leave":
                    case "disqualify": {
                        const user: string = tourEvent.join("|");
                        if (room.tour) room.tour.removePlayer(user);
                        this.emit(Events.TOUR_LEAVE, room, this.getUser(user)!);
                        break;
                    }

                    case "replace": {
                        const user1 = tourEvent[0]!,
                            user2 = tourEvent[1]!;
                        if (room.tour) {
                            room.tour.removePlayer(user1);
                            room.tour.addPlayer(user2);
                        }
                        this.emit(Events.TOUR_REPLACE, room, this.getUser(user1), this.getUser(user2));
                        break;
                    }

                    case "battlestart": {
                        const user1 = tourEvent[0]!,
                            user2 = tourEvent[1]!,
                            battleRoom = tourEvent[2]!;
                        this.emit(Events.TOUR_BATTLE_START, room, this.getUser(user1), this.getUser(user2), battleRoom);
                        break;
                    }

                    case "battleend": {
                        const user1 = tourEvent[0]!,
                            user2 = tourEvent[1]!,
                            result = tourEvent[2] as "win" | "loss" | "draw",
                            rawScore = tourEvent[3] as string,
                            recorded = tourEvent[4] as "success" | "fail",
                            battleRoom = tourEvent[2]!;
                        const score = rawScore.split(",").map((e) => parseInt(Tools.toId(e))) as [number, number];

                        this.emit(
                            Events.TOUR_BATTLE_END,
                            room,
                            this.getUser(user1)!,
                            this.getUser(user2)!,
                            result,
                            score,
                            recorded,
                            battleRoom
                        );
                        break;
                    }

                    case "end": {
                        const data: TourEndData = JSON.parse(tourEvent[0]!);
                        if (room.tour) {
                            room.tour.update(data);
                            room.tour.onEnd(false);
                        }
                        this.emit(Events.TOUR_END, room, data, false);
                        break;
                    }

                    case "forceend": {
                        if (room.tour) room.tour.onEnd(true);
                        this.emit(Events.TOUR_END, room, null, true);
                    }
                }
                break;
            }

            default:
                this.emit(eventName as string, event);
        }
    }

    fetchUser(userid: string, useCache?: boolean): Promise<User> {
        const client = this;
        return new Promise((resolve) => {
            if (userid.length === 1 && ["&", "~"].includes(userid)) return resolve(client.getUser("&")!);

            userid = Tools.toId(userid);

            const time = Date.now().toString();
            const user = {
                id: userid,
                time: time,
                resolve: (user: User) => {
                    resolve(user);
                    client.userdetailsQueue = client.userdetailsQueue.filter((e) => e.id !== userid && e.time !== time);
                },
            };

            client.send(`|/cmd userdetails ${userid}`);
            client.userdetailsQueue.push(user);
            if (useCache) {
                const u: User = new User(
                    {
                        id: userid,
                        userid: userid,
                        name: userid,
                        rooms: false,
                    } as UserOptions,
                    client
                );
                setTimeout(user.resolve.bind(client), 8 * 1000, client.users.cache.get(userid) ?? u);
            }
        });
    }

    getUser(id: string): User | undefined {
        id = Tools.toId(id);
        if (this.users.cache.has(id)) return this.users.cache.get(id) as User;
        const Users: User[] = [...this.users.cache.values()];

        for (const user of Users) {
            if (user.alts.some((u) => u === id)) return user;
        }

        return;
    }

    addUser(input: UserOptions): User | null {
        if (typeof input !== "object" || !input.userid) return null;
        let user: User | undefined = this.users.cache.get(input.userid);
        if (user && input.id !== input.userid) {
            if (!user || !user.alts.includes(input.userid)) input.alts = [input.userid];
            if (!this.users.cache.has(input.userid)) {
                this.users.cache.set(
                    input.userid,
                    new User(
                        { id: input.userid, userid: input.userid, name: input.name, rooms: false, alts: [input.id] },
                        this
                    )
                );
                this.users.fetch(input.userid);
            } else {
                const altUser = this.users.cache.get(input.userid)!;
                if (!altUser.alts.includes(input.id)) altUser.alts.push(input.id);
                this.users.cache.set(altUser.id, altUser);
            }
        }
        if (!user) {
            user = new User(input, this);
            this.fetchUser(input.userid, false);
        } else {
            if (user.alts.length && input.alts?.length)
                for (const id of input.alts!) if (!user.alts.includes(id)) user.alts.push(id);
            delete input.alts;
            Object.assign(user, input);
        }
        this.users.cache.set(user!.userid, user!);
        return user as User;
    }

    fetchRoom(roomid: string, force?: boolean): Promise<Room> {
        roomid = Tools.toRoomId(roomid);
        const client = this;
        const time = Date.now().toString();
        return new Promise((resolve, reject) => {
            const r: PromisedRoom = {
                id: roomid,
                time: time,
                resolve: (room: Room) => {
                    resolve(room);
                    client.roominfoQueue = client.roominfoQueue.filter((e) => e.id !== roomid && e.time !== time);
                },
                reject: function (room: TimeoutError | RoomOptions) {
                    if (!client.roominfoQueue.includes(this)) return;
                    if (room instanceof TimeoutError) reject(room);
                    else if (room.error) {
                        if (room.error === "timeout") {
                            if (force) setTimeout(client.fetchRoom.bind(client), 5 * 1000, roomid, true);
                            else reject(new TimeoutError(`fetchRoom(roomid: ${roomid})`));
                        } else reject(new AccessError(`fetchRoom(roomid: ${roomid})`, room.error));
                    } else if (client.rooms.cache.has(roomid)) resolve(client.rooms.cache.get(roomid)!);

                    client.roominfoQueue = client.roominfoQueue.filter((e) => e.id !== roomid && e.time !== time);
                },
            };
            client.roominfoQueue.push(r);
            client.send(`|/cmd roominfo ${roomid}`);
            setTimeout(r.reject, 5 * 1000, {
                id: roomid,
                error: "timeout",
            });
        });
    }

    getRoom(roomid: string): Room | undefined {
        roomid = Tools.toRoomId(roomid);
        return this.rooms.cache.get(roomid);
    }

    addRoom(input: RoomOptions): Room {
        if (typeof input !== "object" || !input.roomid)
            throw new Error("Input must be an object with roomid for new Room");

        let room: Room | undefined = this.rooms.cache.get(input.roomid);
        if (!room) {
            room = new Room(input, this) as Room;
            this.send(`|/cmd roominfo ${input.id}`);
        } else Object.assign(room!, input);
        this.rooms.cache.set(room.roomid!, room);
        return room as Room;
    }
}

"use strict";

import { EventEmitter } from "node:events";
import * as https from "node:https";
import * as querystring from "node:querystring";
import * as url from "node:url";
import * as util from "node:util";

import { Collection } from "@discordjs/collection";
import { WebSocket } from "ws";

import { ClientUser } from "./ClientUser";
import { TimeoutError, AccessError, PSAPIError } from "./Error";
import { Message } from "./Message";
import { Room } from "./Room";
import { Tools } from "./Tools";
import { Tournament } from "./Tour";
import { User } from "./User";

import type { IncomingMessage } from "http";
import type * as ws from "ws";

import type {
    ClientOptions,
    ClientEvents,
    ClientEventNames,
    IOutGoingMessage,
    IRoomOutGoingMessageOptions,
    IUserOutGoingMessageOptions,
    PromisedRoom,
    PromisedUser,
    PendingMessage,
    StatusType,
    ServerConfig,
    PostLoginOptions,
} from "../types/Client";
import type { MessageInput } from "../types/Message";
import type { RoomOptions } from "../types/Room";
import type { TourUpdateData, EliminationBracket, RoundRobinBracket, TourEndData } from "../types/Tour";
import type { UserOptions } from "../types/User";

const MAIN_HOST = "sim3.psim.us";
const ROOM_FETCH_COOLDOWN = 5000;
const USER_FETCH_COOLDOWN = 3000;
const Events: ClientEventNames = {
    READY: "ready",
    QUERY_RESPONSE: "queryResponse",
    RAW_DATA: "rawData",
    MODCHAT: "modchat",
    MODJOIN: "modjoin",
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
    readonly upkeepURL = new url.URL("https://play.pokemonshowdown.com/api/upkeep");
    readonly loginURL = new url.URL("https://play.pokemonshowdown.com/api/login");
    readonly mainServer: string = "play.pokemonshowdown.com";
    readonly messageThrottle = 3;
    throttleInterval: 25 | 100 | 600 = 600;
    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    ws: WebSocket | null = null;
    private _autoReconnect: NodeJS.Timeout | undefined = undefined;
    events = Events;
    rooms: {
        cache: Collection<string, Room>;
        raw: Collection<string, RoomOptions>;
        fetch: (roomid: string, force?: boolean) => Promise<Room>;
    };
    users: {
        cache: Collection<string, User>;
        raw: Collection<string, UserOptions>;
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
    outGoingMessage: IOutGoingMessage<Room | User>[] = [];
    private userdetailsQueue: PromisedUser[] = [];
    private roominfoQueue: PromisedRoom[] = [];
    resolvedRoom: string[] = [];
    resolvedUser: string[] = [];
    private PromisedPM: PendingMessage[] = [];
    private PromisedChat: PendingMessage[] = [];
    private challstr: string = "";

    constructor(options: ClientOptions) {
        super();
        options.retryLogin ||= 15 * 1000;
        options.autoReconnect ||= 10 * 1000;
        this.options = options;
        const defineOptions = {
            enumerable: false,
            writable: true,
        };
        Object.defineProperties(this, {
            options: defineOptions,
            _autoReconnect: defineOptions,
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
        this.rooms = { cache: new Collection(), raw: new Collection(), fetch: this.fetchRoom };
        this.users = { cache: new Collection(), raw: new Collection(), fetch: this.fetchUser };
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

    public connect(re?: boolean): void {
        if (this.ws && this.ws.readyState === 1) return;
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

        if (!re) console.log("Trying to connect to the server " + this.serverURL + "...");
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

                            const wsOptions: ws.ClientOptions = {
                                maxPayload: 8 * 100 * 1024 * 1024,
                                perMessageDeflate: false,
                                headers: {
                                    "Cache-Control": "no-cache",
                                    "User-Agent": "ws",
                                },
                            };

                            this.ws = new WebSocket(address, [], wsOptions) as WebSocket;
                            this.connected = true;
                            this.closed = false;
                            this.setEventListeners();

                            if (this.ws!.readyState === 0)
                                this._autoReconnect = setInterval(() => {
                                    if (this.ws!.readyState === 1) {
                                        clearInterval(this._autoReconnect);
                                        this._autoReconnect = undefined;
                                    }
                                    console.log("Retrying login cause the server had no response...");
                                    this.ws = null;
                                    this.connect();
                                }, this.options.autoReconnect);

                            this.ws!.on("message", (message: ws.MessageEvent) => {
                                this.onMessage(message.toString());
                            });

                            this.ws!.on("close", () => {
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
        if (!this.ws) return;
        this.connected = false;
        this.loggedIn = false;
        this.closed = true;
        this.ws.terminate();
    }

    private setEventListeners(): void {
        if (!this.ws) return;
        if (this.options.openListener)
            this.ws.addEventListener(
                // @ts-expect-error open is open
                "open" as string,
                this.options.openListener.function,
                this.options.openListener.options ?? {}
            );
        if (this.options.messageListener)
            this.ws.addEventListener(
                // @ts-expect-error message isnt open
                "message" as string,
                this.options.messageListener.function,
                this.options.messageListener.options ?? {}
            );
        if (this.options.closeListener)
            this.ws.addEventListener(
                // @ts-expect-error close isnt open
                "close" as string,
                this.options.closeListener.function,
                this.options.closeListener.options ?? {}
            );
        if (this.options.errorListener)
            this.ws.addEventListener(
                // @ts-expect-error error isnt open
                "error" as string,
                this.options.errorListener.function,
                this.options.errorListener.options ?? {}
            );
        if (this.options.customListener) {
            for (const Listener of this.options.customListener) {
                // @ts-expect-error union isnt open
                this.ws.addEventListener(Listener.event as string, Listener.function, Listener.options ?? {});
            }
        }
    }

    private setMessageInterval(): void {
        const isPublicBot: boolean = (() => {
            if (!this.user) return false;
            if (this.user.group === "*") return true;
            return this.user.rooms.some((r) => r.visibility === "public" && r.isBot(this.user!.userid));
        })();

        const isTrusted: boolean = (() => {
            if (!this.user) return false;
            return this.user?.trusted ?? false;
        })();

        this.throttleInterval = isPublicBot ? 25 : isTrusted ? 100 : 600;
    }

    private login(name: string, password?: string): void {
        const options: PostLoginOptions = {
            hostname: this.loginURL.hostname,
            path: this.loginURL.pathname,
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
                challstr: this.challstr,
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
                    challstr: this.challstr,
                });
        }

        const client = this;
        const request = https.request(options, (response: IncomingMessage) => {
            response.setEncoding("utf8");
            //eslint-disable-next-line @typescript-eslint/no-explicit-any
            let data: string = "";
            let assertion: string;
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
                let responseData: { assertion?: string; username?: string; loggedin?: boolean } = {};
                try {
                    responseData = JSON.parse(data.substring(1));
                    if (responseData.assertion) {
                        assertion = responseData.assertion;
                    } else {
                        console.error(`Unable to login: ${JSON.stringify(responseData, null, 4)}`);
                        if (client.options.retryLogin) {
                            console.log(`Retrying login in ${client.options.retryLogin / 1000}s.`);
                            setTimeout(client.login.bind(client), client.options.retryLogin, name, password);
                        }
                        return;
                    }
                    //eslint-disable-next-line no-empty
                } catch (e) {}
                console.log("Sending login trn...");
                if (assertion) client.ws!.send(`|/trn ${name},0,${assertion}`);
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
        const options: PostLoginOptions = {
            hostname: this.upkeepURL.hostname,
            path: this.upkeepURL.pathname,
            agent: false,
            method: "",
        };
        options.path +=
            "?" +
            querystring.stringify({
                act: "upkeep",
                challstr: this.challstr,
            });
        https.get(options, (response: IncomingMessage) => {
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
        if (!this.ws) return;
        if (!this.outGoingMessage.length) {
            clearTimeout(this.sendTimer);
            this.sendTimer = undefined;
        }
        const arr = this.outGoingMessage.splice(
            0,
            this.outGoingMessage.length <= this.messageThrottle ? this.outGoingMessage.length : this.messageThrottle
        );

        for (const m of arr) {
            const { roomid, userid, type, raw, text, measure } = m;
            let expection = "";

            switch (type) {
                case "pm-chat":
                case "room-chat":
                    expection = raw ?? text.split("|").slice(1).join("|");
                    break;
                case "code":
                    expection = "!code";
                    break;
                case "command":
                    if (raw.charAt(0) === "/") expection = "";
                    else expection = (raw ?? text.split("|").slice(1).join("|")).split(" ")[0]!;
                    break;
                default:
                    console.error("Unrecognized message type " + type + " detected.");
            }
            if (measure) {
                let promise: PendingMessage;
                if (typeof userid === "string") {
                    promise = {
                        id: userid!,
                        content: expection,
                        sentTime: Date.now(),
                        received: false,
                        onTimeout: function () {
                            if (this.received) return;
                            throw new TimeoutError("Request timeout: Failed to send a PM between " + userid);
                        },
                        onReject: function (error: Error) {
                            throw error;
                        },
                    };
                    this.PromisedPM.push(promise);
                } else {
                    promise = {
                        id: roomid!,
                        content: expection,
                        sentTime: Date.now(),
                        received: false,
                        onTimeout: function () {
                            if (this.received) return;
                            throw new TimeoutError("Request timeout: Failed to send a message to " + roomid);
                        },
                        onReject: function (error: Error) {
                            throw error;
                        },
                    };
                    this.PromisedChat.push(promise);
                }
                setTimeout(() => promise.onTimeout(), 3 * 1000);
            }
            if (text.startsWith("|/cmd ")) {
                const type = Tools.toId(text.split(" ")[1]!);
                let target = Tools.toRoomId(text.split(" ")[2]!);
                if (type === "userdetails") {
                    target = Tools.toId(target);
                    const user = this.users.cache.get(target);
                    if (user && Date.now() - user.lastFetchTime < USER_FETCH_COOLDOWN) {
                        const pUser = this.userdetailsQueue.find((e) => e.id === target);
                        if (pUser) pUser.resolve(user);
                        continue;
                    }
                } else {
                    const room = this.rooms.cache.get(Tools.toRoomId(target));
                    if (room && Date.now() - room.lastFetchTime < ROOM_FETCH_COOLDOWN) {
                        const pRoom = this.roominfoQueue.find((e) => e.id === target);
                        if (pRoom) pRoom.resolve(room);
                        continue;
                    }
                }
            }
            this.ws.send(text);
        }
    }

    send(message: IRoomOutGoingMessageOptions | IUserOutGoingMessageOptions): void {
        message.raw ??= "";
        if (message.type !== "code") {
            message.text = Tools.trim(message.text);
            message.raw = Tools.trim(message.raw);
        } else {
            message.text = message.text.trim();
            message.raw = message.raw.trim();
        }

        /* eslint-disable @typescript-eslint/no-explicit-any */
        function toRoom(
            options: IRoomOutGoingMessageOptions | IUserOutGoingMessageOptions
        ): options is IRoomOutGoingMessageOptions {
            return (options as any).roomid && (options as any).roomid !== "";
        }
        function toUser(
            options: IRoomOutGoingMessageOptions | IUserOutGoingMessageOptions
        ): options is IUserOutGoingMessageOptions {
            return (options as any).userid && (options as any).userid !== "";
        }
        /* eslint-enable */

        message.measure ??= false;

        if (toRoom(message)) {
            const room = this.getRoom(message.roomid);
            if (!room || !room.exists) throw new PSAPIError("ROOM_NONEXIST");
            message.type ??= "room-chat";
            this.outGoingMessage.push(message as IOutGoingMessage<Room>);
        } else if (toUser(message) && message.userid) {
            const user = this.getUser(message.userid);
            if (message.userid !== "" && (!user || !user.online)) throw new PSAPIError("USER_OFFLINE", message.userid);
            message.type ??= "pm-chat";
            this.outGoingMessage.push(message as IOutGoingMessage<User>);
        } else {
            (message as IUserOutGoingMessageOptions).type = "command";
            (message as IUserOutGoingMessageOptions).measure = false;
            this.outGoingMessage.push(message as IOutGoingMessage<User>);
        }

        if (!this.sendTimer) this.sendTimer = setInterval(() => this.runOutGoingMessage(), this.throttleInterval);
        return;
    }

    noreplySend(content: string): void {
        return this.send({
            userid: "",
            text: content,
            raw: "",
            type: "command",
            measure: false,
        });
    }

    joinRoom(roomid: string): void {
        roomid = Tools.toRoomId(roomid);
        if (!roomid) throw new PSAPIError("EMPTY", "Room");
        this.noreplySend("|/j " + roomid);
    }

    leaveRoom(roomid: string): void {
        roomid = Tools.toRoomId(roomid);
        if (!roomid) throw new PSAPIError("EMPTY", "Room");
        if (!this.rooms.cache.has(roomid)) throw new PSAPIError("ROOM_NONEXIST", roomid);
        this.noreplySend("|/l " + roomid);
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
                                    if (nextLine.startsWith("|c:|")) continue;
                                    // prettier-ignore
                                    else if (
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
                const modchatLevel = Tools.isModchatHTML(event.join("|"));
                if (modchatLevel !== false) {
                    room.modchat = modchatLevel;
                    this.rooms.cache.set(room.roomid, room);
                    this.emit(Events.MODCHAT, modchatLevel, room);
                }
                const modjoinLevel = Tools.isModjoinHTML(event.join("|"), room.modchat);
                if (modjoinLevel !== false) {
                    room.modjoin = modjoinLevel;
                    this.rooms.cache.set(room.roomid, room);
                    this.emit(Events.MODJOIN, modjoinLevel, room);
                } else this.emit(Events.RAW_DATA, event.join("|")!, room);
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
                    this.noreplySend("|/ip");
                    if (this.options.autoJoin?.length)
                        this.options.autoJoin.forEach((r: string) => this.noreplySend("|/j " + Tools.toRoomId(r)));
                    if (this.options.avatar) this.noreplySend(`|/avatar ${this.options.avatar}`);
                    if (this.options.status) this.noreplySend(`|/status ${this.options.status}`);
                    if (!this.user)
                        this.user = new ClientUser(
                            {
                                id: this.status.id,
                                userid: this.status.id,
                                name: this.status.name,
                                rooms: false,
                                avatar: this.options.avatar,
                            },
                            this
                        );
                    if (this.status.id) await this.fetchUser(this.status.id, true);
                    if (this.user) this.user.settings = JSON.parse(event[3] as string);
                    this.emit(Events.READY);
                }
                break;
            }
            case "challstr": {
                this.challstr = event.join("|");
                for (const id of ["~", "&"]) {
                    this.users.cache.set(
                        id,
                        new User(
                            {
                                id: id,
                                userid: id,
                                name: id,
                                rooms: false,
                                group: "&",
                                avatar: 1,
                                autoconfirmed: true,
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
                if (room.id.startsWith("view-")) return void this.emit(Events.OPEN_HTML_PAGE, room);

                if (!this.rooms.cache.has(room.id)) room = await this.fetchRoom(room.id, true);
                room.addUser(this.user!.name);
                this.emit(Events.CLIENT_ROOM_ADD, room);

                break;
            }
            case "deinit": {
                if (!isRoomNotEmp(room)) return;
                room.removeUser(this.user!.userid);
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
                            roominfo.users
                                .filter((u) => !client.users.cache.has(Tools.toId(u)))
                                .forEach((u) => this.noreplySend(`|/cmd userdetails ${Tools.toId(u)}`));
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
                            if (this.user) {
                                this.user.update();
                                for (const [k, v] of Object.entries(userdetails)) {
                                    if (k === "rooms") {
                                        for (const r of Object.keys(userdetails.rooms).map((r) =>
                                            Tools.toRoomId(r.replace(/^[^a-z0-9]/i, ""))
                                        )) {
                                            const room = this.rooms.cache.get(r);
                                            if (!room || !room.exists) continue;
                                            this.user.rooms.set(room.roomid, room);
                                        }
                                    } else if (k === "client") {
                                        // @ts-expect-error props should exists in ClientUser
                                        if (k in this.user) this.user[k] = v;
                                    }
                                }
                            } else this.user = new ClientUser(userdetails, client);
                            this.user.online = true;
                            this.setMessageInterval();
                        }
                        const user = this.addUser(userdetails);
                        if (!user) break;
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
                const author = this.getUser(event[0]!) ?? (await this.fetchUser(event[0]!)),
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
                        element.received = true;
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
                const by = this.getUser(event[1]!) ?? (await this.fetchUser(event[1]!)),
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
                            element.received = true;
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
                    const value = event.slice(2).join("|");
                    if (!this.trusted && value.startsWith("/raw ") && this.status.loggedIn) {
                        //prettier-ignore
                        if (value.includes("<small style=\"color:gray\">(trusted)</small>")) this.trusted = true;
                        else this.trusted = false;
                        if (this.user) this.user.trusted = this.trusted;

                        this.setMessageInterval();
                    }
                    break;
                }
                const authorName = Tools.toId(event[0]),
                    receiverName = Tools.toId(event[1]);
                let author: User, sendTo: User;
                if (this.user?.userid) {
                    if (authorName === this.user.userid) author = this.user;
                    else author = await this.fetchUser(authorName, true);
                    if (receiverName === this.user.userid) sendTo = this.user;
                    else sendTo = await this.fetchUser(receiverName, true);
                } else {
                    author = await this.fetchUser(authorName, true);
                    sendTo = await this.fetchUser(receiverName, true);
                }
                const value = event.slice(2).join("|")!;
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
                        element.received = true;
                        break;
                    }
                }
                break;
            }

            case "j":
            case "J":
            case "join": {
                if (!isRoomNotEmp(room)) return;
                const name = event.join("|"),
                    id = Tools.toId(event.join("|"));
                let user = this.getUser(id);
                if (!user) user = await this.fetchUser(id);
                user.addRoom(room.id);
                room.addUser(name);
                this.emit(Events.ROOM_USER_ADD, room, user);
                break;
            }

            case "l":
            case "L":
            case "leave": {
                if (!isRoomNotEmp(room)) return;
                const id = Tools.toId(event.join("|"));
                room.removeUser(id);
                const user =
                    this.getUser(id) ?? new User({ id, userid: id, name: event.join("|"), rooms: false }, this);
                user.removeRoom(room.id);
                this.emit(Events.ROOM_USER_REMOVE, room, user);
                if (!user.rooms.size) this.users.cache.delete(user.id);
                break;
            }

            case "n":
            case "N":
            case "name": {
                const Old = Tools.toId(event[1] as string),
                    New =
                        this.users.cache.get(Old) ??
                        new User(
                            {
                                id: Tools.toId(event[0]!),
                                userid: Tools.toId(event[0]!),
                                name: event[0]!,
                                rooms: false,
                            },
                            this
                        );

                New.alts.push(Old);
                this.users.cache.set(New.userid, New);
                this.emit(Events.USER_RENAME, New, Old);
                this.users.cache.delete(Old);
                if (room) {
                    room.update();
                    if (room.tour) room.tour.renameUser(Old, New.userid);
                }
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
                            room.tour.renameUser(user1, user2);
                        }
                        this.emit(Events.TOUR_REPLACE, room, this.getUser(user1), this.getUser(user2));
                        break;
                    }

                    case "battlestart": {
                        const user1 = tourEvent[0]!,
                            user2 = tourEvent[1]!,
                            battleRoom = tourEvent[2]!;
                        this.emit(
                            Events.TOUR_BATTLE_START,
                            room,
                            this.getUser(user1)!,
                            this.getUser(user2)!,
                            battleRoom
                        );
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

                        if (room.tour) {
                            if (result === "win") {
                                room.tour.removePoints(user2, 1);
                                if (
                                    room.tour.isElim() &&
                                    room.tour.players.get(Tools.toId(user2))?.score === -1 * room.tour.round.number
                                )
                                    room.tour.eliminatePlayer(user2);
                            } else if (result === "loss") {
                                room.tour.removePoints(user1, 1);
                                if (
                                    room.tour.isElim() &&
                                    room.tour.players.get(Tools.toId(user2))?.score === -1 * room.tour.round.number
                                )
                                    room.tour.eliminatePlayer(user1);
                            }
                        }

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
                        room.update();
                        if (room.tour) {
                            room.tour.update(data);
                            room.tour.onEnd(false);
                        }
                        this.emit(Events.TOUR_END, room, data, false);
                        room.tour = null;
                        break;
                    }

                    case "forceend": {
                        if (room.tour) room.tour.onEnd(true);
                        this.emit(Events.TOUR_END, room, null, true);
                        room.tour = null;
                        break;
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

            client.noreplySend(`|/cmd userdetails ${userid}`);
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

    addUser(input: UserOptions, fetched?: boolean): User | null {
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
            for (const [k, v] of Object.entries(input)) {
                if (k === "rooms" || k === "client") continue;
                // @ts-expect-error props exists in user
                if (k in user) user[k] = v;
            }
        }
        if (input.rooms) {
            const rooms = Object.keys(input.rooms).map((r) => r.replace(/^[^a-z0-9]/i, ""));
            for (const id of rooms) {
                const room = this.getRoom(id);
                if (!room) continue;
                user.rooms.set(room.roomid, room);
            }
        }
        if (fetched !== false) user.setLastFetchTime();
        user.setIsOnline();
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
            client.noreplySend(`|/cmd roominfo ${roomid}`);
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

    addRoom(input: RoomOptions, fetched?: boolean): Room {
        if (typeof input !== "object" || !input.roomid) throw new PSAPIError("EMPTY", "Room");

        let room: Room | undefined = this.rooms.cache.get(input.roomid);
        if (!room) {
            room = new Room(input, this) as Room;
            this.noreplySend(`|/cmd roominfo ${input.id}`);
        } else {
            for (const [k, v] of Object.entries(input)) {
                if (k === "client" || k === "error") continue;
                // @ts-expect-error props exists in room
                if (k in room) room[k] = v;
            }
        }
        if (input.users) {
            for (const id of input.users) {
                const user = this.getUser(id);
                if (!user) continue;
                room.userCollection.set(user.userid, user);
            }
        }
        room.setVisibility();
        if (fetched !== false) room.setLastFetchTime();
        this.rooms.cache.set(room.roomid!, room);
        return room as Room;
    }
}

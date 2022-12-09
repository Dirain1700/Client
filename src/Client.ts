import * as https from "https";
import { EventEmitter } from "node:events";
import * as url from "url";
import * as util from "util";
import { WebSocket } from "ws";
import * as querystring from "querystring";
import * as Tools from "./Tools";
import { ClientUser } from "./ClientUser";
import { Message } from "./Message";
import { Room } from "./Room";
import { User } from "./User";
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
import type { RoomOptions, RankHTMLOptions, HTMLOptions } from "../types/Room";
import type { TourUpdateData, PostTourData } from "../types/Tour";
import type { MessageInput, UserMessageOptions, RoomMessageOptions } from "./../types/Message";

const MAIN_HOST = "sim3.psim.us";
const Events: ClientEventNames = {
    READY: "ready",
    QUERY_RESPONSE: "queryResponse",
    RAW_DATA: "rawData",
    MESSAGE_CREATE: "messageCreate",
    MESSAGE_DELETE: "messageDelete",
    ROOM_USER_ADD: "roomUserAdd",
    ROOM_USER_REMOVE: "roomUserRemove",
    USER_RENAME: "userRename",
    CLIENT_ROOM_ADD: "clientRoomAdd",
    CLIENT_ROOM_REMOVE: "clientRoomRemove",
    TOUR_CREATE: "tourCreate",
    TOUR_UPDATE: "tourUpdate",
    TOUR_START: "tourStart",
    TOUR_END: "tourEnd",
    OPEN_HTML_PAGE: "openHtmlPage",
    CLOSE_HTML_PAGE: "closeHtmlPage",
    CHAT_ERROR: "chatError",
    CLIENT_ERROR: "error",
};

export class Client extends EventEmitter {
    readonly options: ClientOptions;
    private loggedIn: boolean = false;
    readonly serverURL: string = "play.pokemonshowdown.com";
    readonly serverId: string = "showdown";
    readonly actionURL = new url.URL("https://play.pokemonshowdown.com/~~showdown/action.php");
    readonly mainServer: string = "play.pokemonshowdown.com";
    messageThrottle = 3;
    throttleInterval: 25 | 100 | 600 = 600;
    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    webSocket: any;
    events = Events;
    rooms: {
        cache: Map<string, Room>;
        fetch: (roomid: string, force?: boolean) => Promise<Room>;
    };
    users: {
        cache: Map<string, User>;
        fetch: (userid: string, useCache?: boolean) => Promise<User>;
    };
    user: ClientUser | null;
    status: StatusType = {
        connected: false,
        loggedIn: false,
        name: null,
        id: null,
    };
    connected: boolean = false;
    closed: boolean = true;
    trusted: boolean = false;
    formats: {
        [key: string]: string[];
    } = {};

    private userdetailsQueue: PromisedUser[] = [];
    private roominfoQueue: PromisedRoom[] = [];
    resolvedRoom: string[] = [];
    resolvedUser: string[] = [];
    private PromisedPM: PendingMessage<Message<User>>[] = [];
    private PromisedChat: PendingMessage<Message<Room>>[] = [];
    private challstr: { key: string; value: string } = { key: "", value: "" };

    constructor(options: ClientOptions) {
        super();
        this.options = {
            openListener: options.openListener,
            messageListener: options.messageListener,
            closeListener: options.closeListener,
            errorListener: options.errorListener,
            customListener: options.customListener,
            name: options.name,
            pass: () => (options.pass as string) ?? "",
            status: options.status,
            avatar: options.avatar,
            autoJoin: options.autoJoin,
            retryLogin: options.retryLogin || 10 * 1000,
            autoReconnect: options.autoReconnect || 30 * 1000,
        };
        this.user = null;
        this.rooms = { cache: new Map(), fetch: this.fetchRoom };
        this.users = { cache: new Map(), fetch: this.fetchUser };
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
                if (data === ";") console.error("Failed to login.");
                if (data.length < 50) {
                    console.error("Failed to login: " + data);
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
                setInterval(client.upkeep.bind(client), 5000);
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
            response.on("data", (chunk: string) => {
                data += chunk;
            });

            response.on("end", () => {
                if (response.statusCode !== 200) console.error(data.substring(1));
            });
        });
    }

    send(content: string): void {
        if ((content.match(/\\n/g)?.length ?? 0) <= 5) this.webSocket.send(content);
        else this.sendArray(content.split("\n"));
    }

    sendArray(contents: string[]): Promise<void> {
        const client = this;

        return new Promise((resolve) => {
            const length = contents.length;
            if (length <= client.messageThrottle) {
                contents.forEach((e) => client.send(e));
                resolve();
                return;
            }

            let i = 0;
            contents.slice(i, i + client.messageThrottle)?.forEach((e) => client.send(e));
            i += client.messageThrottle;
            let loop: NodeJS.Timer;
            //eslint-disable-next-line prefer-const
            loop = setInterval(() => {
                contents.slice(i, i + client.messageThrottle).forEach((e) => client.send(e));
                if (i >= length) {
                    clearInterval(loop);
                    resolve();
                }
                i += client.messageThrottle;
            }, client.throttleInterval);
        });
    }

    sendUser(user: string, input: string | UserMessageOptions): Promise<Message<User>> | void {
        let str: string = "";
        if (typeof input === "string") str += input!;
        else {
            const { id, content, edit, box } = input;
            if (edit && box) throw new TypeError("You cannot edit HTML box.");
            if (!box) str += `/${edit ? "change" : "add"}uhtml ${id},`;
            else str += "/addhtmlbox";

            str += content;
        }

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
                reject: (reason: TimeoutError) => {
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
            if (hasAllowedDisplay(input)) {
                if (!box) str += `/${edit ? "change" : "add"}rankuhtml ${input.allowedDisplay},`;
                else str += `/addrankhtmlbox ${input.allowedDisplay},`;
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
                reject: (reason: TimeoutError) => {
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
                    this.status.loggedIn = true;
                    await this.send("|/ip");
                    const sendQueue: string[] = [];
                    if (this.options.autoJoin)
                        await this.sendArray(this.options.autoJoin.map((r: string) => "|/j " + Tools.toRoomId(r)));
                    if (this.options.avatar) sendQueue.push(`|/avatar ${this.options.avatar as string | number}`);
                    if (this.options.status) sendQueue.push(`|/status ${this.options.status as string}`);
                    await this.sendArray(sendQueue);
                    await Tools.sleep(this.throttleInterval);
                    await this.fetchUser(this.status.id, true);
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
                if (typeof this.options.pass === "function") this.login(this.options.name!, this.options.pass());
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
                        if (roominfo.users && !this.rooms.cache.has(roominfo.id)) {
                            await Tools.sleep(this.throttleInterval);
                            await this.sendArray(
                                roominfo.users
                                    .filter((u) => !client.users.cache.has(Tools.toId(u)))
                                    .map((u) => `|/cmd userdetails ${Tools.toId(u)}`)
                            );
                        }

                        const PendingRoom: PromisedRoom | undefined = this.roominfoQueue.find(
                            (r) => r.id === roominfo!.id
                        );
                        if (!PendingRoom) return;
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
                                PendingRoom.reject(roominfo);
                            }

                            break;
                        }

                        PendingRoom.resolve(this.addRoom(roominfo));
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
                        if (userdetails.id === this.status.id!) {
                            if (this.user) Object.assign(this.user, userdetails);
                            else this.user = new ClientUser(userdetails, client);
                            this.setMessageInterval();
                        }
                        const user = this.addUser(userdetails);
                        if (!user) return;
                        const PendingUser: PromisedUser | undefined = this.userdetailsQueue.find(
                            (u) => u.id === userdetails!.id
                        );
                        if (!PendingUser) break;
                        PendingUser.resolve(user);
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
                break;
            }

            case "pm": {
                if (!event[0] || !event[1] || !Tools.toId(event[0]) || !Tools.toId(event[1])) {
                    const content = event.slice(2).join("|") as string;
                    if (!this.trusted && content.startsWith("/raw ") && this.status.loggedIn) {
                        //prettier-ignore
                        if (content.includes("<small style=\"color:gray\">(trusted)</small>")) this.trusted = true;
                        else this.trusted = false;
                        if (this.user) this.user.trusted = this.trusted;

                        this.setMessageInterval();
                    }
                    break;
                }
                const author = await this.fetchUser(event[0] as string, true),
                    sendTo = await this.fetchUser(event[1] as string, true),
                    content = event.slice(2).join("|") as string;
                let target: User;
                if (author.id === this.status.id) target = sendTo;
                else target = author;
                const message = new Message<User>({
                    author: author,
                    content: content,
                    type: "PM",
                    target: target,
                    raw: rawMessage,
                    client: this,
                    time: Date.now(),
                } as MessageInput<User>);
                this.emit(Events.MESSAGE_CREATE, message);

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
                        let playerCap: number | null = parseInt(tourEvent[2] ?? "");
                        if (Number.isNaN(playerCap)) playerCap = null;

                        this.emit(Events.TOUR_CREATE, room, format, type, playerCap);
                        break;
                    }

                    case "update": {
                        const data: TourUpdateData = JSON.parse(tourEvent[0]!);

                        this.emit(Events.TOUR_UPDATE, room, data);
                        break;
                    }

                    case "start": {
                        const numPlayers = parseInt(tourEvent[0]!);
                        this.emit(Events.TOUR_START, room, numPlayers);
                        break;
                    }

                    case "end": {
                        const data: PostTourData = JSON.parse(tourEvent[0]!);
                        this.emit(Events.TOUR_END, room, data);
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
            if (["&", "~"].includes(userid)) return resolve(client.getUser("&")!);

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
        if (!user) {
            user = new User(input, this);
            this.fetchUser(input.userid, false);
        } else Object.assign(user, input);
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
                    if (client.roominfoQueue.includes(this)) return;
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

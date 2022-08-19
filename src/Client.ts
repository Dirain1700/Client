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

import type { ClientOptions as wsClientOptions } from "ws";
import type { IncomingMessage } from "http";
import type {
    ClientOptions,
    PromisedRoom,
    PromisedUser,
    StatusType,
    ServerConfig,
    PostLoginOptions,
    PendingMessage,
} from "../types/Client";
import type { UserOptions } from "../types/User";
import type { RoomOptions } from "../types/Room";
import type { MessageInput, UserMessageOptions, RoomMessageOptions } from "./../types/Message";

type valueOf<T> = T[keyof T];

const MAIN_HOST = "sim3.psim.us";
const defaultRoom: string = "lobby";
const Events = {
    READY: "ready",
    QUERY_RESPONSE: "queryResponse",
    MESSAGE_CREATE: "messageCreate",
    MESSAGE_DELETE: "messageDelete",
    ROOM_USER_ADD: "roomUserAdd",
    ROOM_USER_REMOVE: "roomUserRemove",
    USER_RENAME: "userRename",
    CLIENT_ROOM_ADD: "clienRoomAdd",
    CLIENT_ROOM_REMOVE: "clientRoomRemove",
    TOUR_CREATE: "tourCreate",
    TOUR_UPDATE: "tourUpdate",
    TOUR_START: "tourStart",
    TOUR_END: "tourEnd",
    OPEN_HTML_PAGE: "openHtmlPage",
    CLOSE_HTML_PAGE: "closeHtmlPage",
    ERROR: "chatError",
};

export class Client extends EventEmitter {
    readonly options: ClientOptions;
    private loggedIn: boolean = false;
    readonly serverURL: string = "play.pokemonshowdown.com";
    readonly serverId: string = "showdown";
    readonly actionURL = new url.URL("https://play.pokemonshowdown.com/~~showdown/action.php");
    readonly mainServer: string = "play.pokemonshowdown.com";
    messageInterval: 100 | 300 = 300;
    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    webSocket: any;
    events = Events;
    rooms: Map<string, Room> = new Map();
    users: Map<string, User> = new Map();
    user: ClientUser | null;
    status: StatusType = {
        connected: false,
        loggedIn: false,
        name: null,
        id: null,
    };
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
    }

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

        console.info("Trying to connect to the server " + this.serverURL + "...");
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
        if (this.user) this.messageInterval = this.user.trusted ? 100 : 300;
        this.messageInterval = this.trusted ? 100 : 300;
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
                    console.info("The login server is under heavy load.");
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
        if (content.split("\n").length >= 5) return void this.sendArray(content.split("\n"));
        else this.webSocket.send(content);
    }

    sendArray(contents: string[]): Promise<void> {
        const client = this;

        return new Promise((resolve) => {
            const length = contents.length;
            if (length >= 5) {
                contents.forEach((e) => client.send(e));
                resolve();
            }

            let i = 0;
            contents.slice(i, i + 5)?.forEach((e) => client.send(e));
            i += 5;
            let loop: NodeJS.Timer;
            //eslint-disable-next-line prefer-const
            loop = setInterval(() => {
                contents.slice(i, i + 5).forEach((e) => client.send(e));
                if (i >= length) {
                    clearInterval(loop);
                    resolve();
                }
                i += 5;
            }, client.messageInterval);
        });
    }

    sendUser(user: string, input: string | UserMessageOptions): Promise<Message<User>> | null {
        let str: string = "";
        if (input instanceof String) str += input!;
        else {
            const { content, html } = input as UserMessageOptions;
            if (!html && !content) throw new TypeError("Argument must be string or have 1 or more property.");

            if (html) {
                const { id, content, edit, box } = html;
                if (edit && box) throw new TypeError("You cannot edit HTML box.");
                if (!box) str += `/${edit ? "change" : "add"}uhtml ${id},`;
                else str += "/addhtmlbox";

                str += content;
            } else str += content!;
        }

        user = Tools.toId(user);

        this.send(`|/pm ${user},${str}`);
        if (str.startsWith("/")) return null;
        const client = this;
        return new Promise((resolve, reject) => {
            const PM: PendingMessage<Message<User>> = {
                id: user,
                resolve: (message: Message<User>) => {
                    resolve(message);
                    client.PromisedPM = client.PromisedPM.filter((e) => e.id !== user);
                },
                reject: (reason: string) => {
                    reject(reason);
                    client.PromisedPM = client.PromisedPM.filter((e) => e.id !== user);
                },
            };
            client.PromisedPM.push(PM);
            setTimeout(PM.reject, 3 * 1000, "Timeout");
        });
    }

    sendRoom(room: string, input: string | RoomMessageOptions): Promise<Message<Room>> | null {
        let str: string = "";
        if (input instanceof String) str += input!;
        else {
            const { content, html } = input as RoomMessageOptions;
            if (!html && !content) throw new TypeError("Argument must be string or have 1 or more property.");

            if (html) {
                const { id, content, edit, box, allowedDisplay } = html;
                if (edit && box) throw new TypeError("You cannot edit HTML box.");
                if (!allowedDisplay) {
                    if (!box) str += `/${edit ? "change" : "add"}uhtml ${id},`;
                    else str += "/addhtmlbox";
                } else {
                    if (!box) str += `/${edit ? "change" : "add"}rankuhtml ${allowedDisplay},`;
                    else str += `/addrankhtmlbox ${allowedDisplay},`;
                }
                if (!box) str += `${id},`;
                str += content;
            } else str += content!;
        }

        room = Tools.toRoomId(room);
        this.send(`${room}|${str}`);
        if (str.startsWith("/")) return null;
        const client = this;
        return new Promise((resolve, reject) => {
            const chat: PendingMessage<Message<Room>> = {
                id: room,
                resolve: (message: Message<Room>) => {
                    resolve(message);
                    client.PromisedChat = client.PromisedChat.filter((e) => e.id !== room);
                },
                reject: (reason: string) => {
                    reject(reason);
                    client.PromisedChat = client.PromisedChat.filter((e) => e.id !== room);
                },
            };
            client.PromisedChat.push(chat);
            setTimeout(chat.reject, 3 * 1000, "Timeout");
        });
    }

    joinRoom(roomid: string): Promise<Room> {
        roomid = Tools.toRoomId(roomid);
        if (!roomid) throw new Error("Room ID should not be empty.");
        this.send("|/j " + roomid);
        const client = this;
        //eslint-disable-next-line no-async-promise-executor
        return new Promise(async (resolve, reject) => {
            await Tools.sleep(client.messageInterval);
            client.fetchRoom.bind(client)(roomid).then(resolve).catch(reject);
        });
    }

    onMessage(message: string) {
        const lines: string[] = message.trim().split("\n");
        let roomid: string;
        if (lines[0]!.startsWith(">")) {
            roomid = lines[0]!.substring(1).trim();
            lines.shift();
        } else roomid = defaultRoom;

        const room: Room =
            (this.rooms.get(roomid) as Room | undefined) ??
            new Room(
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
                this.parseMessage(room, line!);

                if (line.startsWith("|init|")) {
                    const page = room.type === "html";
                    const chat = !page && room.type === "chat";
                    for (let n = i + 1; n < lines.length; n++) {
                        let nextLine: string = lines[n]!.trim();
                        if (page) {
                            if (nextLine!.startsWith("|pagehtml|")) {
                                this.parseMessage(room, nextLine);
                                break;
                            }
                        } else if (chat) {
                            if (nextLine!.startsWith("|users|")) {
                                this.parseMessage(room, nextLine.trim());
                                for (let p = n + 1; p < lines.length; p++) {
                                    nextLine = lines[p]!.trim();
                                    // prettier-ignore
                                    if (
                                        nextLine.startsWith("|raw|<div class=\"infobox infobox-roomintro\">") &&
                                        nextLine.endsWith("</div>")
                                    ) {
                                        this.parseMessage(room, nextLine);
                                        continue;
                                        // prettier-ignore
                                    } else if (
                                        nextLine.startsWith("|raw|<div class=\"broadcast-blue\">") &&
                                        nextLine.endsWith("</div>")
                                    ) {
                                        this.parseMessage(room, nextLine);
                                        continue;
                                    } else if (nextLine.startsWith("|:|")) {
                                        this.parseMessage(room, nextLine);
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

    async parseMessage(room: Room, rawMessage: string): Promise<void> {
        const eventName: string = rawMessage.split("|")[1] as string;
        const event: string[] = rawMessage.split("|").slice(2)!;

        switch (eventName) {
            case "raw": {
                const message = event.join("").substring(4);
                // prettier-ignore
                if (message.startsWith("<div class=\"infobox infobox-roomintro\">")) {
                    const intro = message.slice(39, -6);
                    // prettier-ignore
                    const roomintro =
                        intro.startsWith("<div class=\"infobox-limited\"") && intro.endsWith("</div>")
                            ? intro.slice(29, -6)
                            : intro;
                    room.intro = roomintro;
                    // prettier-ignore
                } else if (message.startsWith("<div class=\"broadcast-blue\">")) {
                    const announce = message.slice(28, -6);
                    room.announce = announce;
                }
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
                    await Tools.sleep(this.messageInterval);
                    await this.fetchUser(this.status.id);
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
                    this.users.set(
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
                room = await this.fetchRoom((room as Room).id).catch((r) => r);
                if (!room.roomid) break;
                this.fetchUser((this.user as ClientUser)?.userid ?? this.status.id!);
                if (room.id.startsWith("view-")) this.emit(Events.OPEN_HTML_PAGE, room);
                else this.emit(Events.CLIENT_ROOM_ADD, room);
                break;
            }
            case "deinit": {
                this.fetchUser((this.user as ClientUser)?.userid ?? this.status.id!);
                if ((room as Room).id.startsWith("view-")) this.emit(Events.CLOSE_HTML_PAGE, room);
                else this.emit(Events.CLIENT_ROOM_REMOVE, room);

                if (this.rooms.has(room.id)) this.rooms.delete(room.id);
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
                        if (roominfo.users && !this.rooms.has(roominfo.id)) {
                            await Tools.sleep(this.messageInterval);
                            await this.sendArray(
                                roominfo.users
                                    .filter((u) => !client.users.has(Tools.toId(u)))
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
                this.emit(Events.QUERY_RESPONSE, room, event);
                break;
            }
            case "chat":
            case "c": {
                const author = await this.fetchUser(event[0] as string),
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
                const by = await this.fetchUser(event[1] as string),
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

            case "pm": {
                const author = await this.fetchUser(event[0] as string),
                    sendTo = await this.fetchUser(event[1] as string),
                    content = event.slice(2).join("|") as string;
                let target: User;
                if (author.id !== this.status.id) target = sendTo;
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
                if (!["~", "&"].includes(message.target.userid)) break;
                if (content.startsWith("/raw ") && this.status.loggedIn) {
                    //prettier-ignore
                    if (content.includes("<small style=\"color:gray\">(trusted)</small>"))
                        (this.user as ClientUser).trusted = true;
                    else (this.user as ClientUser).trusted = false;
                }

                if (!["~", "&"].some((id) => [author.id, target.id].includes(id))) break;
                //prettier-ignore
                if (content.includes("<small style=\"color:gray\">(trusted)</small>"))
                        this.trusted = true;
                    else this.trusted = false;

                if (this.user) this.user.trusted = this.trusted;

                this.setMessageInterval();

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
                room = await this.fetchRoom((room as Room).id).catch((err) => err);
                if (!room.roomid) break;
                const user = this.fetchUser(Tools.toId(event.join("|")));
                this.emit(Events.ROOM_USER_ADD, room, user);
                break;
            }

            case "l":
            case "L":
            case "leave": {
                room = await this.fetchRoom((room as Room).id);
                const user = this.fetchUser(Tools.toId(event.join("|")));
                this.emit(Events.ROOM_USER_REMOVE, room, user);
                break;
            }

            case "n":
            case "N":
            case "name": {
                this.fetchRoom((room as Room).id);
                const Old = Tools.toId(event[1] as string),
                    New = await this.fetchUser(Tools.toId(event[0] as string));
                if (!this.users.has(Old)) break;

                const user = this.users.get(Old)!;
                user.alts.push(New);
                New.alts.push(user);
                this.users.set(New.userid, New);
                this.emit(Events.USER_RENAME, New, user ?? Old);
                this.users.delete(Old);
                break;
            }

            case "error": {
                room = await this.fetchRoom(room.id).catch((r) => r);
                if (!room) return;
                const error = event.join("|");
                this.emit(Events.ERROR, room, error);
                break;
            }

            case "tournament": {
                const tourEventName = event[0]!;
                const tourEvent = event.slice(1);
                switch (tourEventName) {
                    case "create": {
                        const format = tourEvent[0]!,
                            type = tourEvent[1]!,
                            playerCap = tourEvent[2];

                        this.emit(Events.TOUR_CREATE, room, format, type, playerCap);
                        break;
                    }

                    case "update": {
                        interface UpdateData {
                            format: string;
                            teambuilderFormat: string;
                            isStarted: boolean;
                            isJoined: boolean;
                            generator: string & ("Elimination" | "Round Robin");
                            playerCap: number;
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            bracketData: any;
                            challenges: string[];
                            challengeBys: string[];
                            challenged: string;

                            challenging: string;
                        }
                        const data: UpdateData = JSON.parse(tourEvent[0]!);

                        this.emit(Events.TOUR_UPDATE, room, data);
                        break;
                    }

                    case "start": {
                        const numPlayers = tourEvent[0]!;
                        this.emit(Events.TOUR_START, room, numPlayers);
                        break;
                    }

                    case "end": {
                        interface tourData {
                            results: string;
                            format: string;
                            generator: string;
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            bracketData: any;
                        }
                        const data: tourData = JSON.parse(tourEvent[0]!);
                        this.emit(Events.TOUR_END, room, data);
                        break;
                    }
                }
                break;
            }

            default:
                this.emit(eventName, event);
        }
    }

    fetchUser(userid: string): Promise<User> {
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
        });
    }

    getUser(id: string): User | null {
        id = Tools.toId(id);
        if (this.users.has(id)) return this.users.get(id) as User;
        const Users: User[] = [...this.users.values()];

        for (const user of Users) {
            if (user.alts.some((u: User) => u.id === id)) return user;
        }

        return null;
    }

    addUser(input: UserOptions): User | null {
        if (typeof input !== "object" || !input.userid) return null;
        let user: User | undefined = this.users.get(input.userid);
        if (!user) {
            user = new User(input, this);
            this.fetchUser(input.userid);
        } else Object.assign(user, input);
        this.users.set(user!.userid, user!);
        return user as User;
    }

    fetchRoom(roomid: string): Promise<Room> {
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
                reject: (room: RoomOptions) => {
                    reject(room);
                    client.roominfoQueue = client.roominfoQueue.filter((e) => e.id !== roomid && e.time !== time);
                },
            };
            client.roominfoQueue.push(r);
            client.send(`|/cmd roominfo ${roomid}`);
            setTimeout(r.reject, 20 * 1000, {
                id: roomid,
                error: "timeout",
            } as RoomOptions);
        });
    }

    getRoom(roomid: string): Room | null {
        roomid = Tools.toRoomId(roomid);
        return this.rooms.get(roomid) ?? null;
    }

    addRoom(input: RoomOptions): Room {
        if (typeof input !== "object" || !input.roomid)
            throw new Error("Input must be an object with roomid for new Room");

        let room: Room | undefined = this.rooms.get(input.roomid);
        if (!room) {
            room = new Room(input, this) as Room;
            this.fetchRoom(input.roomid);
        } else Object.assign(room!, input);
        this.rooms.set(room.roomid!, room);
        return room as Room;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    on(eventName: valueOf<typeof Events>, listener: (...args: any[]) => void): this {
        return super.on(eventName, listener);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    emit(eventName: valueOf<typeof Events>, ...args: any[]): boolean {
        return super.emit(eventName, ...args);
    }
}

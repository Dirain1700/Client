import type { TimeoutError } from "../src/Error";
import type { Message } from "../src/Message";
import type { BattleRoom, Room } from "../src/Room";
import type { User } from "../src/User";
import type { IBattleRoom, RoomOptions, ModchatLevel } from "./Room";
import type { TourUpdateData, TourEndData } from "./Tour";
import type { Dict } from "./utils";
import type { RawData } from "ws";

/* eslint-disable no-unused-vars, @typescript-eslint/no-explicit-any */

export interface ClientOptions {
    openListener?: OpenListener;
    messageListener?: MessageListener;
    closeListener?: CloseListener;
    errorListener?: ErrorListener;
    customListener?: CustomListener[];
    name?: string;
    pass?: string;
    status?: string;
    avatar?: string | number;
    prefix?: string;
    autoJoin?: string[];
    retryLogin?: number;
    autoReconnect?: number;
}

export interface ClientEventNames {
    READY: "ready";
    QUERY_RESPONSE: "queryResponse";
    BATTLE_LIST: "battleList";
    BATTLE_START: "battleStart";
    BATTLE_END: "battleEnd";
    RAW_DATA: "rawData";
    MODCHAT: "modchat";
    MODJOIN: "modjoin";
    MESSAGE_CREATE: "messageCreate";
    COMMAND_EMIT: "commandEmit";
    MESSAGE_DELETE: "messageDelete";
    ROOM_USER_ADD: "roomUserAdd";
    ROOM_USER_REMOVE: "roomUserRemove";
    USER_RENAME: "userRename";
    CLIENT_ROOM_ADD: "clientRoomAdd";
    CLIENT_ROOM_REMOVE: "clientRoomRemove";
    TOUR_CREATE: "tourCreate";
    TOUR_UPDATE: "tourUpdate";
    TOUR_UPDATE_END: "tourUpdateEnd";
    TOUR_JOIN: "tourJoin";
    TOUR_LEAVE: "tourLeave";
    TOUR_REPLACE: "tourReplace";
    TOUR_BATTLE_START: "tourBattleStart";
    TOUR_BATTLE_END: "tourBattleEnd";
    TOUR_START: "tourStart";
    TOUR_END: "tourEnd";
    OPEN_HTML_PAGE: "openHtmlPage";
    CLOSE_HTML_PAGE: "closeHtmlPage";
    CHAT_ERROR: "chatError";
    CLIENT_ERROR: "error";
}

export interface ClientEvents {
    ready: [client?: undefined];
    queryResponse: [event: string];
    battleList: [rooms: Dict<IBattleRoom>];
    battleStart: [room: BattleRoom];
    battleEnd: [room: BattleRoom, status: "win" | "tie", winner?: User];
    rawData: [message: string, room: Room];
    modchat: [room: Room, modchatLevel: ModchatLevel, previousModchatLevel: ModchatLevel];
    modjoin: [room: Room, modjoinLevel: ModchatLevel, previousModjoinLevel: ModchatLevel];
    messageCreate: [message: Message<User | Room>];
    messageDelete: [message: Message<User | Room>];
    roomUserAdd: [room: Room, user: User];
    roomUserRemove: [room: Room, user: User];
    userRename: [renameTo: User, renameFrom: User];
    clientRoomAdd: [room: Room];
    clientRoomRemove: [room: Room];
    tourCreate: [room: Room, format: string, type: string, playerCap: number | null];
    tourUpdate: [room: Room, data: TourUpdateData];
    tourUpdateEnd: [room: Room];
    tourJoin: [room: Room, user: User];
    tourLeave: [room: Room, user: User | undefined];
    tourReplace: [room: Room, user1: User | undefined, user2: User | undefined];
    tourBattleStart: [room: Room, user1: User, user2: User, battle: string];
    tourBattleEnd: [
        room: Room,
        user1: User,
        user2: User,
        result: "win" | "loss" | "draw",
        score: [number, number],
        recorded: "success" | "fail",
        battle: string,
    ];
    tourStart: [room: Room, players: number];
    tourEnd: [room: Room, data: TourEndData | null, force: boolean];
    openHtmlPage: [room: Room];
    closeHtmlPage: [room: Room];
    chatError: [error: string, room: Room | null];
    error: [error: string];
}

interface EventOptions {
    capture?: boolean;
    once?: boolean;
    passive?: boolean;
}

export interface OpenListener {
    function: () => void;
    event?: EventOptions;
    options?: EventOptions;
}
export interface MessageListener {
    function: (data: RawData, isBinary: boolean) => any;
    options?: EventOptions;
}
export interface CloseListener {
    function: (code: number, reason: Buffer) => any;
    options?: EventOptions;
}
export interface ErrorListener {
    function: (error: Error) => any;
    options?: EventOptions;
}

export interface CustomListener {
    event: "close" | "error" | "message" | "open" | "ping" | "pong" | "redirect" | "unexpected-response" | "upgrade";
    function: (...args: any[]) => void;
    options?: EventOptions;
}

// prettier-ignore
export type IMessageType = "command" | "code" | "room-chat" | "pm-chat";

interface BaseOutGoingMessageOptions {
    text: string;
    raw?: string;
    measure?: boolean;
    type?: IMessageType;
}

export interface IRoomOutGoingMessageOptions extends BaseOutGoingMessageOptions {
    roomid: string;
}

export interface IUserOutGoingMessageOptions extends BaseOutGoingMessageOptions {
    userid: string;
}

export interface IOutGoingMessage<T extends User | Room> {
    userid: T extends User ? string : null;
    roomid: T extends Room ? string : null;
    text: string;
    raw: string;
    measure: boolean;
    type: IMessageType;
}

export interface PromisedRoom {
    id: string;
    time: string;
    resolve: (room: Room) => void;
    reject: (room: TimeoutError | RoomOptions) => void;
}

export interface PromisedUser {
    id: string;
    time: string;
    resolve: (user: User) => void;
}

export interface StatusType {
    connected: boolean;
    loggedIn: boolean;
    name: string;
    id: string;
}

export interface ServerConfig {
    host?: string;
    id?: string;
    port?: number;
}

export interface PostLoginOptions {
    hostname: string;
    path: string;
    agent: false;
    method: string;
    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    headers?: any;
}

export interface PendingMessage {
    id: string;
    content: string;
    sentTime: number;
    received: boolean;
    onTimeout: () => void;
    onReject: (error: Error) => void;
}

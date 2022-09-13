import type { Room } from "../src/Room";
import type { User } from "../src/User";
import type { Message } from "../src/Message";
import type { RoomOptions } from "./Room";
import type { TourUpdateData, PostTourData } from "./Tour";

/* eslint-disable no-unused-vars, @typescript-eslint/no-explicit-any, @typescript-eslint/ban-types */

export interface ClientOptions {
    openListener?: OpenListener;
    messageListener?: MessageListener;
    closeListener?: CloseListener;
    errorListener?: ErrorListener;
    customListener?: CustomListener[];
    name?: string;
    pass?: string | (() => string);
    status?: string;
    avatar?: string | number;
    autoJoin?: string[];
    retryLogin?: number;
    autoReconnect?: number;
}

export interface ClientEventNames {
    READY: "ready";
    QUERY_RESPONSE: "queryResponse";
    RAW_DATA: "rawData";
    MESSAGE_CREATE: "messageCreate";
    MESSAGE_DELETE: "messageDelete";
    ROOM_USER_ADD: "roomUserAdd";
    ROOM_USER_REMOVE: "roomUserRemove";
    USER_RENAME: "userRename";
    CLIENT_ROOM_ADD: "clientRoomAdd";
    CLIENT_ROOM_REMOVE: "clientRoomRemove";
    TOUR_CREATE: "tourCreate";
    TOUR_UPDATE: "tourUpdate";
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
    rawData: [message: string, room: Room];
    messageCreate: [message: Message<User | Room>];
    messageDelete: [message: Message<User | Room>];
    roomUserAdd: [room: Room, user: User];
    roomUserRemove: [room: Room, user: User];
    userRename: [newUser: User, oldUser: User];
    clientRoomAdd: [room: Room];
    clientRoomRemove: [room: Room];
    tourCreate: [room: Room, format: string, type: string, playerCap: number | null];
    tourUpdate: [room: Room, data: TourUpdateData];
    tourStart: [room: Room, players: number];
    tourEnd: [room: Room, data: PostTourData];
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
    function: () => any;
    event?: EventOptions;
    options?: EventOptions;
}
export interface MessageListener {
    function: (message: Buffer | ArrayBuffer | Buffer[]) => any;
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
    function: Function;
    options?: EventOptions;
}

export interface PromisedRoom {
    id: string;
    time: string;
    resolve: (room: Room) => void;
    reject: (room: RoomOptions) => void;
}

export interface PromisedUser {
    id: string;
    time: string;
    resolve: (user: User) => void;
}

export interface StatusType {
    connected: boolean;
    loggedIn: boolean;
    name: string | null;
    id: string | null;
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

export interface PendingMessage<T> {
    id: string;
    resolve: (message: T) => void;
    reject: (reason: string) => void;
}

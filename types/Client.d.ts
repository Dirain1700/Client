import type { Room } from "../src/Room";
import type { User } from "../src/User";
import type { RoomOptions } from "./Room";

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

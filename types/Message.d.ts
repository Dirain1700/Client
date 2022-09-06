import type { Client } from "../src/Client";
import type { User } from "../src/User";
import type { Room } from "../src/Room";
import type { Message } from "../src/Message";
import type { NormalHTMLOptions, RankHTMLOptions } from "./Room";

export interface MessageInput<T extends User | Room | unknown> {
    author: User;
    content: string;
    target: T;
    raw: string;
    type: "Room" | "PM";
    time: number;
    client: Client;
}

export interface UserMessageOptions {
    content?: string;
    html?: NormalHTMLOptions | null;
}

export interface RoomMessageOptions {
    content?: string;
    html?: (NormalHTMLOptions | RankHTMLOptions) | null;
}

/* eslint-disable @typescript-eslint/ban-types, @typescript-eslint/no-explicit-any, no-unused-vars */
export interface MessageWaits<T extends User | Room> {
    id: string;
    roomid?: string;
    userid?: string;
    messages: Array<Message<T>>;
    filter: Function;
    max: number;
    time: number;
    resolve: Function;
    reject: Function;
}
/* eslint-enable @typescript-eslint/ban-types */

export interface awaitMessageOptions<T extends User | Room> {
    filter: (message: Message<T>) => boolean;
    max: number;
    time: number;
}

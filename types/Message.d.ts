import type { Client } from "../src/Client";
import type { User } from "../src/User";
import type { Room } from "../src/Room";
import type { Message } from "../src/Message";
import type { UhtmlOptions } from "./Room";
import type { GroupSymbol } from "./UserGroups";

export interface MessageInput<T extends User | Room> {
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
    html?: UhtmlOptions | false;
}

export interface RoomMessageOptions {
    content?: string;
    html?: (UhtmlOptions & { allowedDisplay?: GroupSymbol }) | false;
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

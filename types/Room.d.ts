import type { AuthLevel } from "./UserGroups";
import type { Room } from "../src/Room";
import type { MessageWaits } from "./Message";
import type { GroupSymbol } from "./UserGroups";

export interface RoomOptions {
    id: string;
    roomid?: string;
    title?: string;
    type: "chat" | "battle" | "html";
    visibility?: "public" | "hidden" | "secret";
    modchat?: AuthLevel | null;
    modjoin?: AuthLevel | null;
    auth?: {
        [key: string]: string[];
    };
    users?: string[];
    error?: "not found or access denied" | "timeout";
    waits?: MessageWaits<Room>[];
}

export interface UhtmlOptions {
    id: string;
    content: string;
    edit?: boolean;
    box?: undefined;
}
export interface HTMLBoxOptions {
    id?: undefined;
    content: string;
    edit?: boolean;
    box: true;
}

export interface RankuHTMLOptions extends UhtmlOptions {
    allowedDisplay: GroupSymbol;
}

export interface RankHTMLBoxOptions extends HTMLBoxOptions {
    allowedDisplay: GroupSymbol;
}

export type RankHTMLOptions = RankuHTMLOptions | RankHTMLBoxOptions;

export type NormalHTMLOptions = UhtmlOptions | HTMLBoxOptions;

export type HTMLOptions = NormalHTMLOptions | RankHTMLOptions;

export interface BattleRoom {
    p1?: string;
    p2?: string;
    isPrivate?: boolean | "hidden" | "voice";
}

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
    id: string; // HTML ID (required when edit HTML)
    content: string; // HTML body
    edit?: boolean; // edit or not
    box?: undefined; // PLEASE IGNORE THIS. box must be undefined.
}

export interface HTMLBoxOptions {
    id?: undefined; // PLEASE IGNORE THIS. id must be undefined.
    content: string; // HTML body
    edit?: undefined; // PLEASE IGNORE THIS. edit must be undefined.
    box: true; // must be true
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

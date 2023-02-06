import type { Room } from "../src/Room";
import type { MessageWaits } from "./Message";
import type { AuthLevel, GroupSymbol } from "./UserGroups";

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

export interface PrivateuHTMLOptions extends UhtmlOptions {
    private: string;
}

export interface PrivateHTMLBoxOptions extends HTMLBoxOptions {
    private: string;
}

export interface PMuHTMLOptions extends UhtmlOptions {
    pm: string;
}

export interface PmHTMLBoxOptions extends HTMLBoxOptions {
    pm: string;
}

export type RankHTMLOptions = RankuHTMLOptions | RankHTMLBoxOptions;

export type PrivateHTMLOptions = PrivateuHTMLOptions | PrivateHTMLBoxOptions;

export type PMHTMLOptions = PMuHTMLOptions | PmHTMLBoxOptions;

export type NormalHTMLOptions = UhtmlOptions | HTMLBoxOptions;

export type HTMLOptions = NormalHTMLOptions | RankHTMLOptions | PrivateHTMLOptions | PMHTMLOptions;

export interface IHtmlPageData {
    id: string;
    content: string;
    userid: string;
}

export interface BattleRoom {
    p1?: string;
    p2?: string;
    isPrivate?: boolean | "hidden" | "voice";
}

// prettier-ignore
export type RoomPermissions = "chat" | "broadcast" | "show" | "warn" | "tour" | "mute" | "hidetext" |
    "announce" | "announcement" | "ban" | "roomban" | "rfaq" | "html" | "declare" | "roomintro";

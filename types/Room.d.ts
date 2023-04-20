import type { Room } from "../src/Room";
import type { MessageWaits } from "./Message";
import type { AuthLevel } from "./UserGroups";

export interface RoomOptions {
    id: string;
    roomid?: string;
    title?: string;
    type: "chat" | "battle" | "html";
    visibility?: "public" | "hidden" | "secret";
    modchat?: ModchatLevel;
    modjoin?: ModchatLevel;
    auth?: {
        [key: string]: string[];
    };
    users?: string[];
    error?: "not found or access denied" | "timeout";
    waits?: MessageWaits<Room>[];
}

export interface IBattleRoom {
    id?: string;
    p1?: string;
    p2?: string;
    minElo?: number;
    isPrivate?: boolean | "hidden" | "voice";
}

export interface IBattlePokemonType {
    name: string;
    gendar: "M" | "F" | "N";
}

// prettier-ignore
export type RoomPermissions = "chat" | "broadcast" | "show" | "warn" | "tour" | "mute" | "hidetext" |
    "announce" | "announcement" | "ban" | "roomban" | "rfaq" | "html" | "declare" | "roomintro";

export type ModchatLevel = null | Exclude<AuthLevel, "~" | "!" | "‽">;

import type { AuthLevel } from "./UserGroups";
import type { Room } from "../src/Room";
import type { MessageWaits } from "./Message";

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
    box?: boolean;
}

export interface BattleRoom {
    p1?: string;
    p2?: string;
    isPrivate?: boolean | "hidden" | "voice";
}

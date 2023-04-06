import type { Client } from "../src/Client";
import type { User } from "../src/User";
import type { MessageWaits } from "./Message";
import type { GroupSymbol } from "./UserGroups";

export interface UserOptions {
    id: string;
    userid: string;
    name: string;
    avatar?: string | number;
    group?: GroupSymbol;
    customgroup?: "Section Leader" | null;
    autoconfirmed?: boolean;
    status?: string | null;
    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    rooms: { [key: string]: any } | false;
    friended?: boolean;
    guestNumber?: string;
    waits?: MessageWaits<User>[];
    alts?: string[];
    client?: Client;
}

// prettier-ignore
export type GlobalPermissions = "chat" | "groupchat" | "warn" | "lock" | "alts" |
    "forcerename" | "globalban" | "ip" | "forceend" | "promote" | "banip" | "bypassall";

import type { GroupSymbol } from "./UserGroups";
import type { MessageWaits } from "./Message";
import type { Client } from "../src/Client";
import type { User } from "../src/User";

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
    waits?: MessageWaits<User>[];
    client?: Client;
}

export type GlobalPermissions = string &
    (
        | "warn"
        | "lock"
        | "alts"
        | "forcerename"
        | "globalban"
        | "ip"
        | "forcewin"
        | "forcetie"
        | "promote"
        | "demote"
        | "banip"
        | "hotpatch"
        | "eval"
    );

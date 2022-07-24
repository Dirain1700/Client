import type { AuthLevel } from "./UserGroups";
import type { MessageWaits } from "./Message";
import type { Client } from "./../src/Client";
import type { User } from "./../src/User";

export interface UserOptions {
    id: string;
    userid: string;
    name: string;
    avatar?: string | number;
    group?: AuthLevel;
    customgroup?: "Section Leader" | null;
    autoconfirmed?: boolean;
    status?: string | null;
    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    rooms: { [key: string]: any } | false;
    friended?: boolean;
    waits?: MessageWaits<User>[];
    client?: Client;
}

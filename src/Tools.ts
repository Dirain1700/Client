"use strict";

import type { GroupSymbol } from "../types/UserGroups";

export class Tools {
    static readonly rankList = [
        "~", //OldAdmin
        "&", //NewAdmin
        "#", //RoomOwner
        "*", //Bot
        "@", //Mod
        "★", //Host
        "%", //Driver
        "§", //SectionLeader
        "☆", //Player
        "+", //Voice
        "^", //Prize Winner
        " ", //Nomal
        "!", //Muted
        "‽", //Locked
    ];

    static toId(id: string): string {
        return id.toLowerCase().replace(/[^a-z0-9]/g, "");
    }

    static toRoomId(id: string): string {
        return id.toLowerCase().replace(/[^a-z0-9-]/g, "");
    }

    static sleep(t: number): Promise<void> {
        return new Promise((r) => setTimeout(r, t));
    }

    static sortByRank(arr: GroupSymbol[]): GroupSymbol[] {
        arr.sort((a, b) => this.rankList.indexOf(a) - this.rankList.indexOf(b));
        return arr;
    }

    static isHigherRank(comparePosition: GroupSymbol, standard: GroupSymbol): boolean {
        return [comparePosition, standard].toString() === this.sortByRank([comparePosition, standard]).toString();
    }
}

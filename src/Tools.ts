import type { GroupSymbol } from "../types/UserGroups";

export const toId = (id: string): string => {
    return id.toLowerCase().replace(/[^a-z0-9]/g, "");
};

export const toRoomId = (id: string): string => {
    return id.toLowerCase().replace(/[^a-z0-9-]/g, "");
};

export const sleep = (t: number) => new Promise((r) => setTimeout(r, t));

export const rankList: GroupSymbol[] = [
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

export const sortByRank = (arr: GroupSymbol[]): GroupSymbol[] => {
    arr.sort((a, b) => rankList.indexOf(a) - rankList.indexOf(b));
    return arr;
};

export const isHigherRank = (standard: GroupSymbol, comparePosition: GroupSymbol): boolean =>
    [comparePosition, standard].toString() === sortByRank([comparePosition, standard]).toString();

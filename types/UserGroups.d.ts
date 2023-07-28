export type GroupSymbol = "~" | "&" | "#" | "★" | "*" | "@" | "%" | "☆" | "§" | "+" | "^" | " " | "‽" | "!";
// prettier-ignore
export type GroupNames = "admin" | "roomowner" | "bot" | "mod" | "host" | "driver" | "sectionleader" | "player" | "voice" | "prizewinner" | "normal" | "muted" | "locked";
export type AuthLevel = GroupSymbol | "whitelist" | "unlocked" | "trusted" | "autoconfirmed";

export interface Ranks {
    admin: "&";
    owner: "#";
    bot: "*";
    mod: "@";
    host: "★";
    driver: "%";
    sectionleader: "§";
    player: "☆";
    voice: "+";
    prizewinner: "^";
    normal: " ";
    muted: "!";
    locked: "‽";
}

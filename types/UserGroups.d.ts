export type GroupSymbol = string & ("~" | "&" | "#" | "★" | "*" | "@" | "%" | "☆" | "§" | "+" | "^" | " " | "‽" | "!");
// prettier-ignore
export type GroupNames = string & ("admin" | "roomowner" | "bot" | "mod" | "host" | "driver" | "sectionleader" | "player" | "voice" | "prizewinner" | "normal" | "muted" | "locked");
export type AuthLevel = string & (GroupSymbol | "whitelist" | "unlocked" | "trusted" | "autoconfirmed");

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

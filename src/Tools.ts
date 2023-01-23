"use strict";

import type { GroupSymbol } from "../types/UserGroups";

const AND = "&";
const LESS_THAN = "<";
const GREATER_THAN = ">";
const DOUBLE_QUOTE = '"'; // eslint-disable-line quotes
const SINGLE_QUOTE = "'";
const SLASH = "/";
const BACK_SLASH = "\\";
const ACUTE_ACCENT_E = "é";
const SPACE = " ";
const HYPHEN = "-";

const ESCAPED_AND = "&amp;";
const ESCAPED_LESS_THAN = "&lt;";
const ESCAPED_GREATER_THAN = "&gt;";
const ESCAPED_DOUBLE_QUOTE = "&quot;";
const ESCAPED_SINGLE_QUOTE = "&apos;";
const ESCAPED_SLASH = "&#x2f;";
const ESCAPED_BACK_SLASH = "&#92;";
const ESCAPED_ACUTE_ACCENT_E = "&eacute;";
const ESCAPED_SPACE = "&nbsp;";
const ESCAPED_HYPHEN = "&#8209;";

const ESCAPED_NUMBER_AND = "&#38;";
const ESCAPED_NUMBER_LESS_THAN = "&#60;";
const ESCAPED_NUMBER_GREATER_THAN = "&#62;";
const ESCAPED_NUMBER_DOUBLE_QUOTE = "&#34;";
const ESCAPED_NUMBER_SINGLE_QUOTE = "&#39;";
const ESCAPED_NUMBER_SLASH = "&#47;";

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

    static readonly ranks = {
        admin: "&",
        owner: "#",
        bot: "*",
        mod: "@",
        host: "★",
        driver: "%",
        sectionleader: "§",
        player: "☆",
        voice: "+",
        prizewinner: "^",
        normal: " ",
        muted: "!",
        locked: "‽",
    };

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
        if (comparePosition === standard) return true;
        return [comparePosition, standard].toString() === this.sortByRank([comparePosition, standard]).toString();
    }

    static escapeHTML(html: string): string {
        if (!html) return "";

        return html
            .replaceAll(AND, ESCAPED_AND)
            .replaceAll(LESS_THAN, ESCAPED_LESS_THAN)
            .replaceAll(GREATER_THAN, ESCAPED_GREATER_THAN)
            .replaceAll(DOUBLE_QUOTE, ESCAPED_DOUBLE_QUOTE)
            .replaceAll(SINGLE_QUOTE, ESCAPED_SINGLE_QUOTE)
            .replaceAll(SLASH, ESCAPED_SLASH)
            .replaceAll(BACK_SLASH, ESCAPED_BACK_SLASH)
            .replaceAll(ACUTE_ACCENT_E, ESCAPED_ACUTE_ACCENT_E);
    }

    static unescapeHTML(html: string): string {
        if (!html) return "";

        return html
            .replaceAll(ESCAPED_AND, AND)
            .replaceAll(ESCAPED_NUMBER_AND, AND)
            .replaceAll(ESCAPED_LESS_THAN, LESS_THAN)
            .replaceAll(ESCAPED_NUMBER_LESS_THAN, LESS_THAN)
            .replaceAll(ESCAPED_GREATER_THAN, GREATER_THAN)
            .replaceAll(ESCAPED_NUMBER_GREATER_THAN, GREATER_THAN)
            .replaceAll(ESCAPED_DOUBLE_QUOTE, DOUBLE_QUOTE)
            .replaceAll(ESCAPED_NUMBER_DOUBLE_QUOTE, DOUBLE_QUOTE)
            .replaceAll(ESCAPED_SINGLE_QUOTE, SINGLE_QUOTE)
            .replaceAll(ESCAPED_NUMBER_SINGLE_QUOTE, SINGLE_QUOTE)
            .replaceAll(ESCAPED_SLASH, SLASH)
            .replaceAll(ESCAPED_NUMBER_SLASH, SLASH)
            .replaceAll(ESCAPED_ACUTE_ACCENT_E, ACUTE_ACCENT_E)
            .replaceAll(ESCAPED_BACK_SLASH, BACK_SLASH)
            .replaceAll(ESCAPED_SPACE, SPACE)
            .replaceAll(ESCAPED_HYPHEN, HYPHEN);
    }
}

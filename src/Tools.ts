"use strict";

import { cloneDeep } from "lodash";

import type { ModchatLevel } from "../types/Room";
import type { AuthLevel, GroupSymbol, GroupNames } from "../types/UserGroups";

const MODCHAT_REGEX =
    /<div class="broadcast-red"><strong>Moderated chat was set to (?<level>(unlocked|autoconfirmed|whitelist|trusted|&|#|★|\*|@|%|☆|§|\+|\^))!<\/strong><br \/>Only users of rank (unlocked|autoconfirmed|whitelist|trusted|&|#|★|\*|@|%|☆|§|\+|\^) and higher can talk.<\/div>/;
('<div class="broadcast-red"><strong>Moderated chat was set to ^!</strong><br />Only users of rank ^ and higher can talk.</div>');
const MODCHAT_DISABLE_STRING =
    '<div class="broadcast-blue"><strong>Moderated chat was disabled!</strong><br />Anyone may talk now.</div>';

const MODJOIN_AC_STRING =
    '<div class="broadcast-red"><strong>Moderated join is set to autoconfirmed!</strong><br />Users must be rank autoconfirmed or invited with <code>/invite</code> to join</div>';
const MODJOIN_SYNC_STRING =
    '<div class="broadcast-red"><strong>Moderated join is set to sync with modchat!</strong><br />Only users who can speak in modchat can join.</div>';
const MODJOIN_DISABLE_STRING =
    '<div class="broadcast-blue"><strong>This room is no longer invite only!</strong><br />Anyone may now join.</div>';
const MODJOIN_REGEX =
    /<div class="broadcast-red"><strong>This room is now invite only!<\/strong><br \/>Users must be rank (?<level>(unlocked|autoconfirmed|whitelist|trusted|&|#|★|\*|@|%|☆|§|\+|\^)) or invited with <code>\/invite<\/code> to join<\/div>/;

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
    static readonly auths: AuthLevel[] = [
        "~",
        "&",
        "#",
        "★",
        "*",
        "@",
        "%",
        "☆",
        "§",
        "+",
        "whitelist",
        "trusted",
        "^",
        "autoconfirmed",
        " ",
        "unlocked",
        "!",
        "‽",
    ];

    static readonly rankSymbols: Array<GroupSymbol> = [
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

    static readonly rankNames: Array<GroupNames> = [
        "admin",
        "roomowner",
        "bot",
        "mod",
        "host",
        "driver",
        "sectionleader",
        "player",
        "voice",
        "prizewinner",
        "normal",
        "muted",
        "locked",
    ];

    static readonly ranks = {
        admin: "&",
        roomowner: "#",
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

    static toGroupName(rank: GroupSymbol): GroupNames;
    static toGroupName(rank: string): GroupNames;
    static toGroupName(rank: string): GroupNames {
        if (rank === "~") rank = "&";
        else if (!this.rankSymbols.includes(rank as GroupSymbol)) rank = " ";
        return this.rankNames[this.rankSymbols.indexOf(rank as GroupSymbol) - 1]!;
    }

    static toGroupSymbol(rank: GroupNames): GroupSymbol;
    static toGroupSymbol(rank: string): GroupSymbol;
    static toGroupSymbol(rank: string): GroupSymbol {
        rank = this.toId(rank);
        if (!this.rankNames.includes(rank as GroupNames)) rank = "voice";
        return this.rankSymbols[this.rankNames.indexOf(rank as GroupNames) + 1]!;
    }

    static sortByAuth(arr: AuthLevel[]): AuthLevel[] {
        const clone = this.clone(arr);
        clone.sort((a, b) => this.auths.indexOf(a) - this.auths.indexOf(b));
        return clone;
    }

    static sortByRank(arr: GroupSymbol[]): GroupSymbol[] {
        const clone = this.clone(arr);
        clone.sort((a, b) => this.rankSymbols.indexOf(a) - this.rankSymbols.indexOf(b));
        return clone;
    }

    static isHigherAuth(comparePosition: AuthLevel | null, base: AuthLevel | null, strict?: boolean): boolean {
        if (comparePosition === base) return !strict;
        return (
            [comparePosition ?? " ", base ?? " "].toString() ===
            this.sortByAuth([comparePosition ?? " ", base ?? " "]).toString()
        );
    }

    static isHigherRank(comparePosition: GroupSymbol, base: GroupSymbol, strict?: boolean): boolean {
        if (comparePosition === base) return !strict;
        return [comparePosition, base].toString() === this.sortByRank([comparePosition, base]).toString();
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

    static trim(content: string): string {
        return content.trim().replaceAll(/ {2,}/gimu, " ");
    }

    static isModchatHTML(content: string): ModchatLevel | false {
        if (content === MODCHAT_DISABLE_STRING) return null;
        else if (MODCHAT_REGEX.test(content)) {
            const { level } = content.match(MODCHAT_REGEX)!.groups ?? {};
            if (!level) return false;
            return level as ModchatLevel;
        } else return false;
    }

    static isModjoinHTML(content: string, modchatLevel: ModchatLevel): ModchatLevel | false {
        if (content === MODJOIN_DISABLE_STRING) return null;
        else if (content === MODJOIN_SYNC_STRING) return modchatLevel;
        else if (content === MODJOIN_AC_STRING) return "autoconfirmed";
        else if (MODJOIN_REGEX.test(content)) {
            const { level } = content.match(MODJOIN_REGEX)!.groups ?? {};
            if (!level) return false;
            return level as ModchatLevel;
        } else return false;
    }

    static clone<T>(obj: T): T {
        return cloneDeep(obj);
    }
}

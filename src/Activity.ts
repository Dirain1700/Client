"use strict";

import { User } from "./User";
import * as Tools from "./Tools";

import type { Client } from "./Client";
import type { Room } from "./Room";
import type { ActivityErrorType } from "../types/Activity";
import type {
    PrivateuHTMLOptions,
    PMuHTMLOptions,
    PrivateHTMLBoxOptions,
    PmHTMLBoxOptions,
    IHtmlPageData,
} from "../types/Room";
import type { UserOptions } from "../types/User";
import type { Dict } from "../types/utils";
// import type { IOutGoingMessage } from "../types/Client";

export abstract class Activity {
    started: boolean = false;
    signupsClosed: boolean = false;
    ended: boolean = false;
    room: Room;
    pm: User | null;
    htmlPageBase: string = "";
    htmlPages = new Map<string, string>();
    playerCount: number = 0;
    players: Dict<Player> = {};
    pastPlayers: Dict<Player> = {};
    showSignupsHtml: boolean = false;
    startTime: number | null = null;
    startTimer: NodeJS.Timer | null = null;
    timeout: NodeJS.Timer | null = null;
    client: Client;

    // set in init();
    id!: string;
    name!: string;
    uhtmlBaseName!: string;

    constructor(target: Room, user?: User) {
        if (user instanceof User) this.pm = user;
        else this.pm = null;
        this.room = target;
        this.client = target.client;
    }

    abstract forceStart(): this;
    abstract onStart(): this;
    abstract forceEnd(): this;
    abstract onEnd(): this;

    addPlayer(name: string): Player | null {
        const user = this.client.users.raw.get(Tools.toId(name));
        if (!user || !user.rooms) {
            this.sayError("USER_NOT_FOUND", name);
            return null;
        }
        const player = new Player(user, this);
        this.players[player.id] = player;
        return player;
    }

    removePlayer(name: string): Player | null {
        const player = this.players[Tools.toId(name)];
        if (!player) {
            this.sayError("USER_NOT_FOUND", name);
            return null;
        }
        delete this.players[player.id];
        this.pastPlayers[player.id] = player;
        return player;
    }

    sayError(err: ActivityErrorType, name: string): void {
        let message = "";
        switch (err) {
            case "USER_NOT_FOUND":
                message += "User not found: " + name;
                break;
        }
        if (!message) return;
        message = this.room.roomid + "|Error: " + message;
        this.client.send(message);
    }

    PMPlayer<T extends PMuHTMLOptions | PmHTMLBoxOptions | string = PMuHTMLOptions | PmHTMLBoxOptions | string>(
        userid: string,
        type: T extends string ? "text" : T extends PMuHTMLOptions ? "uhtml" : "box",
        data: T
    ): void {
        let message = "";
        switch (type) {
            case "text": {
                message += `/msg ${userid},${data}`;
                break;
            }
            case "uhtml": {
                const { id, content, edit } = data as unknown as PMuHTMLOptions;
                if (edit) message += "/pmuhtmlchange ";
                else message += "/pmuhtml ";
                message += `${userid},${id},${content}`;
                break;
            }
            case "box": {
                const { content } = data as PmHTMLBoxOptions;
                message += `/pminfobox ${userid},${content}`;
                break;
            }
        }
        if (!message) return;
        message = this.room.roomid! + "|" + message;
        this.client.send(message);
    }

    sendPrivatePlayer<
        T extends PrivateuHTMLOptions | PrivateHTMLBoxOptions = PrivateuHTMLOptions | PrivateHTMLBoxOptions
    >(userid: string, type: T extends PrivateuHTMLOptions ? "uhtml" : "box", data: T): void {
        let message = "";
        switch (type) {
            case "uhtml": {
                const { id, content, edit } = data as PrivateuHTMLOptions;
                if (edit) message += "/changeprivateuhtml ";
                else message += "/sendprivateuhtml ";
                message += `${userid},${id},${content}`;
                break;
            }
            case "box": {
                const { content } = data as PrivateHTMLBoxOptions;
                message += `/sendprivatehtmlbox ${userid},${content}`;
                break;
            }
        }
        if (!message) return;
        message = this.room.roomid! + "|" + message;
        this.client.send(message);
    }

    sendHtmlPage(userid: string, data: IHtmlPageData): void {
        const { id, content } = data;
        const message = `${this.room.roomid}|/sendhtmlpage ${userid},${id},${content}`;
        this.client.send(message);
    }
}

export class Player extends User {
    eliminated: boolean = false;
    isPlayed: boolean = false;
    online: boolean = true;
    frozen: boolean = false;
    score: number = 0;
    readonly activity;

    constructor(user: UserOptions, activity: Activity) {
        super(user, activity.client);
        this.activity = activity;
    }

    override send(content: string): void {
        this.sendText(content);
    }

    sendText(content: string): void {
        this.activity.PMPlayer<string>(this.id, "text", content);
    }

    sendPmUhtml(data: PMuHTMLOptions): void {
        this.activity.PMPlayer<PMuHTMLOptions>(this.id, "uhtml", data);
    }

    changePmUhtml(data: PMuHTMLOptions): void {
        this.activity.PMPlayer<PMuHTMLOptions>(this.id, "uhtml", data);
    }

    clearPmUhtml(id: string): void {
        this.activity.PMPlayer<PMuHTMLOptions>(this.id, "uhtml", { id, content: "<div></div>", pm: this.id });
    }

    sendPmInfobox(data: PmHTMLBoxOptions): void {
        this.activity.PMPlayer<PmHTMLBoxOptions>(this.id, "box", data);
    }

    sendPrivateUhtml(data: PrivateuHTMLOptions): void {
        this.activity.sendPrivatePlayer<PrivateuHTMLOptions>(this.id, "uhtml", data);
    }

    changePrivateUhtml(data: PrivateuHTMLOptions): void {
        this.activity.sendPrivatePlayer<PrivateuHTMLOptions>(this.id, "uhtml", data);
    }

    clearPrivateUhtml(id: string): void {
        this.activity.sendPrivatePlayer<PrivateuHTMLOptions>(this.id, "uhtml", {
            id,
            content: "<div></div>",
            private: this.id,
        });
    }

    sendPrivateBox(data: PrivateHTMLBoxOptions): void {
        this.activity.sendPrivatePlayer<PrivateHTMLBoxOptions>(this.id, "box", data);
    }

    sendHtmlPage(data: IHtmlPageData): void {
        this.activity.sendHtmlPage(this.id, data);
    }

    addPoints(points: number): this {
        this.score += points;
        return this;
    }

    removePoints(points: number): this {
        this.score -= points;
        return this;
    }

    reset(force?: boolean): this {
        this.frozen = false;
        this.eliminated = false;
        this.isPlayed = force ? false : this.isPlayed;
        this.update();
        return this;
    }

    restore(): this {
        this.frozen = false;
        this.eliminated = false;
        this.update();
        return this;
    }

    remove(): this {
        this.isPlayed = true;
        this.frozen = true;
        return this;
    }

    eliminate(): this {
        this.eliminated = true;
        this.frozen = true;
        return this;
    }
}

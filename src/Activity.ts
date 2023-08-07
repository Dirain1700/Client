"use strict";

import { Collection } from "@discordjs/collection";

import { Tools } from "./Tools";
import { User } from "./User";

import type { Client } from "./Client";
import type { Room } from "./Room";

import type { ActivityErrorType } from "../types/Activity";
import type { UserOptions } from "../types/User";

export abstract class Activity {
    started: boolean = false;
    signupsClosed: boolean = false;
    ended: boolean = false;
    room: Room;
    pm: User | null;
    htmlPageBase?: string;
    uhtmlBaseName?: string;
    htmlPages = new Map<string, string>();
    playerCount: number = 0;
    players = new Collection<string, Player>();
    pastPlayers = new Collection<string, Player>();
    showSignupsHtml: boolean = false;
    startTime: number | null = null;
    startTimer: NodeJS.Timer | null = null;
    timeout: NodeJS.Timer | null = null;
    client: Client;

    // set in init();
    id!: string;
    name!: string;

    constructor(target: Room, user?: User) {
        if (user instanceof User) this.pm = user;
        else this.pm = null;
        this.room = target;
        this.client = target.client;
        Object.defineProperty(this, "client", {
            enumerable: false,
            writable: true,
        });
    }

    abstract forceStart(): this;
    abstract onStart(): this;
    abstract forceEnd(): this;
    abstract onEnd(): this;

    getPlayer(name: string): Player | undefined {
        const id = Tools.toId(name);
        // like "Guest 0000000"
        const player = this.players.get(id) ?? this.pastPlayers.get(id);
        if (player) return player;
        if (id.startsWith("guest")) {
            return new Collection<string, Player>()
                .concat(this.players, this.pastPlayers)
                .find((u) => u.guestNumber === id.replace(/guest/i, ""));
        }
        return;
    }

    addPlayer(name: string): Player | undefined {
        if (Tools.toId(name).startsWith("guest")) return;
        const user = this.client.users.raw.get(Tools.toId(name));
        if (!user) return;
        const player = new Player(user, this);
        this.players.set(player.id, player);
        return player;
    }

    removePlayer(name: string, played?: boolean, attempt?: number): Player | undefined {
        attempt ??= 1;
        const player = this.players.get(Tools.toId(name));
        if (!player) {
            if (attempt >= 3) return;
            if (!Tools.toId(name).startsWith("guest"))
                return this.removePlayer(
                    // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
                    this.client.users.cache.find((u) => u.guestNumber === name.replace(/guest/i, ""))?.name!,
                    !!played,
                    attempt++
                );
            return;
        }
        this.players.delete(player.id);
        if (played) {
            player.remove();
            this.pastPlayers.set(player.id, player);
        }
        return player;
    }

    eliminatePlayer(name: string, attempt?: number): Player | undefined {
        attempt ??= 1;
        const player = this.players.get(Tools.toId(name));
        if (!player) {
            if (attempt >= 3) return;
            if (!Tools.toId(name).startsWith("guest"))
                return this.eliminatePlayer(
                    // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
                    this.client.users.cache.find((u) => u.guestNumber === name.replace(/guest/i, ""))?.name!,
                    attempt++
                );
            return;
        }
        player.eliminate();
        this.players.delete(player.id);
        this.pastPlayers.set(player.id, player);
        return player;
    }

    renamePlayer(oldUser: string, newUser: string): Player | undefined {
        const oldPlayer = this.getPlayer(Tools.toId(oldUser));
        if (!oldPlayer) return;
        const newId = Tools.toId(newUser);
        const user = this.client.users.raw.get(newId);
        if (!user) return;
        if (user.avatar === null) user.avatar = 1;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const newPlayer = new Player(user, this);
        newPlayer.eliminated = oldPlayer.eliminated;
        newPlayer.isPlayed = oldPlayer.isPlayed;
        newPlayer.online = true;
        newPlayer.frozen = oldPlayer.frozen;
        newPlayer.score = oldPlayer.score;
        return newPlayer;
    }

    addPoints(name: string, points: number): Player | null {
        const player = this.getPlayer(Tools.toId(name));
        if (!player) {
            return null;
        }
        return player.addPoints(points);
    }

    removePoints(name: string, points: number): Player | null {
        const player = this.getPlayer(Tools.toId(name));
        if (!player) {
            return null;
        }
        return player.removePoints(points);
    }

    sayError(err: ActivityErrorType, name: string): void {
        let message = "";
        switch (err) {
            case "USER_NOT_FOUND":
                message += "User not found: " + name;
                break;
            default:
                throw new Error("Unknown Activity error type: " + (err satisfies never));
        }
        if (!message) return;
        message = "Error: " + message;
        this.room.send(message);
    }

    sendUhtml(id: string, html: string, change?: boolean): void {
        if (change) this.room.changeUhtml(id, html);
        else this.room.sendUhtml(id, html, change);
    }

    changeUhtml(id: string, html: string): void {
        this.room.changeUhtml(id, html);
    }

    clearUhtml(id: string): void {
        this.room.clearUhtml(id);
    }

    sendPrivateUhtml(user: string, id: string, html: string, change?: boolean): void {
        if (change) this.room.changePrivateUhtml(user, id, html);
        else this.room.sendPrivateUhtml(user, id, html, change);
    }

    changePrivateUhtml(user: string, id: string, html: string): void {
        this.room.changePrivateUhtml(user, id, html);
    }

    clearPrivateUhtml(user: string, id: string): void {
        this.room.clearPrivateUhtml(user, id);
    }

    sendPrivateHtmlBox(user: string, html: string): void {
        this.room.sendPrivateHtmlBox(user, html);
    }

    sendPmUhtml(user: string, id: string, html: string, change?: boolean): void {
        if (change) this.room.changePmUhtml(user, id, html);
        else this.room.sendPmUhtml(user, id, html, change);
    }

    changePmUhtml(user: string, id: string, html: string): void {
        this.room.changePmUhtml(user, id, html);
    }

    clearPmUhtml(user: string, id: string): void {
        this.room.clearPmUhtml(user, id);
    }

    sendPmHtmlBox(user: string, html: string): void {
        this.room.sendPmHtmlBox(user, html);
    }

    sendHtmlPage(userid: string, id: string, html: string): void {
        this.room.sendHtmlPage(userid, id, html);
    }
}

export class Player extends User {
    eliminated: boolean = false;
    isPlayed: boolean = false;
    online: boolean = true;
    frozen: boolean = false;
    score: number = 0;
    readonly activity;

    constructor(user: UserOptions, activity: Activity, noinit?: boolean) {
        super(user, activity.client, !!noinit);
        this.activity = activity;
    }

    sendPrivateUhtml(id: string, html: string, change?: boolean): void {
        if (change) this.changePrivateUhtml(id, html);
        else this.activity.sendPrivateUhtml(this.userid, id, html);
    }

    changePrivateUhtml(id: string, html: string): void {
        this.activity.changePrivateUhtml(this.userid, id, html);
    }

    clearPrivateUhtml(id: string): void {
        this.activity.clearPrivateUhtml(this.userid, id);
    }

    sendPrivateHtmlBox(html: string): void {
        this.activity.sendPrivateHtmlBox(this.userid, html);
    }

    sendPmUhtml(id: string, html: string, change?: boolean): void {
        if (change) this.changePmUhtml(id, html);
        else this.activity.sendPmUhtml(this.userid, id, html);
    }

    changePmUhtml(id: string, html: string): void {
        this.activity.changePmUhtml(this.userid, id, html);
    }

    clearPmUhtml(user: string, id: string): void {
        this.activity.clearPmUhtml(this.userid, id);
    }

    sendPmHtmlBox(html: string): void {
        this.activity.sendPmHtmlBox(this.userid, html);
    }

    sendHtmlPage(id: string, html: string): void {
        this.activity.sendHtmlPage(this.id, id, html);
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

"use strict";

import { Room, User, Tools, Tournament, Player } from "../index";

import type { RoomOptions, UserOptions, Activity, EliminationBracket, RoundRobinBracket } from "../index";

/* eslint-disable @typescript-eslint/no-explicit-any */

export function createTestRoom(init?: Partial<RoomOptions>): Room {
    init ??= {};
    if (init.title) {
        init.id = Tools.toRoomId(init.title);
        init.roomid = Tools.toRoomId(init.title);
    } else {
        if (!init.id) init.id = "mocha";
        if (!init.roomid) init.roomid = "mocha";
        if (!init.title) init.title = "Mocha";
    }
    if (!init.type) init.type = "chat";

    return new Room(init as RoomOptions, global.client, true);
}

export function createTestUser(init?: Partial<UserOptions>): User {
    init ??= {};
    if (init.name) {
        init.id = Tools.toId(init.name);
        init.userid = Tools.toId(init.name);
    } else {
        if (!init.id) init.id = "mocha";
        if (!init.userid) init.userid = "mocha";
        if (!init.name) init.name = "Mocha";
    }
    if (!init.avatar) init.avatar = "elaine";
    if (!init.rooms) init.rooms = false;

    return new User(init as UserOptions, global.client, true);
}

export function createTestPlayer(activity: Activity, init?: Partial<UserOptions>): Player {
    init ??= {};
    if (init.name) {
        init.id = Tools.toId(init.name);
        init.userid = Tools.toId(init.name);
    } else {
        if (!init.id) init.id = "mocha";
        if (!init.userid) init.userid = "mocha";
        if (!init.name) init.name = "Mocha";
    }
    if (!init.avatar) init.avatar = "skierf";
    if (!init.rooms) init.rooms = false;
    return new Player(init as UserOptions, activity, true);
}

export function createTestEliminationTournament(
    format?: string,
    generator?: string,
    playerCap?: number,
    room?: Room
): Tournament<EliminationBracket> {
    if (!format) format = "gen8randombattle";
    if (!generator) generator = "Single Elimination";
    if (!playerCap) playerCap = 0;
    if (!room) room = createTestRoom();

    return new Tournament(format, generator, playerCap, room) as any as Tournament<EliminationBracket>;
}

export function createTestRoundRobinTournament(
    format?: string,
    generator?: string,
    playerCap?: number,
    room?: Room
): Tournament<RoundRobinBracket> {
    if (!format) format = "gen8randombattle";
    if (!generator) generator = "Round Robin";
    if (!playerCap) playerCap = 0;
    if (!room) room = createTestRoom();

    return new Tournament(format, generator, playerCap, room) as any as Tournament<RoundRobinBracket>;
}

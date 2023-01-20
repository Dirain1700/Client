"use strict";

import { Activity, Player } from "./Activity";
import * as Tools from "./Tools";

import type { Room } from "./Room";
import type { TourUpdateData, TourEndData, EliminationBracket, RoundRobinBracket } from "../types/Tour";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const Generators = {
    Single: 1,
    Double: 2,
    Triple: 3,
    Quadruple: 4,
    Quintuple: 5,
    Sextuple: 6,
} as const;

// T is wheather the tournament is Elimination or Round Robin
export class Tournament<T extends EliminationBracket | RoundRobinBracket = EliminationBracket> extends Activity {
    data: TourUpdateData<T> & TourEndData<T>;
    isSingleElimination: boolean;
    type: T extends EliminationBracket ? "Elimination" : "Round Robin";
    round: {
        name: keyof typeof Generators | string;
        number: number;
    };
    playerCap: number;
    forceEnded: boolean = false;

    /* eslint-disable @typescript-eslint/no-non-null-assertion */
    constructor(format: string, generator: string, playerCap: number, room: Room) {
        super(room);
        this.name = "Tournament-" + format;
        this.id = Tools.toRoomId(this.name);
        this.htmlPageBase = "";
        this.type = (generator.endsWith("Elimination") ? "Elimination" : "Round Robin") as (typeof this)["type"];
        this.data = {
            bracketData: {} as T,
            challengeBys: [],
            challenged: "",
            challenges: [],
            challenging: "",
            format: "",
            generator: "",
            isJoined: false,
            isStarted: false,
            playerCap: 0,
            results: [],
            teambuilderFormat: "",
        };
        let gen = (generator.replace(this.type, "").trim() || "Single") as (typeof this)["round"]["name"];
        if (!Object.keys(Generators).includes(gen)) gen = generator.replace(this.type, ""); // like 20-tuple
        this.data.generator = generator;
        this.round = {
            name: gen,
            number: Generators[gen as keyof typeof Generators] ?? parseInt(gen.replace("-tuple", "")),
        };
        this.data.format = format;
        this.data.playerCap = playerCap;
        this.playerCap = playerCap;
        this.isSingleElimination = this.round.number === 1;
    }

    update(data?: Partial<TourUpdateData<T> & TourEndData<T>>): this {
        if (data) Object.assign(this.data, data);
        this.type = (
            this.data.generator.endsWith("Elimination") ? "Elimination" : "Round Robin"
        ) as (typeof this)["type"];
        let gen = (this.data.generator.replace(this.type, "").trim() || "Single") as
            | (typeof this)["round"]["name"]
            | string;
        if (!Object.keys(Generators).includes(gen)) gen = this.data.generator.replace(this.type, ""); // like 20-tuple
        this.round = {
            name: gen,
            number: Generators[gen as keyof typeof Generators] ?? parseInt(gen.replace("-tuple", "")),
        };
        this.started = !!this.data.bracketData;
        this.playerCap = this.data.playerCap;
        this.room.update();
        return this;
    }

    getPlayer(userid: string): Player | undefined {
        userid = Tools.toId(userid);
        if (this.players[userid]) return this.players[userid];
        else if (this.pastPlayers[userid]) return this.pastPlayers[userid];
        else return undefined;
    }

    isElim(): this is Tournament<EliminationBracket> {
        return this.type === "Elimination";
    }

    isRR(): this is Tournament<RoundRobinBracket> {
        return this.type === "Round Robin";
    }

    forceStart(): this {
        this.client.send(`${this.room.roomid}|/tour start`);
        return this;
    }

    onStart(): this {
        this.started = true;
        this.signupsClosed = true;
        this.startTime = Date.now();
        return this;
    }

    forceEnd() {
        this.client.send(`${this.room.roomid}|/tour end`);
        return this;
    }

    onEnd(force?: boolean): this {
        this.ended = true;
        this.forceEnded = !!force;
        return this;
    }

    get getWinner(): string[] {
        if (!this.ended || this.forceEnded) return [];
        if (this.isElim()) {
            return [this.data.results[0]![0]];
        } else if (this.isRR()) {
            const users = (this as Tournament<RoundRobinBracket>).data.bracketData?.tableHeaders?.cols ?? [];
            const scores = (this as Tournament<RoundRobinBracket>).data.bracketData.scores ?? [];
            const bestScore = scores.reduce((c, p) => Math.max(c, p));
            const bestUsers: string[] = [];
            for (let i = 0; i < scores.length; i++) {
                if (scores[i] == bestScore) bestUsers.push(users[i]!);
            }
            return bestUsers;
        } else throw new Error("Generator type did not match anything");
    }
}

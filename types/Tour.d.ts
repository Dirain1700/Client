export interface TourUpdateData<T extends EliminationBracket | RoundRobinBracket = EliminationBracket> {
    format: string;
    teambuilderFormat?: string;
    isStarted: boolean;
    isJoined: boolean;
    generator: string;
    playerCap: number;
    bracketData: T;
    challenges?: string[];
    challengeBys?: string[];
    challenged?: string;
    challenging?: string;
    results: [string][];
}

export interface EliminationBracketData {
    children:
        | [
              {
                  team: string;
              },
              {
                  team: string;
              },
          ]
        | EliminationBracketData;
    state: "finished" | "inprogress" | "challenging" | "available" | "unavailable";
    team?: string;
    result?: "win" | "loss";
    score?: [number, number];
}

export interface EliminationBracket {
    type?: string; // Maybe "tree"
    rootNode?: EliminationBracketData | null;
    users?: string[];
}

export interface IRRBattleStatus {
    state: "unavailable" | "available" | "challenging" | "inprogress" | "finished";
    result?: "win" | "loss" | "draw";
    score?: [number, number];
}

export interface RoundRobinBracket {
    type?: string; //Maybe "table"
    tableHeaders?: {
        cols: string[];
        rows: string[];
    };
    tableContents: [Array<IRRBattleStatus | null>[]];
    scores: number[];
    users?: string[];
}

interface TourEndData<T extends EliminationBracket | RoundRobinBracket = EliminationBracket> {
    results: [string][];
    format: string;
    generator: string;
    bracketData: T;
}

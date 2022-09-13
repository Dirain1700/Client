export interface TourUpdateData {
    format: string;
    teambuilderFormat: string;
    isStarted: boolean;
    isJoined: boolean;
    generator: string;
    playerCap: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    bracketData: any;
    challenges: string[];
    challengeBys: string[];
    challenged: string;

    challenging: string;
}

interface PostTourData {
    results: string;
    format: string;
    generator: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    bracketData: any;
}

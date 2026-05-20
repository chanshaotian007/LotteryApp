export declare function getAdminToken(): string;
export declare function setAdminToken(token: string): void;
export declare const adminApi: {
    listJobs: () => Promise<any[]>;
    listOrders: () => Promise<any[]>;
    sync: (payload: {
        gameCode: string;
        limit: number;
    }) => Promise<any>;
    train: (payload: {
        gameCode: string;
        rollingWindow: number;
        trainingWindow: number;
        minTrainingSamples: number;
        randomSeed: number;
    }) => Promise<any>;
    grantEntitlement: (payload: {
        openId: string;
        durationDays: number;
        productCode?: string;
    }) => Promise<any>;
};

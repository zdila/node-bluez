export declare function createEventTarget<T extends {
    [key: string]: any;
}>(): {
    on: <P extends keyof T>(type: P, callback: (params: T[P]) => void) => () => void;
    off: <P_1 extends keyof T>(type: P_1, callback: (params: T[P_1]) => void) => void;
    fire: <P_2 extends keyof T>(type: P_2, params: T[P_2]) => void;
};

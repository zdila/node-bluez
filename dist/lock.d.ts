export declare function createLock(): {
    lock(): Promise<void>;
    unlock(): void;
};

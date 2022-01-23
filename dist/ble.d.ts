/// <reference types="node" />
import { Filter } from "./filterMatcher";
declare type CharacteristicChangeParams = {
    serviceId: string | null;
    characteristicId: string;
    message: Buffer;
};
export declare type DiscoverParams = {
    peripheralId: string;
    name?: string;
    rssi: number;
};
export declare type Session = ReturnType<typeof createSession>;
declare function createSession(): {
    on: <P extends "disconnect" | "discover" | "characteristicChange">(type: P, callback: (params: {
        disconnect: void;
        discover: DiscoverParams;
        characteristicChange: CharacteristicChangeParams;
    }[P]) => void) => () => void;
    off: <P_1 extends "disconnect" | "discover" | "characteristicChange">(type: P_1, callback: (params: {
        disconnect: void;
        discover: DiscoverParams;
        characteristicChange: CharacteristicChangeParams;
    }[P_1]) => void) => void;
    close: () => Promise<void>;
    discover: (filtersParam: Filter[]) => Promise<void>;
    connect: (devicePath: string) => Promise<void>;
    write: (serviceId: string | null, characteristicId: string, msg: Buffer, withResponse: boolean) => Promise<void>;
    read: (serviceId: string | null, characteristicId: string, startNotif?: boolean) => Promise<any>;
    startNotifications: (serviceId: string | null, characteristicId: string) => Promise<void>;
    stopNotifications: (serviceId: string | null, characteristicId: string) => Promise<void>;
    getServices: () => string[];
    getCharacteristics: (serviceId: string) => void;
};
export declare function initBle(): Promise<{
    createSession: typeof createSession;
    shutDown: () => Promise<void>;
}>;
export {};

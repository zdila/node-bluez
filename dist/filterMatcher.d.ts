/// <reference types="node" />
import { Buffer } from "buffer";
import { Variant } from "dbus-next";
export declare type Filter = {
    name?: string;
    namePrefix?: string;
    services?: string[];
    manufacturerData?: Record<string, {
        mask: number[];
        dataPrefix: number[];
    }>;
};
export declare type Device = {
    Name?: Variant<string>;
    Alias?: Variant<string>;
    UUIDs?: Variant<string[]>;
    ManufacturerData?: Variant<Record<string, Variant<Buffer>>>;
};
export declare function matchesFilter(device: Device, filter: Filter): boolean | undefined;

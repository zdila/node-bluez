"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.matchesFilter = void 0;
function matchesFilter(device, filter) {
    return ((filter.name === undefined ||
        device.Name?.value === filter.name ||
        device.Alias?.value === filter.name) &&
        (filter.namePrefix === undefined ||
            (device.Name?.value ?? "").startsWith(filter.namePrefix) ||
            (device.Alias?.value ?? "").startsWith(filter.namePrefix)) &&
        !filter.services?.some((uuid) => !(device.UUIDs?.value ?? []).includes(uuid)) &&
        (filter.manufacturerData === undefined ||
            (device.ManufacturerData &&
                !Object.entries(filter.manufacturerData).some(([id, value]) => {
                    const buff = device.ManufacturerData.value[id]?.value;
                    return (!buff ||
                        value.mask.length > buff.length ||
                        value.mask.some((_, i) => (buff.readUInt8(i) & value.mask[i]) !== value.dataPrefix[i]));
                }))));
}
exports.matchesFilter = matchesFilter;
//# sourceMappingURL=filterMatcher.js.map
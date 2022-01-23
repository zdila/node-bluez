"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initBle = void 0;
const dbus_next_1 = __importStar(require("dbus-next"));
const debug_1 = require("./debug");
const eventTarget_1 = require("./eventTarget");
const filterMatcher_1 = require("./filterMatcher");
const handlerErrorPropagator_1 = require("./handlerErrorPropagator");
const lock_1 = require("./lock");
const GS1 = "org.bluez.GattService1";
const GC1 = "org.bluez.GattCharacteristic1";
const D1 = "org.bluez.Device1";
const PROPS = "org.freedesktop.DBus.Properties";
let bus;
let discovering = false;
let adapterIface;
let objectManagerIface;
const deviceObjs = new Set();
const btLock = (0, lock_1.createLock)();
function createSession() {
    const { fire, on, off } = (0, eventTarget_1.createEventTarget)();
    let deviceObj;
    const charMap = new Map();
    const serviceMap = new Map();
    let filters;
    const connectCleanupTasks = [];
    const closeCleanupTasks = [];
    function getServices() {
        return [...serviceMap.values()].map((s) => s.uuid);
    }
    function getCharacteristics(serviceId) {
        const service = [...serviceMap.values()].find((s) => s.uuid === serviceId);
        service
            ? [...charMap.values()]
                .filter((c) => c.path.startsWith(service.path))
                .map((c) => c.uuid)
            : [];
    }
    async function close() {
        for (const task of [...connectCleanupTasks, ...closeCleanupTasks]) {
            task();
        }
        await Promise.all([...notifMap.values()].map((fn) => fn()));
        if (deviceObj) {
            (0, debug_1.debug)("Disconnecting device");
            const deviceIface = deviceObj.getInterface(D1);
            await deviceIface.Disconnect();
            deviceObjs.delete(deviceObj);
            // it is not fired in this case automatically
            fire("disconnect", undefined);
            (0, debug_1.debug)("Disconnected");
        }
    }
    async function discover(filtersParam) {
        filters = filtersParam;
        if (!discovering) {
            (0, debug_1.debug)("Starting discovery");
            await adapterIface.StartDiscovery();
        }
        const handle = (0, handlerErrorPropagator_1.propagateHandlerError)((path, props) => {
            handleInterfaceAdded(path, props).catch((err) => {
                console.error(err);
            });
        });
        objectManagerIface.on("InterfacesAdded", handle);
        connectCleanupTasks.push(() => {
            objectManagerIface.off("InterfacesAdded", handle);
        });
        for (const [path, props] of Object.entries(await objectManagerIface.GetManagedObjects())) {
            await handleInterfaceAdded(path, props);
        }
    }
    async function handleInterfaceAdded(path, props) {
        const device = props?.[D1];
        if (device &&
            filters?.some((filter) => (0, filterMatcher_1.matchesFilter)(device, filter))) {
            const deviceObj = await bus.getProxyObject("org.bluez", path);
            const propertiesIface = deviceObj.getInterface(PROPS);
            const handleDevicePropsChanged = (0, handlerErrorPropagator_1.propagateHandlerError)((iface, changed) => {
                (0, debug_1.debug)("Device %s props changed:", iface, changed);
                if (iface === D1 && changed.RSSI) {
                    fire("discover", {
                        peripheralId: path,
                        name: device?.Name?.value,
                        rssi: changed.RSSI instanceof dbus_next_1.Variant
                            ? Number(changed.RSSI.value)
                            : 127,
                    });
                }
            });
            propertiesIface.on("PropertiesChanged", handleDevicePropsChanged);
            connectCleanupTasks.push(() => {
                propertiesIface.off("PropertiesChanged", handleDevicePropsChanged);
            });
        }
    }
    async function connect(devicePath) {
        if (discovering) {
            (0, debug_1.debug)("Stopping discovery");
            await adapterIface.StopDiscovery();
        }
        for (const task of connectCleanupTasks) {
            task();
        }
        connectCleanupTasks.length = 0;
        (0, debug_1.debug)("Connecting to device", devicePath);
        deviceObj = await bus.getProxyObject("org.bluez", devicePath);
        deviceObjs.add(deviceObj);
        const propertiesIface = deviceObj.getInterface(PROPS);
        const srPromise = new Promise((resolve) => {
            const handlePropertiesChanges = (0, handlerErrorPropagator_1.propagateHandlerError)((iface, changed) => {
                if (iface === D1) {
                    if (changed.ServicesResolved instanceof dbus_next_1.Variant) {
                        const { value } = changed.ServicesResolved;
                        (0, debug_1.debug)("ServicesResolved:", value);
                        if (value) {
                            resolve();
                        }
                    }
                    if (changed.Connected instanceof dbus_next_1.Variant) {
                        const { value } = changed.Connected;
                        (0, debug_1.debug)("Connected:", value);
                        if (!value) {
                            fire("disconnect", undefined);
                            deviceObj = undefined;
                        }
                    }
                }
            });
            propertiesIface.on("PropertiesChanged", handlePropertiesChanges);
            closeCleanupTasks.push(() => {
                propertiesIface.off("PropertiesChanged", handlePropertiesChanges);
            });
        });
        const deviceIface = deviceObj.getInterface(D1);
        await deviceIface.Connect();
        await srPromise;
        for (const [path, props0] of Object.entries(await objectManagerIface.GetManagedObjects())) {
            const props = props0;
            if (path.startsWith(devicePath + "/service") &&
                /\/char[0-9a-z]*$/.test(path)) {
                const uuid = props[GC1].UUID.value;
                (0, debug_1.debug)("Found GATT Characteristics", uuid);
                const obj = await bus.getProxyObject("org.bluez", path);
                const iface = obj.getInterface(GC1);
                charMap.set(path, { uuid, path, iface, obj });
            }
            else if (path.startsWith(devicePath) &&
                /\/service[0-9a-z]*$/.test(path)) {
                const uuid = props[GS1].UUID.value;
                (0, debug_1.debug)("Found GATT Service", uuid);
                const isPrimary = props[GS1].Primary.value;
                const obj = await bus.getProxyObject("org.bluez", path);
                const iface = obj.getInterface(GS1);
                serviceMap.set(path, { uuid, path, iface, obj, isPrimary });
            }
        }
    }
    // TODO optimize from O(n)
    function getChar(serviceId, characteristicId) {
        const service = [...serviceMap.values()].find(serviceId ? (s) => s.uuid === serviceId : (s) => s.isPrimary);
        if (service) {
            for (const char of [...charMap.values()]) {
                if (char.uuid === characteristicId &&
                    char.path.startsWith(service.path)) {
                    return char;
                }
            }
        }
        (0, debug_1.debug)("No such characteristic", serviceId, characteristicId);
        throw new Error("no such characteristic");
    }
    async function write(serviceId, characteristicId, msg, withResponse) {
        await btLock.lock();
        try {
            await getChar(serviceId, characteristicId).iface.WriteValue(msg, {
                type: new dbus_next_1.Variant("s", withResponse ? "request" : "command"),
            });
        }
        finally {
            btLock.unlock();
        }
    }
    const notifMap = new Map();
    async function startNotifications(serviceId, characteristicId) {
        const key = serviceId + ":" + characteristicId;
        if (notifMap.has(key)) {
            console.warn("Duplicate notification subscription request for ", key);
            return;
        }
        const { iface, obj } = getChar(serviceId, characteristicId);
        await btLock.lock();
        try {
            await iface.StartNotify();
        }
        finally {
            btLock.unlock();
        }
        const propertiesIface = obj.getInterface(PROPS);
        const handleNotif = (0, handlerErrorPropagator_1.propagateHandlerError)((iface, changed) => {
            if (iface === GC1 && changed.Value instanceof dbus_next_1.Variant) {
                fire("characteristicChange", {
                    serviceId,
                    characteristicId,
                    message: changed.Value.value,
                });
            }
        });
        propertiesIface.on("PropertiesChanged", handleNotif);
        notifMap.set(key, async () => {
            propertiesIface.off("PropertiesChanged", handleNotif);
            await iface.StopNotify();
        });
    }
    async function stopNotifications(serviceId, characteristicId) {
        await notifMap.get(serviceId + ":" + characteristicId)?.();
    }
    async function read(serviceId, characteristicId, startNotif = false) {
        const { iface } = getChar(serviceId, characteristicId);
        await btLock.lock();
        try {
            const result = await iface.ReadValue({});
            if (startNotif) {
                await startNotifications(serviceId, characteristicId);
            }
            return result;
        }
        finally {
            btLock.unlock();
        }
    }
    return {
        on,
        off,
        close,
        discover,
        connect,
        write,
        read,
        startNotifications,
        stopNotifications,
        getServices,
        getCharacteristics,
    };
}
async function initBle() {
    if (bus) {
        throw new Error("already initialized");
    }
    bus = dbus_next_1.default.systemBus();
    const [bluez, hci0Obj] = await Promise.all([
        bus.getProxyObject("org.bluez", "/"),
        bus.getProxyObject("org.bluez", "/org/bluez/hci0"),
    ]);
    adapterIface = hci0Obj.getInterface("org.bluez.Adapter1");
    const propertiesIface = hci0Obj.getInterface(PROPS);
    objectManagerIface = bluez.getInterface("org.freedesktop.DBus.ObjectManager");
    discovering = (await propertiesIface.Get("org.bluez.Adapter1", "Discovering"))
        .value;
    (0, debug_1.debug)("Discovering:", discovering);
    propertiesIface.on("PropertiesChanged", (0, handlerErrorPropagator_1.propagateHandlerError)((iface, changed) => {
        (0, debug_1.debug)("Adapter %s props changed:", iface, changed);
        if (iface === "org.bluez.Adapter1" &&
            changed.Discovering instanceof dbus_next_1.Variant) {
            discovering = changed.Discovering.value;
            (0, debug_1.debug)("Discovering:", discovering);
        }
    }));
    await adapterIface.SetDiscoveryFilter({
        Transport: new dbus_next_1.Variant("s", "le"),
    });
    process.on("exit", () => {
        (0, debug_1.debug)("Exiting");
        shutDown().catch((err) => {
            console.error(err);
        });
    });
    process.on("SIGINT", () => {
        (0, debug_1.debug)("Caught interrupt signal");
        process.exit();
    });
    async function shutDown() {
        const promises = [];
        try {
            if (discovering) {
                (0, debug_1.debug)("Stopping discovery");
                promises.push(adapterIface.StopDiscovery().catch((err) => {
                    console.error("Error StopDiscovery:", err);
                }));
            }
            for (const deviceObj of deviceObjs) {
                (0, debug_1.debug)("Disconnecting");
                const deviceIface = deviceObj.getInterface(D1);
                promises.push(deviceIface.Disconnect().catch((err) => {
                    console.error("Error Disconnect:", err);
                }));
            }
        }
        finally {
            await Promise.all(promises);
        }
        bus?.disconnect();
    }
    return { createSession, shutDown };
}
exports.initBle = initBle;
//# sourceMappingURL=ble.js.map
/** The global properties of ECMAScript 2021  */
export const GLOBAL_PROPERTY_KEYS = [
    'globalThis',
    'Infinity',
    'NaN',
    'undefined',
    'eval',
    'isFinite',
    'isNaN',
    'parseFloat',
    'parseInt',
    'decodeURI',
    'decodeURIComponent',
    'encodeURI',
    'encodeURIComponent',
    'Array',
    'ArrayBuffer',
    'BigInt',
    'BigInt64Array',
    'BigUint64Array',
    'Boolean',
    'DataView',
    'Date',
    'Error',
    'EvalError',
    'FinalizationRegistry',
    'Float32Array',
    'Float64Array',
    'Function',
    'Int8Array',
    'Int16Array',
    'Int32Array',
    'Map',
    'Number',
    'Object',
    'Promise',
    'Proxy',
    'RangeError',
    'ReferenceError',
    'RegExp',
    'Set',
    'SharedArrayBuffer',
    'String',
    'Symbol',
    'SyntaxError',
    'TypeError',
    'Uint8Array',
    'Uint8ClampedArray',
    'Uint16Array',
    'Uint32Array',
    'URIError',
    'WeakMap',
    'WeakRef',
    'WeakSet',
    'Atomics',
    'JSON',
    'Math',
    'Reflect',
] as const;


type GetTupleElementType<T> = T extends { [key: number]: infer U } ? U : never;

export type GlobalPropertyKey = GetTupleElementType<typeof GLOBAL_PROPERTY_KEYS>;

export type WindowObject = typeof window;


export type RealmRecord = {
    intrinsics: WindowObject;
    globalObject: WindowObject;
};

export function getWrappedValue<T>(callerRealm: RealmRecord, value: T, valueRealm: RealmRecord): T {
    if (typeof value === 'function') {
        return createWrappedFunction(callerRealm, value, valueRealm);
    } else if (typeof value === 'object' && value) {
        // FIXME: Error object is not safe
        throw new TypeError('value must be primitive or callable');
    }
    return value;
}

type ParamsForWrappedFunction = {
    getWrappedValue: typeof getWrappedValue,
    callerRealm: RealmRecord,
    targetFunction: Function,
    targetRealm: RealmRecord,
};

function wrappedFunction(this: any) {
    // @ts-ignore: `params` is in parent scope
    const { getWrappedValue, callerRealm, targetFunction, targetRealm } = params as ParamsForWrappedFunction;
    const wrappedArgs: any[] = [];
    for (let i = 0, { length } = arguments; i < length; ++i) {
        const wrappedValue = getWrappedValue(targetRealm, arguments[i], callerRealm);
        wrappedArgs.push(wrappedValue);
    }
    // TODO: Does `this` need wrap?
    // TODO: It's risky to use `apply` directly
    const result = targetFunction.apply(targetRealm.globalObject, wrappedArgs);
    return getWrappedValue(callerRealm, result, targetRealm);
}

const codeOfWrappedFunction = `return ${wrappedFunction.toString()}`;

function createWrappedFunction(callerRealm: RealmRecord, targetFunction: Function, targetRealm: RealmRecord) {
    return callerRealm.intrinsics.Function('params', codeOfWrappedFunction)({
        getWrappedValue,
        callerRealm,
        targetFunction,
        targetRealm,
    });
}

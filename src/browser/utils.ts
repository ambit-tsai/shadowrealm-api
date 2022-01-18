import type { BuiltinShadowRealm } from './ShadowRealm';
import type { RealmRecord } from './RealmRecord';


export const globalReservedProperties = [
    // The global properties of ECMAScript 2021
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
    'AggregateError',
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

    // Easy to debug
    'console',
] as const;


export type GlobalObject = Omit<typeof window, 'globalThis'> & {
    globalThis: GlobalObject,
    ShadowRealm?: BuiltinShadowRealm,
};

export const topGlobal: GlobalObject = window as any;
export const { console, Object } = topGlobal;


export const shared = {
    debug: false,
    shims: [] as string[],
};


const { apply } = Function.prototype;

export const safeApply = topGlobal.Reflect?.apply || function (fn: Function, ctx: any, args: ArrayLike<any>) {
    return apply.call(fn, ctx, args);
};


export function getWrappedValue<T>(
    callerRealm: RealmRecord,
    value: T,
    valueRealm: RealmRecord,
): T {
    if (typeof value === 'function') {
        return createWrappedFunction(callerRealm, value, valueRealm);
    } else if (typeof value === 'object' && value) {
        throw new callerRealm.intrinsics.TypeError('value must be primitive or callable');
    }
    return value;
}


type ParamsForWrappedFunction = [
    RealmRecord,
    Function,
    RealmRecord,
    typeof getWrappedValue,
    typeof safeApply,
    typeof wrapError,
];


const codeOfWrappedFunction = 'return ' + wrappedFunctionInContext.toString();


function createWrappedFunction(
    callerRealm: RealmRecord,
    targetFunction: Function,
    targetRealm: RealmRecord,
) {
    return callerRealm.intrinsics.Function('params', codeOfWrappedFunction)([
        callerRealm,
        targetFunction,
        targetRealm,
        getWrappedValue,
        safeApply,
        wrapError,
    ] as ParamsForWrappedFunction);
}


function wrappedFunctionInContext(this: any) {
    const [
        callerRealm,
        targetFunction,
        targetRealm,
        getWrappedValue,
        safeApply,
        wrapError,
        // @ts-ignore: `params` is in parent scope
    ] = params as ParamsForWrappedFunction;
    try {
        const args = arguments;
        const wrappedArgs: any[] = [];
        for (let i = 0, { length } = args; i < length; ++i) {
            const wrappedValue = getWrappedValue(targetRealm, args[i], callerRealm);
            wrappedArgs.push(wrappedValue);
        }
        const result = safeApply(targetFunction, targetRealm.globalObject, wrappedArgs);
        return getWrappedValue(callerRealm, result, targetRealm);
    } catch (error) {
        wrapError(error, callerRealm);
    }
}


export function wrapError(error: any, { intrinsics }: RealmRecord): never {
    if (shared.debug) {
        console.log('[DEBUG]');
        console.error(error);
    }
    const isObject = typeof error === 'object' && error;
    if (isObject) {
        if (error.name === 'SyntaxError') {
            throw new intrinsics.SyntaxError(error.message);
        }
        throw new intrinsics.TypeError('Cross-Realm Error: ' + error.name + ': ' + error.message)
    }
    throw new intrinsics.TypeError('Cross-Realm Error: ' + error);
}


let { assign, keys } = Object;
if (!assign) {
    assign = function (target: Record<PropertyKey, any>) {
        const args = arguments;
        for (let i = 1, { length } = args; i < length; ++i) {
            for (const key of keys(args[i])) {
                target[key] = args[i][key];
            }
        }
        return target;
    };
}
export { assign }; 


export const URL = topGlobal.URL || topGlobal.webkitURL;

export function createUrl(url: string | URL, base: string | URL, realmRec: RealmRecord): URL {
    try {
        return new URL(url, base);
    } catch (error: any) {
        throw new realmRec.intrinsics[error.name as 'TypeError'](error.message);
    }
}

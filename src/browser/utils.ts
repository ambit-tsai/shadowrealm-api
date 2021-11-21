import type { ShadowRealmConstructor } from './main';

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


export type GlobalObject = typeof window;

export type RealmRecord = {
    intrinsics: GlobalObject;
    globalObject: GlobalObject;
};


export const waitForGarbageCollection: (
    realmRec: RealmRecord,
    shadowRealm: InstanceType<ShadowRealmConstructor>,
    iframe: HTMLIFrameElement,
) => void = window.FinalizationRegistry
    ? ({ intrinsics }, shadowRealm, iframe) => {
        // TODO: need test
        const registry = new intrinsics.FinalizationRegistry((iframe: HTMLIFrameElement) => {
            iframe.parentNode!.removeChild(iframe);
        });
        registry.register(shadowRealm, iframe);
    }
    : () => {};


const { apply } = window.Function.prototype;

export const safeApply = window.Reflect?.apply || function (fn: Function, ctx: any, args: any[]) {
    return apply.call(fn as any, ctx, args);
};

type SafeApply = typeof safeApply;


export function getWrappedValue<T>(
    callerRealm: RealmRecord,
    value: T,
    valueRealm: RealmRecord,
    TypeError = callerRealm.intrinsics.TypeError,
): T {
    if (typeof value === 'function') {
        return createWrappedFunction(callerRealm, value, valueRealm, TypeError);
    } else if (typeof value === 'object' && value) {
        throw new TypeError('value must be primitive or callable');
    }
    return value;
}

const codeOfWrappedFunction = `return ${wrappedFunctionInContext.toString()}`;

function createWrappedFunction(
    callerRealm: RealmRecord,
    targetFunction: Function,
    targetRealm: RealmRecord,
    TypeError: TypeErrorConstructor,
) {
    return callerRealm.intrinsics.Function('params', codeOfWrappedFunction)({
        getWrappedValue,
        callerRealm,
        targetFunction,
        targetRealm,
        TypeError,
        safeApply,
    });
}

type ParamsForWrappedFunction = {
    getWrappedValue: typeof getWrappedValue,
    callerRealm: RealmRecord,
    targetFunction: Function,
    targetRealm: RealmRecord,
    TypeError: TypeErrorConstructor,
    safeApply: SafeApply,
};

function wrappedFunctionInContext(this: any) {
    const {
        getWrappedValue,
        callerRealm,
        targetFunction,
        targetRealm,
        TypeError,
        safeApply,
        // @ts-ignore: `params` is in parent scope
    } = params as ParamsForWrappedFunction;
    const wrappedArgs: any[] = [];
    for (let i = 0, { length } = arguments; i < length; ++i) {
        const wrappedValue = getWrappedValue(targetRealm, arguments[i], callerRealm, TypeError);
        wrappedArgs.push(wrappedValue);
    }
    // TODO: Does `this` need wrap?
    const result = safeApply(targetFunction, targetRealm.globalObject, wrappedArgs);
    return getWrappedValue(callerRealm, result, targetRealm, TypeError);
}

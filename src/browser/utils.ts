import type { RealmRecord } from './RealmRecord';


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
export type SafeApply = typeof safeApply;
export type GetWrappedValue = typeof getWrappedValue;


const { apply } = Function.prototype;

export const safeApply = window.Reflect?.apply || function (fn: Function, ctx: any, args: ArrayLike<any>) {
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


const codeOfWrappedFunction = `return ${wrappedFunctionInContext.toString()}`;

function createWrappedFunction(
    callerRealm: RealmRecord,
    targetFunction: Function,
    targetRealm: RealmRecord,
) {
    return callerRealm.intrinsics.Function('params', codeOfWrappedFunction)({
        getWrappedValue,
        callerRealm,
        targetFunction,
        targetRealm,
        safeApply,
    });
}


type ParamsForWrappedFunction = {
    getWrappedValue: typeof getWrappedValue,
    callerRealm: RealmRecord,
    targetFunction: Function,
    targetRealm: RealmRecord,
    safeApply: SafeApply,
};


function wrappedFunctionInContext(this: any) {
    const {
        getWrappedValue,
        callerRealm,
        targetFunction,
        targetRealm,
        safeApply,
        // @ts-ignore: `params` is in parent scope
    } = params as ParamsForWrappedFunction;
    try {
        const wrappedArgs: any[] = [];
        for (let i = 0, { length } = arguments; i < length; ++i) {
            const wrappedValue = getWrappedValue(targetRealm, arguments[i], callerRealm);
            wrappedArgs.push(wrappedValue);
        }
        // TODO: Does `this` need wrap?
        const result = safeApply(targetFunction, targetRealm.globalObject, wrappedArgs);
        return getWrappedValue(callerRealm, result, targetRealm);
    } catch (err: any) {
        const isObject = typeof err === 'object' && err;
        // @ts-ignore: They are in the same context if the same `hasOwnProperty` is available.
        if ((isObject || typeof err === 'function') && err.hasOwnProperty !== hasOwnProperty) {
            if (isObject
                && typeof err.name === 'string'
                && /Error$/.test(err.name)
                && err.name in callerRealm.intrinsics
            ) {
                const Ctor: any = callerRealm.intrinsics[err.name];
                err = new Ctor(err.message);
            } else {
                err += '';
            }
        }
        throw err;
    }
}

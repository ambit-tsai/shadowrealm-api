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


export type GlobalObject = typeof window;
type SafeApply = typeof safeApply;
type InvokeWithErrorHandling = typeof invokeWithErrorHandling;


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
        invokeWithErrorHandling,
        getWrappedValue,
        callerRealm,
        targetFunction,
        targetRealm,
        safeApply,
    });
}


type ParamsForWrappedFunction = {
    invokeWithErrorHandling: InvokeWithErrorHandling,
    getWrappedValue: typeof getWrappedValue,
    callerRealm: RealmRecord,
    targetFunction: Function,
    targetRealm: RealmRecord,
    safeApply: SafeApply,
};


function wrappedFunctionInContext(this: any) {
    const args = arguments;
    const {
        invokeWithErrorHandling,
        getWrappedValue,
        callerRealm,
        targetFunction,
        targetRealm,
        safeApply,
        // @ts-ignore: `params` is in parent scope
    } = params as ParamsForWrappedFunction;
    return invokeWithErrorHandling(() => {
        const wrappedArgs: any[] = [];
        for (let i = 0, { length } = args; i < length; ++i) {
            const wrappedValue = getWrappedValue(targetRealm, args[i], callerRealm);
            wrappedArgs.push(wrappedValue);
        }
        const result = safeApply(targetFunction, targetRealm.globalObject, wrappedArgs);
        return getWrappedValue(callerRealm, result, targetRealm);
    }, callerRealm);
}


export function invokeWithErrorHandling<T>(callback: () => T, callerRealm: RealmRecord): T {
    try {
        return callback();
    } catch (err: any) {
        const isObject = typeof err === 'object' && err;
        // @ts-ignore: They are in the same context if the same `hasOwnProperty` is available.
        if ((isObject || typeof err === 'function') && err.hasOwnProperty !== callerRealm.hasOwnProperty) {
            if (isObject
                && typeof err.name === 'string'
                && /Error$/.test(err.name)
                && err.name in callerRealm.intrinsics
            ) {
                // @ts-ignore
                err = new callerRealm.intrinsics[err.name](err.message);
            } else {
                err += '';
            }
        }
        throw err;
    }
}


export const assign = Object.assign || function (target: any) {
    const args = arguments;
    for (let i = 1, len = args.length - 1; i < len; ++i) {
        for (const key of Object.keys(args[i])) {
            target[key] = args[i][key];
        }
    }
    return target;
};

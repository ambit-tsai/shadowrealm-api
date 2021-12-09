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
    safeApply: typeof safeApply,
    wrapError: typeof wrapError,
};


function wrappedFunctionInContext(this: any) {
    const {
        getWrappedValue,
        callerRealm,
        targetFunction,
        targetRealm,
        safeApply,
        wrapError,
        // @ts-ignore: `params` is in parent scope
    } = params as ParamsForWrappedFunction;
    try {
        const wrappedArgs: any[] = [];
        for (let i = 0, { length } = arguments; i < length; ++i) {
            const wrappedValue = getWrappedValue(targetRealm, arguments[i], callerRealm);
            wrappedArgs.push(wrappedValue);
        }
        const result = safeApply(targetFunction, targetRealm.globalObject, wrappedArgs);
        return getWrappedValue(callerRealm, result, targetRealm);
    } catch (error) {
        wrapError(error, callerRealm);
    }
}


export function wrapError(error: any, realmRec: RealmRecord): never {
    const isObject = typeof error === 'object' && error;
    // @ts-ignore: They are in the same context if the same `hasOwnProperty` is available.
    if ((isObject || typeof error === 'function') && error.hasOwnProperty !== realmRec.hasOwnProperty) {
        if (isObject
            && typeof error.name === 'string'
            && /Error$/.test(error.name)
            && error.name in realmRec.intrinsics
        ) {
            // @ts-ignore
            error = new realmRec.intrinsics[error.name](error.message);
        } else {
            error += '';
        }
    }
    throw error;
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

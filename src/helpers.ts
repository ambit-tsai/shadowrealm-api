import type { GlobalObject, RealmRecord } from './type';
import type { Utils } from '.';

export const GLOBAL: GlobalObject = window as any;
export const define = Object.defineProperty;
export const _ = { debug: false };

const { log: rawLog, warn } = console;

export function log(msg: any) {
    if (_.debug) {
        rawLog('[DEBUG]');
        if (isObject(msg)) {
            warn(msg);
        } else {
            rawLog(msg);
        }
    }
}

export let apply: typeof Reflect['apply'];
if (GLOBAL.Reflect) {
    apply = Reflect.apply;
} else {
    const applyOfFunction = Function.prototype.apply;
    apply = function (target: Function, ctx: any, args: ArrayLike<any>) {
        return applyOfFunction.call(target, ctx, args);
    };
}

const replaceOfString = String.prototype.replace;

export function replace(
    str: string,
    ...args: [
        string | RegExp,
        string | ((substring: string, ...args: any[]) => string)
    ]
) {
    return apply(replaceOfString, str, args);
}

export function isObject(val: any): val is Record<PropertyKey, any> {
    return val ? typeof val === 'object' : false;
}

export let { assign, keys } = Object;
if (!assign) {
    assign = function (target: Record<PropertyKey, any>) {
        const args = arguments;
        for (let i = 1, { length } = args; i < length; ++i) {
            const source = args[i];
            if (isObject(source)) {
                for (const key of keys(source)) {
                    target[key] = source[key];
                }
            }
        }
        return target;
    };
}

export function wrapError(
    reason: any,
    { intrinsics }: RealmRecord,
    captured = false
): Error {
    log(reason);
    if (captured) {
        if (!reason._) {
            return new intrinsics[reason.name as 'SyntaxError'](reason.message);
        }
        reason = reason._;
    }
    const { TypeError } = intrinsics;
    const errType = 'Cross-Realm Error: ';
    if (isObject(reason)) {
        return new TypeError(errType + reason.name + ': ' + reason.message);
    }
    return new TypeError(errType + reason);
}

export function getWrappedValue<T>(
    callerRealm: RealmRecord,
    value: T,
    valueRealm: RealmRecord,
    utils: Utils
): T {
    if (typeof value === 'function') {
        try {
            return createWrappedFunction(callerRealm, value, valueRealm, utils);
        } catch (error) {
            throw utils.wrapError(error, callerRealm);
        }
    } else if (isObject(value)) {
        throw new callerRealm.intrinsics.TypeError(
            'need primitive or callable, got ' + value
        );
    }
    return value;
}

function createWrappedFunction(
    callerRealm: RealmRecord,
    targetFunction: Function,
    targetRealm: RealmRecord,
    utils: Utils
) {
    let { length, name } = targetFunction;
    if (typeof length !== 'number' || length < 0) {
        length = 0;
    }
    if (typeof name !== 'string') {
        name = '';
    }
    const wrapped = callerRealm.intrinsics.Function(
        'params',
        'return ' + wrappedFunctionInContext.toString()
    )(arguments);
    define(wrapped, 'length', { value: length });
    define(wrapped, 'name', { value: name });
    return wrapped;
}

/**
 * Isolated function
 */
function wrappedFunctionInContext() {
    // @ts-ignore: `params` is in parent scope
    const [callerRealm, targetFunction, targetRealm, utils] = params as [
        RealmRecord,
        Function,
        RealmRecord,
        Utils
    ];
    let result;
    try {
        const args = arguments;
        const wrappedArgs: any[] = [];
        for (let i = 0, { length } = args; i < length; ++i) {
            const wrappedValue = utils.getWrappedValue(
                targetRealm,
                args[i],
                callerRealm,
                utils
            );
            wrappedArgs.push(wrappedValue);
        }
        result = utils.apply(
            targetFunction,
            targetRealm.globalObject,
            wrappedArgs
        );
    } catch (error) {
        throw utils.wrapError(error, callerRealm);
    }
    return utils.getWrappedValue(callerRealm, result, targetRealm, utils);
}

export const globalReservedProps = [
    // The global properties of ECMAScript 2022
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
    'Atomics',
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

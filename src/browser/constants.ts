/** Key to get raw eval */
export const NEED_RAW_EVAL = {};


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

export type WindowObject = typeof window & {
    _createReliableFn: (args: IArguments | string[]) => Function;
};

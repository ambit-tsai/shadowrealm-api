/** The global properties of ECMAScript 2021  */
const globalProperties = [
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


type GetValueType<T> = T extends { [key: number]: infer U } ? U : never;
type GlobalProperty = GetValueType<typeof globalProperties>;

export type ShadowRealmConstructor = ReturnType<typeof createShadowRealm>; 

type RealmContext = Record<GlobalProperty, any> & {
    document: never;
    location: never;
    top: never;
    window: never;
    ShadowRealm: ShadowRealmConstructor;
};
type GlobalObject = typeof window & {
    $createSafeFn: Function;
};


const codeOfCreateFunction = function (realmContext: RealmContext) {
    const { $createSafeFn } = window as GlobalObject;
    const RawFunction = Function;
    return function Function() {
        const rawFn = $createSafeFn(arguments);
        const wrapFn = $createSafeFn([`with(this)return function(){'use strict';return ${rawFn.toString()}}`]);
        const safeFn: Function = wrapFn.call(realmContext)();
        safeFn.apply = RawFunction.apply;
        return function (this: any) {
            const ctx = this === window ? undefined : this;
            return safeFn.apply(ctx, arguments);
        };
    };
}.toString();

function createSafeFunction(contentWindow: GlobalObject, realmContext: RealmContext) {
    return contentWindow.Function(`return ${codeOfCreateFunction}(this)`).call(realmContext);
}


const codeOfCreateEval = function (realmContext: RealmContext, KEY: any) {
    const { $createSafeFn } = window as GlobalObject;
    return {
        eval(x: string) {
            const safeFn = $createSafeFn([`with(this)return eval(arguments[0])`]);
            realmContext.eval = KEY;    // use raw eval
            return safeFn.call(realmContext, '"use strict";' + x);
        },
    }.eval; // fix: TS1215: Invalid use of 'eval'
}.toString();

/** KEY */
const KEY = {};

function createSafeEval(contentWindow: GlobalObject, realmContext: RealmContext) {
    return contentWindow.Function(`return ${codeOfCreateEval}(this[0], this[1])`).call([realmContext, KEY]);
}


/** defensive programming */
function safeOp(contentWindow: GlobalObject) {
    const { Function } = contentWindow;
    const { apply, call, toString } = Function;
    Function.apply = apply; // Function.prototype.apply => Function.apply
    contentWindow.$createSafeFn = function (args: IArguments | string[]) {
        const fn = Function.apply(this, args as string[]);
        fn.call = call;
        fn.toString = toString;
        return fn;
    };
    // 
    Object.defineProperty(String.prototype, 'replace', {
        configurable: false,
    });
}


const waitForGarbageCollection: (
    realm: InstanceType<ShadowRealmConstructor>,
    iframe: HTMLIFrameElement,
    context: RealmContext,
) => void = window.FinalizationRegistry
    ? (realm, iframe, context) => {
        // TODO: need test
        const registry = new context.FinalizationRegistry((iframe: HTMLIFrameElement) => {
            iframe.parentNode!.removeChild(iframe);
        });
        registry.register(realm, iframe);
    }
    : () => {};


function initContext(contentWindow: GlobalObject) {
    safeOp(contentWindow);
    
    const { Object } = contentWindow;
    const { defineProperty } = Object;
    const rawEval = contentWindow.eval;
    const context: RealmContext = Object();
    const SafeFunction = createSafeFunction(contentWindow, context);
    const safeEval = createSafeEval(contentWindow, context);
    const SafeShadowRealm = createSafeShadowRealm(contentWindow);

    for (const key of Object.getOwnPropertyNames(contentWindow)) {
        const isExisted = globalProperties.indexOf(key as any) !== -1;
        const descriptor = <PropertyDescriptor> Object.getOwnPropertyDescriptor(contentWindow, key);
        if (key === 'eval') {
            let isInnerCall = false;
            defineProperty(context, key, {
                get() {
                    if (isInnerCall) {
                        isInnerCall = false;
                        return rawEval;
                    }
                    return safeEval;
                },
                set(val) {
                    if (val === KEY) isInnerCall = true;
                },
            });
        } else if (isExisted) {
            defineProperty(context, key, descriptor);
        }
        if (descriptor.configurable) {
            delete contentWindow[key as any];
        } else if (!isExisted) {
            // Block properties that cannot be deleted
            defineProperty(context, key, {
                value: undefined,
            });
        }
    }
    context.globalThis = context;
    context.Function = SafeFunction;
    defineProperty(context, 'ShadowRealm', {
        configurable: true,
        writable: true,
        value: SafeShadowRealm,
    });
    return context;
}


function createShadowRealm(
    contentWindow: GlobalObject,
    intCtx: typeof initContext,
    waitForGC: typeof waitForGarbageCollection,
) {
    const { TypeError, document, Object, String } = contentWindow;
    /** 
     * ShadowRealm Polyfill Class
     * https://tc39.es/proposal-shadowrealm
     */
    return class ShadowRealm {
        __eval!: typeof eval;
        __Function!: FunctionConstructor;
    
        constructor() {
            if (!(this instanceof ShadowRealm)) {
                throw new TypeError("Constructor ShadowRealm requires 'new'");
            }
            const iframe = document.createElement('iframe');
            iframe.name = 'ShadowRealm';
            document.head.appendChild(iframe);
            const context = intCtx(iframe.contentWindow as any);
            Object.defineProperty(this, '__eval', { value: context.eval });
            Object.defineProperty(this, '__Function', { value: context.Function });
            waitForGC(this, iframe, context);
        }
    
        evaluate(sourceText: string) {
            if (typeof sourceText !== 'string') {
                throw new TypeError('Cannot call evaluate with non-string');
            }
            // TODO: eval in strict mode?
            return this.__eval(sourceText);
        }
    
        importValue(specifier: string, bindingName?: string): Promise<any> {
            specifier = String(specifier);
            if (bindingName !== undefined) {
                bindingName = String(bindingName);
            }
            return this.__Function('m', 'return import(m)')(specifier).then((module: any) => {
                return bindingName ? module[bindingName] : module;
            });
        }
    }
}


const codeOfCreateShadowRealm = createShadowRealm.toString();

export function createSafeShadowRealm(contentWindow: GlobalObject) {
    return contentWindow.Function(`return ${codeOfCreateShadowRealm}.apply({}, arguments)`)(
        contentWindow,
        initContext,
        waitForGarbageCollection,
    );
}

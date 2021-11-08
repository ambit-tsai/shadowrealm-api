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
type GlobalContext = Omit<typeof window, 'globalThis'> & {
    globalThis: RealmContext;
};


const codeOfCreateFunction = function (realmContext: RealmContext) {
    const RawFunction = Function;
    return function Function() {
        const rawFn = RawFunction.apply({}, arguments as any);
        rawFn.toString = RawFunction.toString;  // defensive programming
        const wrapFn = RawFunction(`with(this)return function(){'use strict';return ${rawFn.toString()}}`);
        wrapFn.call = RawFunction.call;
        const safeFn: Function = wrapFn.call(realmContext)();
        safeFn.apply = RawFunction.apply;
        return function (this: any) {
            const ctx = this === window ? undefined : this;
            return safeFn.apply(ctx, arguments);
        };
    };
}.toString();

function createSafeFunction(contentWindow: GlobalContext, realmContext: RealmContext) {
    return contentWindow.Function(`return ${codeOfCreateFunction}(this)`).call(realmContext);
}


const codeOfSafeEval = {
    eval(text: string) {
        const params = Object.defineProperty({}, 'arguments', {
            get: () => {
                throw new ReferenceError('arguments is not defined');
            },
        });
        const code = Function(text).toString().replace(/^[^(]+\(/, 'with(this');
        return Function("return eval('with(arguments[0])'+arguments[1])").call(globalThis, params, code);
    },
}.eval.toString();  // fix: TS1215: Invalid use of 'eval'

function createSafeEval(contentWindow: GlobalContext) {
    return contentWindow.Function(`return ${codeOfSafeEval}`)();
}


const exclusionList = [
    'eval',
    'FinalizationRegistry',
    'Object',
    'ReferenceError',
    'String',
    'TypeError',
    'console',  // FIXME:
];

const waitForGarbageCollection: (
    realm: InstanceType<ShadowRealmConstructor>,
    iframe: HTMLIFrameElement,
    context: RealmContext,
    // @ts-ignore
) => void = window.FinalizationRegistry
    ? (realm, iframe, context) => {
        // TODO: need test
        const registry = new context.FinalizationRegistry((iframe: HTMLIFrameElement) => {
            iframe.parentNode!.removeChild(iframe);
        });
        registry.register(realm, iframe);
    }
    : () => {};

function initContext(contentWindow: GlobalContext) {
    const { Function } = contentWindow;
    Function.apply = Function.apply;    // Function.prototype.apply => Function.apply
    Function.call = Function.call;
    Function.toString = Function.toString;

    const { Object, ReferenceError } = contentWindow;
    const context: RealmContext = Object();
    const SafeFunction = createSafeFunction(contentWindow, context);

    for (const key of Object.getOwnPropertyNames(contentWindow)) {
        const isExisted = globalProperties.indexOf(key as any) !== -1;
        const descriptor = <PropertyDescriptor> Object.getOwnPropertyDescriptor(contentWindow, key);
        if (isExisted) {
            Object.defineProperty(context, key, descriptor);
        }
        if (descriptor.configurable) {
            // Some global props were used in `createShadowRealm`, safe `eval` or safe `Function`
            if (exclusionList.indexOf(key) === -1) {
                delete contentWindow[key as any];
            }
        } else if (!isExisted) {
            // Block properties that cannot be deleted
            let val: any;
            Object.defineProperty(context, key, {
                configurable: false,
                enumerable: true,
                get() {
                    if (val) return val;
                    throw new ReferenceError(`${key} is not defined`);
                },
                set: v => val = v,
            });
        }
    }
    contentWindow.globalThis = context; // this `globalThis` was used in safe `eval` and `Function`
    context.globalThis = context;
    context.eval = createSafeEval(contentWindow);
    context.Function = SafeFunction;
    Object.defineProperty(context, 'ShadowRealm', {
        configurable: true,
        writable: true,
        value: createSafeShadowRealm(contentWindow),
    });
    return context;
}

function createShadowRealm(intCtx: typeof initContext, waitForGC: typeof waitForGarbageCollection) {
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

const codeOfSafeShadowRealm = createShadowRealm.toString();

export function createSafeShadowRealm(contentWindow: GlobalContext) {
    return contentWindow.Function(`return ${codeOfSafeShadowRealm}.apply({}, arguments)`)(
        initContext,
        waitForGarbageCollection,
    );
}

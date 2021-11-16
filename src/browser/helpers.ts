import { GLOBAL_PROPERTY_KEYS, GlobalPropertyKey, WindowObject } from './constants';

export type ShadowRealmConstructor = ReturnType<typeof createSafeShadowRealm>; 

type RealmContext = {
    document: void;
    location: void;
    top: void;
    window: void;
    ShadowRealm: ShadowRealmConstructor;
    globalThis: RealmContext;
} & Omit<{
    [key in GlobalPropertyKey]: WindowObject[key];
}, 'globalThis'>;


const utils = {
    createShadowRealm,
    createRealmContext,
    GLOBAL_PROPERTY_KEYS,
};

type Utils = typeof utils;


const codeOfCreateSafeShadowRealm = `(${createSafeShadowRealm.toString()})`;

export function createShadowRealm(contentWindow: WindowObject): ShadowRealmConstructor {
    return contentWindow.eval(codeOfCreateSafeShadowRealm)(utils);
}


function createSafeShadowRealm({ createRealmContext }: Utils) {
    const {
        FinalizationRegistry,
        TypeError,
        document,
        Object: { defineProperty },
        String,
    } = window;

    const waitForGarbageCollection: (
        realm: InstanceType<ShadowRealmConstructor>,
        iframe: HTMLIFrameElement,
        context: RealmContext,
    ) => void = FinalizationRegistry
        ? (realm, iframe, context) => {
            // TODO: need test
            const registry = new context.FinalizationRegistry((iframe: HTMLIFrameElement) => {
                iframe.parentNode!.removeChild(iframe);
            });
            registry.register(realm, iframe);
        }
        : () => {};

    return class ShadowRealm {
        __eval?: typeof eval;
        __import?: (x: string) => Promise<any>;
    
        constructor() {
            if (!(this instanceof ShadowRealm)) {
                throw new TypeError("Constructor ShadowRealm requires 'new'");
            }
            const iframe = document.createElement('iframe');
            iframe.name = 'ShadowRealm';
            document.head.appendChild(iframe);
            const context = createRealmContext(iframe.contentWindow as WindowObject);
            defineProperty(this, '__eval', { value: context.eval });
            defineProperty(this, '__import', {
                value: context.Function('m', 'return import(m)'),
            });
            waitForGarbageCollection(this, iframe, context);
        }
    
        evaluate(sourceText: string) {
            if (typeof sourceText !== 'string') {
                throw new TypeError('evaluate expects a string');
            }
            return this.__eval!(sourceText);
        }
    
        importValue(specifier: string, bindingName: string): Promise<any> {
            specifier = String(specifier);
            if (bindingName !== undefined) {
                bindingName = String(bindingName);
            }
            return this.__import!(specifier).then((module: any) => {
                if (!(bindingName in module)) {
                    throw new TypeError(`${specifier} has no export named ${bindingName}`);
                }
                return module[bindingName];
            });
        }
    }
}



const codeOfCreateSafeRealmContext = `(${createSafeRealmContext.toString()})`;

function createRealmContext(contentWindow: WindowObject): RealmContext {
    return contentWindow.eval(codeOfCreateSafeRealmContext)(utils);
}


function createSafeRealmContext({ createShadowRealm, GLOBAL_PROPERTY_KEYS }: Utils) {
    const { Object, Function, eval: rawEval } = window;
    const { defineProperty } = Object;
    const { apply, call, toString } = Function;
    const RawFunction = Function;
    const USE_RAW_EVAL = {};

    const realmContext = defineProperty({} as RealmContext, 'ShadowRealm', {
        configurable: true,
        writable: true,
        value: createShadowRealm(window),
    });
    if (Symbol.unscopables) {
        defineProperty(realmContext, Symbol.unscopables, {
            value: {},
        });
    }
    for (const key of Object.getOwnPropertyNames(window)) {
        const isExisted = GLOBAL_PROPERTY_KEYS.indexOf(key as any) !== -1;
        const descriptor = <PropertyDescriptor> Object.getOwnPropertyDescriptor(window, key);
        if (key === 'eval') {
            defineEval(realmContext);
        } else if (isExisted) {
            defineProperty(realmContext, key, descriptor);              // copy to new context
        }
        if (descriptor.configurable) {
            delete window[key as any];
        } else if (!isExisted) {
            defineProperty(realmContext, key, { value: undefined });    // block properties that cannot be deleted
        }
    }
    realmContext.globalThis = realmContext;
    realmContext.Function = createFunction(realmContext);
    return realmContext;


    function defineEval(realmContext: RealmContext) {
        let isInnerCall = false;
        const newEval = createEval(realmContext);
        defineProperty(realmContext, 'eval', {
            get() {
                if (isInnerCall) {
                    isInnerCall = false;
                    return rawEval; // used by safe eval
                }
                return newEval;
            },
            set(val) {
                if (val === USE_RAW_EVAL) isInnerCall = true;
            },
        });
    }


    function createEval(realmContext: RealmContext) {
        const safeFn = Function('with(this)return eval(arguments[0])');
        safeFn.call = call;
        return {
            eval(x: string) {
                // @ts-ignore: use raw eval
                realmContext.eval = USE_RAW_EVAL;
                return safeFn.call(realmContext, '"use strict";' + x);
            },
        }.eval; // fix: TS1215: Invalid use of 'eval'
    }


    function createFunction(realmContext: RealmContext): FunctionConstructor {
        function Function() {
            const rawFn = RawFunction.apply(null, arguments as any);
            rawFn.toString = toString;
            const wrapFn = RawFunction(`with(this)return function(){'use strict';return ${rawFn.toString()}}`);
            wrapFn.call = call;
            const safeFn: Function = wrapFn.call(realmContext)();
            safeFn.apply = apply;
            return function (this: any) {
                const ctx = this === window ? undefined : this;
                return safeFn.apply(ctx, arguments);
            };
        }
        RawFunction.prototype.constructor = Function;
        return Function as any;
    }
}

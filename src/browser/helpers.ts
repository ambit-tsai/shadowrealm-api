import { GLOBAL_PROPERTY_KEYS, GlobalPropertyKey, WindowObject, NEED_RAW_EVAL } from './constants';


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


function createSafeFunction(realmContext: RealmContext) {
    const { _createReliableFn } = window as WindowObject;
    const RawFunction = Function;
    return function Function() {
        const rawFn = _createReliableFn(arguments);
        const wrapFn = _createReliableFn([`with(this)return function(){'use strict';return ${rawFn.toString()}}`]);
        const safeFn: Function = wrapFn.call(realmContext)();
        safeFn.apply = RawFunction.apply;
        return function (this: any) {
            const ctx = this === window ? undefined : this;
            return safeFn.apply(ctx, arguments);
        };
    };
}

const codeOfCreateSafeFunction = `return ${createSafeFunction.toString()}.apply({}, arguments)`;

function createFunction(contentWindow: WindowObject, realmContext: RealmContext): FunctionConstructor {
    return contentWindow.Function(codeOfCreateSafeFunction)(realmContext);
}


function createSafeEval(realmContext: RealmContext, NEED_RAW_EVAL: any) {
    const { _createReliableFn } = window as WindowObject;
    const safeFn = _createReliableFn([`with(this)return eval('"use strict";' + arguments[0])`]);
    return {
        eval(x: string) {
            realmContext.eval = NEED_RAW_EVAL;  // use raw eval
            return safeFn.call(realmContext, x);
        },
    }.eval; // fix: TS1215: Invalid use of 'eval'
}

const codeOfCreateSafeEval = `return ${createSafeEval.toString()}.apply({}, arguments)`;

function createEval(contentWindow: WindowObject, realmContext: RealmContext): typeof eval {
    return contentWindow.Function(codeOfCreateSafeEval)(realmContext, NEED_RAW_EVAL);
}


function defineEval(
    Object: ObjectConstructor,
    realmContext: RealmContext,
    rawEval: typeof eval,
    newEval: typeof eval,
    NEED_RAW_EVAL: any,
) {
    let isInnerCall = false;
    Object.defineProperty(realmContext, 'eval', {
        get() {
            if (isInnerCall) {
                isInnerCall = false;
                return rawEval; // used by safe eval
            }
            return newEval;
        },
        set(val) {
            if (val === NEED_RAW_EVAL) {
                isInnerCall = true;
            }
        },
    });
}

const codeOfDefineEval = `(${defineEval.toString()}).apply({}, arguments)`;


/**
 * Defensive operation
 */
function onBeforeInit(contentWindow: WindowObject) {
    const { Function } = contentWindow;
    const { apply, call, toString } = Function;
    Function.apply = apply;     // Function.prototype.apply => Function.apply
    contentWindow._createReliableFn = function (args: IArguments | string[]) {
        const fn = Function.apply(this, args as string[]);
        fn.call = call;
        fn.toString = toString;
        return fn;
    };
}


function initRealmContext(contentWindow: WindowObject) {
    onBeforeInit(contentWindow);
    
    const { Object, Function } = contentWindow;
    const { defineProperty } = Object;
    const rawEval = contentWindow.eval;
    const realmContext: RealmContext = Object();
    const NewFunction = createFunction(contentWindow, realmContext);
    const newEval = createEval(contentWindow, realmContext);
    const NewShadowRealm = createShadowRealm(contentWindow);

    for (const key of Object.getOwnPropertyNames(contentWindow)) {
        const isExisted = GLOBAL_PROPERTY_KEYS.indexOf(key as any) !== -1;
        const descriptor = <PropertyDescriptor> Object.getOwnPropertyDescriptor(contentWindow, key);
        if (key === 'eval') {
            Function(codeOfDefineEval)(
                Object,
                realmContext,
                rawEval,
                newEval,
                NEED_RAW_EVAL
            );
        } else if (isExisted) {
            defineProperty(realmContext, key, descriptor);              // copy to new context
        }
        if (descriptor.configurable) {
            delete contentWindow[key as any];
        } else if (!isExisted) {
            defineProperty(realmContext, key, { value: undefined });    // block properties that cannot be deleted
        }
    }
    realmContext.globalThis = realmContext;
    realmContext.Function = NewFunction;
    defineProperty(realmContext, 'ShadowRealm', {
        configurable: true,
        writable: true,
        value: NewShadowRealm,
    });
    return realmContext;
}


function createSafeShadowRealm(intCtx: typeof initRealmContext, waitForGC: typeof waitForGarbageCollection) {
    const {
        TypeError,
        document,
        Object: { defineProperty },
        String,
    } = window;
    /** 
     * ShadowRealm Polyfill Class
     * https://tc39.es/proposal-shadowrealm
     */
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
            const context = intCtx(iframe.contentWindow as WindowObject);
            defineProperty(this, '__eval', { value: context.eval });
            defineProperty(this, '__import', {
                value: context.Function('m', 'return import(m)'),
            });
            waitForGC(this, iframe, context);
        }
    
        evaluate(sourceText: string) {
            if (typeof sourceText !== 'string') {
                throw new TypeError('Cannot call evaluate with non-string');
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
                    throw new TypeError(`The module does not export "${bindingName}"`);
                }
                return module[bindingName];
            });
        }
    }
}


const codeOfCreateSafeShadowRealm = `return ${createSafeShadowRealm.toString()}.apply({}, arguments)`;

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


export function createShadowRealm(contentWindow: WindowObject): ShadowRealmConstructor {
    return contentWindow.Function(codeOfCreateSafeShadowRealm)(
        initRealmContext,
        waitForGarbageCollection,
    );
}

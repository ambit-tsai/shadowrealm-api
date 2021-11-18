import { GLOBAL_PROPERTY_KEYS, WindowObject, RealmRecord, getWrappedValue } from './utils';

export type ShadowRealmConstructor = ReturnType<typeof createSafeShadowRealm>; 


const utils = {
    createShadowRealm,
    createRealmRecord,
    getWrappedValue,
    GLOBAL_PROPERTY_KEYS,
};

type Utils = typeof utils;


const codeOfCreateSafeShadowRealm = `(${createSafeShadowRealm.toString()})`;

export function createShadowRealm(contentWindow: WindowObject): ShadowRealmConstructor {
    return contentWindow.eval(codeOfCreateSafeShadowRealm)(utils);
}


function createSafeShadowRealm({ createRealmRecord, getWrappedValue }: Utils) {
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
        context: RealmRecord,
    ) => void = FinalizationRegistry
        ? (shadowRealm, iframe, { intrinsics }) => {
            // TODO: need test
            const registry = new intrinsics.FinalizationRegistry((iframe: HTMLIFrameElement) => {
                iframe.parentNode!.removeChild(iframe);
            });
            registry.register(shadowRealm, iframe);
        }
        : () => {};

    return class ShadowRealm {
        __realm?: RealmRecord;
        __import?: (x: string) => Promise<any>;
    
        constructor() {
            if (!(this instanceof ShadowRealm)) {
                throw new TypeError("Constructor ShadowRealm requires 'new'");
            }
            const iframe = document.createElement('iframe');
            iframe.name = 'ShadowRealm';
            document.head.appendChild(iframe);
            const realmRec = createRealmRecord(iframe.contentWindow as WindowObject);
            defineProperty(this, '__realm', { value: realmRec });
            defineProperty(this, '__import', {
                value: realmRec.globalObject.Function('m', 'return import(m)'),
            });
            waitForGarbageCollection(this, iframe, realmRec);
        }
    
        evaluate(sourceText: string) {
            if (typeof sourceText !== 'string') {
                throw new TypeError('evaluate expects a string');
            }
            const result = this.__realm!.globalObject.eval(sourceText);
            return getWrappedValue(
                { intrinsics: window, globalObject: window },
                result,
                this.__realm!,
            );
        }
    
        importValue(specifier: string, bindingName: string): Promise<any> {
            specifier = String(specifier);
            if (bindingName !== undefined) {
                bindingName = String(bindingName);
            }
            // FIXME: `import()` works under the global scope
            return this.__import!(specifier).then((module: any) => {
                if (!(bindingName in module)) {
                    throw new TypeError(`${specifier} has no export named ${bindingName}`);
                }
                return getWrappedValue(
                    { intrinsics: window, globalObject: window },
                    module[bindingName],
                    this.__realm!,
                );
            });
        }
    }
}



const codeOfCreateSafeRealmRecord = `(${createSafeRealmRecord.toString()})`;

function createRealmRecord(contentWindow: WindowObject): RealmRecord {
    return contentWindow.eval(codeOfCreateSafeRealmRecord)(utils);
}

function createSafeRealmRecord({ createShadowRealm, GLOBAL_PROPERTY_KEYS }: Utils): RealmRecord {
    const { Object, Function } = window;
    const { defineProperty } = Object;
    const { apply, call, toString } = Function;
    const RawFunction = Function;

    const intrinsics = {} as WindowObject;
    const globalObject = defineProperty({} as WindowObject, 'ShadowRealm', {
        configurable: true,
        writable: true,
        value: createShadowRealm(window),
    });

    if (Symbol.unscopables) {
        defineProperty(globalObject, Symbol.unscopables, {
            value: {},
        });
    }

    for (const key of Object.getOwnPropertyNames(window)) {
        const descriptor = <PropertyDescriptor> Object.getOwnPropertyDescriptor(window, key);
        defineProperty(intrinsics, key, descriptor);
        const isExisted = GLOBAL_PROPERTY_KEYS.indexOf(key as any) !== -1;
        if (key === 'eval') {
            defineEval();
        } else if (isExisted) {
            defineProperty(globalObject, key, descriptor);  // copy to new context
        }
        if (descriptor.configurable) {
            delete window[key as any];
        } else if (!isExisted) {
            // Intercept properties that cannot be deleted
            defineProperty(globalObject, key, {
                writable: true,
                value: undefined,
            });
        }
    }
    // @ts-ignore: `globalThis` is not readonly
    globalObject.globalThis = globalObject;
    globalObject.Function = createFunction();
    // TODO: Block the props of EventTarget.prototype
    return {
        intrinsics,
        globalObject,
    };


    function defineEval() {
        let isInnerCall = false;
        const newEval = createEval();
        defineProperty(globalObject, 'eval', {
            get() {
                if (isInnerCall) {
                    isInnerCall = false;
                    return intrinsics.eval; // used by safe eval
                }
                return newEval;
            },
            set(val) {
                if (val === intrinsics) isInnerCall = true;
            },
        });
    }


    function createEval() {
        const safeFn = Function('with(this)return eval(arguments[0])');
        safeFn.call = call;
        return {
            eval(x: string) {
                // @ts-ignore: Use raw eval
                globalObject.eval = intrinsics;
                return safeFn.call(globalObject, '"use strict";' + x);
            },
        }.eval; // fix: TS1215: Invalid use of 'eval'
    }


    function createFunction(): FunctionConstructor {
        RawFunction.apply = apply;
        function Function() {
            const rawFn = RawFunction.apply(null, arguments as any);
            rawFn.toString = toString;
            const wrapFn = RawFunction(`with(this)return function(){'use strict';return ${rawFn.toString()}}`);
            wrapFn.call = call;
            const safeFn: Function = wrapFn.call(globalObject)();
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

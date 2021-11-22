import { GLOBAL_PROPERTY_KEYS, GlobalObject, RealmRecord, waitForGarbageCollection, getWrappedValue, safeApply } from './utils';

export type ShadowRealmConstructor = ReturnType<typeof createShadowRealmInContext>; 


const utils = {
    createRealmRecord,
    waitForGarbageCollection,
    getWrappedValue,
    createShadowRealm,
    GLOBAL_PROPERTY_KEYS,
    safeApply,
};

type Utils = typeof utils;


const codeOfCreateShadowRealm = `(${createShadowRealmInContext.toString()})`;

export function createShadowRealm(contentWindow: GlobalObject): ShadowRealmConstructor {
    return contentWindow.eval(codeOfCreateShadowRealm)(utils);
}

function createShadowRealmInContext({ createRealmRecord, waitForGarbageCollection, getWrappedValue }: Utils) {
    const {
        TypeError,
        document,
        Object: { defineProperty },
        String,
    } = window;
    const globalRealmRec = {
        intrinsics: { Function, TypeError },
        globalObject: window,
    } as RealmRecord;
    
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
            const realmRec = createRealmRecord(iframe.contentWindow as GlobalObject);
            defineProperty(this, '__realm', { value: realmRec });
            defineProperty(this, '__import', {
                value: realmRec.globalObject.Function('m', 'return import(m)'),
            });
            waitForGarbageCollection(realmRec, this, iframe);
        }
    
        evaluate(sourceText: string) {
            if (typeof sourceText !== 'string') {
                throw new TypeError('evaluate expects a string');
            }
            const result = this.__realm!.globalObject.eval(sourceText);
            return getWrappedValue(globalRealmRec, result, this.__realm!);
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
                return getWrappedValue(globalRealmRec, module[bindingName], this.__realm!);
            });
        }
    }
}



const codeOfCreateRealmRecord = `(${createRealmRecordInContext.toString()})`;

function createRealmRecord(contentWindow: GlobalObject): RealmRecord {
    return contentWindow.eval(codeOfCreateRealmRecord)(utils);
}

function createRealmRecordInContext({ createShadowRealm, GLOBAL_PROPERTY_KEYS, safeApply }: Utils): RealmRecord {
    const win = window;
    const { Object, Function } = win;
    const { defineProperty, getOwnPropertyNames, getOwnPropertyDescriptor } = Object;

    const intrinsics = {} as GlobalObject;
    const globalObject = defineProperty({} as GlobalObject, 'ShadowRealm', {
        configurable: true,
        writable: true,
        value: createShadowRealm(win),
    });

    if (Symbol.unscopables) {
        defineProperty(globalObject, Symbol.unscopables, {
            value: Object.create(null),
        });
    }
    // Intercept the props of EventTarget.prototype
    for (const key of getOwnPropertyNames(EventTarget.prototype)) {
        defineProperty(globalObject, key, {
            writable: true,
            value: key === 'constructor' ? Object.prototype.constructor : undefined,
        });
    }

    for (const key of getOwnPropertyNames(win) as any[]) {
        const descriptor = <PropertyDescriptor> getOwnPropertyDescriptor(win, key);
        defineProperty(intrinsics, key, descriptor);
        const isExisted = GLOBAL_PROPERTY_KEYS.indexOf(key) !== -1;
        if (key === 'eval') {
            defineEval();
        } else if (isExisted) {
            defineProperty(globalObject, key, descriptor);  // copy to new global object
        }
        if (descriptor.configurable) {
            delete win[key];
        } else if (descriptor.writable) {
            win[key] = undefined as any;
        } else if (!isExisted) {
            // Intercept properties that cannot be deleted
            defineProperty(globalObject, key, {
                writable: true,
                value: undefined,
            });
        }
    }
    // @ts-ignore: `globalThis` is writable
    globalObject.globalThis = globalObject;
    globalObject.Function = createFunction();
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
        const safeEval = Function('with(this)return eval(arguments[0])');
        return {
            eval(x: string) {
                // @ts-ignore: `intrinsics` is the key to use raw `eval`
                globalObject.eval = intrinsics;
                return safeApply(safeEval, globalObject, [`'use strict';${x}`]);
            },
        }.eval; // fix: TS1215: Invalid use of 'eval'
    }


    function createFunction(): FunctionConstructor {
        const RawFunction = intrinsics.Function;
        const { toString } = RawFunction;
        function Function() {
            const rawFn = safeApply(RawFunction, null, arguments);
            const rawFnStr = safeApply(toString, rawFn, []);
            const wrapFn = RawFunction(`with(this)return function(){'use strict';return ${rawFnStr}}`);
            const safeFn: Function = safeApply(wrapFn, globalObject, [])();
            return function (this: any) {
                const ctx = this === win ? undefined : this;
                return safeApply(safeFn, ctx, arguments);
            };
        }
        RawFunction.prototype.constructor = Function;
        return Function as any;
    }
}

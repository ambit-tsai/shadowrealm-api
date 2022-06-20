import type { RealmRecord, ShadowRealm, ShadowRealmConstructor } from './type';
import type { Utils } from '.';

export function defineShadowRealmCtor(
    globalRealmRec: RealmRecord,
    utils: Utils
) {
    utils.define(globalRealmRec.globalObject, 'ShadowRealm', {
        configurable: true,
        writable: true,
        value: createShadowRealmCtor(globalRealmRec, utils),
    });
}

export function createShadowRealmCtor(
    globalRealmRec: RealmRecord,
    utils: Utils
): ShadowRealmConstructor {
    const createInContext = globalRealmRec.intrinsics.eval(
        '(' + createShadowRealmCtorInContext.toString() + ')'
    );
    const Ctor = createInContext(globalRealmRec, utils);
    utils.define(Ctor, '__debug', {
        get: () => utils._.debug,
        set: (val) => (utils._.debug = val),
    });
    return Ctor;
}

function createShadowRealmCtorInContext(
    globalRealmRec: RealmRecord,
    utils: Utils
) {
    const { Function, Promise, String, Symbol, TypeError } =
        globalRealmRec.intrinsics;
    const {
        apply,
        define,
        dynamicImportPattern,
        dynamicImportReplacer,
        getWrappedValue,
        replace,
        wrapError,
    } = utils;
    const { toString } = Function;

    /**
     * ShadowRealm Class
     */
    const Constructor = function ShadowRealm(this: ShadowRealm) {
        if (!(this instanceof Constructor)) {
            throw new TypeError('Constructor requires a new operator');
        }
        const realmRec = utils.createRealmRecord(globalRealmRec, utils);
        define(this, '__realm', { value: realmRec });
    };

    const { prototype } = Constructor;
    const TRUE = true;

    define(prototype, 'evaluate', {
        configurable: TRUE,
        writable: TRUE,
        value: evaluate,
    });
    define(prototype, 'importValue', {
        configurable: TRUE,
        writable: TRUE,
        value: importValue,
    });
    if (Symbol && Symbol.toStringTag) {
        define(prototype, Symbol.toStringTag, {
            configurable: TRUE,
            value: 'ShadowRealm',
        });
    }

    function evaluate(this: ShadowRealm, sourceText: string) {
        if (!this?.__realm?.intrinsics) {
            throw new TypeError('this is not a ShadowRealm object');
        }
        if (typeof sourceText !== 'string') {
            throw new TypeError('evaluate expects a string');
        }
        sourceText = replace(
            sourceText,
            dynamicImportPattern,
            dynamicImportReplacer
        );
        let result: any;
        try {
            result = evalWithCatch(sourceText, this.__realm);
        } catch (error) {
            throw wrapError(error, globalRealmRec, TRUE);
        }
        return getWrappedValue(globalRealmRec, result, this.__realm, utils);
    }

    function evalWithCatch(x: string, realmRec: RealmRecord) {
        x = replace(x, dynamicImportPattern, dynamicImportReplacer);
        x = apply(toString, Function(x), []);
        x =
            '"use strict";undefined;try' +
            replace(x, /[^{]+/, '') +
            'catch(e){throw{_:e}}';
        utils.log(x);
        // @ts-ignore
        realmRec.globalObject.eval = realmRec.intrinsics;
        return apply(realmRec.evalInContext, realmRec.globalObject, [x]);
    }

    function importValue(
        this: ShadowRealm,
        specifier: string,
        bindingName: string
    ) {
        if (!this?.__realm?.intrinsics) {
            throw new TypeError('this is not a ShadowRealm object');
        }
        specifier = String(specifier);
        if (typeof bindingName !== 'string') {
            throw new TypeError('bindingName is not string');
        }
        const { __realm } = this;
        return new Promise((resolve, reject) => {
            __realm.globalObject
                .__import(specifier)
                .then((exports) => {
                    if (!(bindingName in exports)) {
                        throw new TypeError(
                            '"' +
                                specifier +
                                '" has no export named "' +
                                bindingName +
                                '"'
                        );
                    }
                    const wrappedValue = getWrappedValue(
                        globalRealmRec,
                        exports[bindingName],
                        __realm,
                        utils
                    );
                    resolve(wrappedValue);
                })
                .catch((reason) => {
                    const error = wrapError(reason, globalRealmRec);
                    reject(error);
                });
        });
    }

    return Constructor;
}

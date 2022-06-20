import type { Module, RealmRecord } from '../type';
import type { Utils } from '..';

export function addEsModuleHelpers(realmRec: RealmRecord, utils: Utils) {
    const evalInContext = realmRec.intrinsics.eval(
        '(' + addEsModuleHelpersInContext.toString() + ')'
    );
    evalInContext(realmRec, utils);
}

function addEsModuleHelpersInContext(realmRec: RealmRecord, utils: Utils) {
    const { globalObject, intrinsics } = realmRec;
    const { apply, define, GLOBAL } = utils;
    const {
        Array: {
            prototype: { push },
        },
        Object: { create },
        Promise,
        Symbol,
    } = intrinsics;
    const { fetch, URL } = GLOBAL;
    const { all } = Promise;
    const { then } = Promise.prototype;

    let moduleExports: Record<PropertyKey, any> | undefined;
    const moduleCache: Record<string, Module> = {};

    define(globalObject, '__import', { value: dynamicImport });
    define(globalObject, '__from', { value: getModule });
    define(globalObject, '__export', {
        set: (val) => utils.assign(moduleExports!, val),
    });
    define(globalObject, '__default', {
        set: (val) => (moduleExports!.default = val),
    });

    function getModule(specifier: string, base: string): object {
        const { href } = new URL(specifier, base);
        const module = moduleCache[href];
        if (module && module.exports) {
            return module.exports;
        }
        throw new intrinsics.Error('Module does not exist (' + specifier + ')');
    }

    function dynamicImport(
        specifier: string,
        base = GLOBAL.location.href
    ): Promise<object> {
        const { href } = new URL(specifier, base);
        return new Promise((resolve, reject) => {
            const module = moduleCache[href];
            if (module && module.exports) {
                return resolve(module.exports);
            }
            loadModule(href)
                .then((text) => {
                    resolve(parseModule(href, text));
                })
                .catch(reject);
        });
    }

    function loadModule(href: string): Promise<string> {
        let module = moduleCache[href];
        if (module) {
            return module.promise!;
        }
        const promise = fetch(href, {
            credentials: 'same-origin',
        })
            .then((response) => {
                if (response.status === 200) {
                    return response.text();
                }
                throw {
                    _: new intrinsics.TypeError(
                        'Failed to fetch dynamically imported module: ' + href
                    ),
                };
            })
            .then(
                (sourceText) => {
                    const [text, fromList] =
                        utils.transformEsmSyntax(sourceText);
                    const promiseList: Promise<string>[] = [];
                    for (let i = 0, { length } = fromList; i < length; ++i) {
                        const { href: subHref } = new URL(fromList[i], href);
                        fromList[i] = subHref;
                        apply(push, promiseList, [loadModule(subHref)]);
                    }
                    const allPromise = apply(all, Promise, [promiseList]);
                    return apply(then, allPromise, [
                        (results: any[]) => {
                            for (
                                let i = 0, { length } = results;
                                i < length;
                                ++i
                            ) {
                                parseModule(fromList[i], results[i]);
                            }
                            return 'var __meta={url:"' + href + '"};' + text;
                        },
                    ]);
                },
                (reason) => {
                    if (reason._) {
                        throw reason._;
                    }
                    throw new intrinsics[reason.name as 'Error'](
                        reason.message
                    );
                }
            );
        module = moduleCache[href] = { promise } as Module;
        return promise;
    }

    function parseModule(href: string, text: string) {
        moduleExports = create(null);
        if (Symbol && Symbol.toStringTag) {
            define(moduleExports, Symbol.toStringTag, {
                value: 'Module',
            });
        }
        globalObject.eval(text);
        const module = moduleCache[href];
        module.exports = moduleExports!;
        moduleExports = undefined;
        return module.exports;
    }
}

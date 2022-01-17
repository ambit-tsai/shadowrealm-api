import type { RealmRecord } from '../RealmRecord';
import { shared, topGlobal, wrapError, URL, createUrl } from '../utils';
import { transform } from './helpers';


export default class ESModule {
    realmRec: RealmRecord;
    cache: Record<string, {
        exports: object,
        promise?: Promise<string>,
    }> = {};
    exports?: Record<PropertyKey, any>;
    
    constructor(realmRec: RealmRecord) {
        this.realmRec = realmRec;
    }

    get(url: string, base: string): object {
        const ctx = this;
        const { href } = createUrl(url, base, ctx.realmRec);
        const module = ctx.cache[href];
        if (module && module.exports) {
            return module.exports;
        }
        throw new ctx.realmRec.intrinsics.Error('Module does not exist');
    }

    import(specifier: string, base = location.href, realmRec?: RealmRecord): Promise<object> {
        const ctx = this;
        if (!realmRec) {
            realmRec = ctx.realmRec;
        }
        const { href } = createUrl(specifier, base, realmRec);
        return new realmRec.intrinsics.Promise((resolve, reject) => {
            ctx.load(href)
                .then(result => {
                    resolve(typeof result === 'string' ? ctx.eval(href, result) : result);
                })
                .catch(error => {
                    try {
                        wrapError(error, realmRec!);
                    } catch (newError) {
                        reject(newError);
                    }
                });
        });
    }

    load(href: string): Promise<string | object> {
        const ctx = this;
        let module = ctx.cache[href];
        if (!module) {
            module = ctx.cache[href] = {} as any;
        }
        if (module.exports) {
            return Promise.resolve(module.exports);
        } else if (module.promise) {
            return module.promise.then(() => module.exports);
        }
        module.promise = fetch(href, {
            credentials: 'same-origin',
        })
        .then(response => response.text())
        .then(sourceText => {
            const [text, froms] = transform(sourceText);
            const promises: Promise<any>[] = [];
            for (let i = 0, { length } = froms; i < length; ++i) {
                const { href: subHref } = new URL(froms[i], href);
                froms[i] = subHref;
                promises.push(ctx.load(subHref).catch(console.error));
            }
            return Promise.all(promises).then(results => {
                for (let i = 0, { length } = results; i < length; ++i) {
                    if (typeof results[i] === 'string') {
                        ctx.eval(froms[i], results[i]);
                    }
                }
                return 'var __meta={url:"' + href + '"};'+ text;
            });
        });
        return module.promise;
    }

    eval(href: string, text: string): object {
        if (shared.debug) {
            console.log('[DEBUG]\n', text);
        }
        const exports = Object.create(null);
        if (topGlobal.Symbol?.toStringTag) {
            Object.defineProperty(exports, Symbol.toStringTag, {
                value: 'Module',
            });
        }
        const ctx = this;
        ctx.exports = exports;
        ctx.realmRec.globalObject.eval(text);
        ctx.exports = undefined;
        const module = ctx.cache[href];
        module.exports = exports;
        delete module.promise;
        return exports;
    }

}

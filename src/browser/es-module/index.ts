import type { RealmRecord } from '../RealmRecord';
import { wrapError } from '../utils';
import { exportedNames, moduleSpecifiers, patternAndReplacers } from './helpers';


export default class ESModule {
    realmRec: RealmRecord;
    cache: Record<string, {
        exports: object,
        promise?: Promise<any>,
    }> = {};
    exports?: Record<PropertyKey, any>;
    
    constructor(realmRec: RealmRecord) {
        this.realmRec = realmRec;
    }

    get(specifier: string): object {
        if (this.cache[specifier]) {
            return this.cache[specifier].exports;
        }
        throw new this.realmRec.intrinsics.Error('Module does not exist');
    }

    import(specifier: string, realmRec = this.realmRec): Promise<object> {
        const { Promise } = realmRec.intrinsics;
        let module = this.cache[specifier];
        if (!module) {
            module = this.cache[specifier] = {} as any;
        }
        if (module.exports) {
            return Promise.resolve(module.exports);
        }
        return new Promise((resolve, reject) => {
            module.promise = fetch(specifier, {
                credentials: 'include',
            })
            .then((response: Response) => response.text())
            .then((sourceText: string) => {
                const [text, froms] = this.transform(sourceText);
                const modules = [];
                for (let name of froms) {
                    name = name.substring(1, name.length - 1);
                    const module = this.cache[name] || {};
                    modules.push(module.exports || module.promise || this.import(name));
                }
                return Promise.all(modules).then(() => text);
            })
            .then((text: string) => {
                if (this.realmRec.debug) {
                    console.log('[DEBUG]', specifier, text);
                }
                const exports = Object.create(null);
                if (window.Symbol?.toStringTag) {
                    Object.defineProperty(exports, Symbol.toStringTag, {
                        value: 'Module',
                    });
                }
                this.exports = exports;
                this.realmRec.globalObject.eval(text);
                this.exports = undefined;
                resolve(exports);
                module.exports = exports;
                delete module.promise;
            })
            .catch(error => {
                try {
                    wrapError(error, realmRec);
                } catch (newError) {
                    reject(newError);
                }
            });
        });
    }

    transform(sourceText: string) {
        exportedNames.length = 0;
        moduleSpecifiers.length = 0;
        for (const { p, r } of patternAndReplacers) {
            sourceText = sourceText.replace(p, r);
        }
        if (exportedNames.length) {
            sourceText += `;__export = {${exportedNames.join()}};`;
        }
        return [
            sourceText,
            moduleSpecifiers.slice(),
        ] as const;
    }

}

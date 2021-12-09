import type { RealmRecord } from '../RealmRecord';
import { wrapError } from '../utils';
import { exportedNames, moduleSpecifiers, patternAndReplacers } from './helpers';


export default class ESModule {
    realmRec: RealmRecord;
    cache: Record<string, object> = {};
    exports?: Record<PropertyKey, any>;
    
    constructor(realmRec: RealmRecord) {
        this.realmRec = realmRec;
    }

    get(specifier: string): object {
        if (this.cache[specifier]) {
            return this.cache[specifier];
        }
        throw new this.realmRec.intrinsics.Error('Module does not exist');
    }

    import(specifier: string): Promise<object> {
        const { intrinsics, globalObject } = this.realmRec;
        const { Promise } = intrinsics;
        if (this.cache[specifier]) {
            return Promise.resolve(this.cache[specifier]);
        }
        return new Promise((resolve, reject) => {
            fetch(specifier, {
                credentials: 'include',
            })
            .then((response: Response) => response.text())
            .then((sourceText: string) => {
                const [text, froms] = this.transform(sourceText);
                const modules = [];
                for (let name of froms) {
                    name = name.substring(1, name.length - 1);
                    modules.push(this.cache[name] || this.import(name));
                }
                return Promise.all(modules).then(() => text);
            })
            .then((text: string) => {
                const exports = Object.create(null);
                if (window.Symbol.toStringTag) {
                    Object.defineProperty(exports, Symbol.toStringTag, {
                        value: 'Module',
                    });
                }
                this.exports = exports;
                globalObject.eval(text);
                this.exports = undefined;
                this.cache[specifier] = exports;
                resolve(exports);
            })
            .catch(error => {
                try {
                    wrapError(error, this.realmRec)
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

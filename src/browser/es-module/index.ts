import type { RealmRecord } from '../RealmRecord';
import { assign, wrapError } from '../utils';
import { exportedNames, moduleSpecifiers, patternAndReplacers } from './helpers';


const codeOfDefineHelpers = `(${defineHelpersInContext.toString()})`;


export default class ESModule {
    realmRec: RealmRecord;
    cache: Record<string, object> = {};
    exports?: Record<PropertyKey, any>;
    
    constructor(realmRec: RealmRecord) {
        this.realmRec = realmRec;
        realmRec.intrinsics.eval(codeOfDefineHelpers)(realmRec, this, assign);
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
        console.log(sourceText);
        return [
            sourceText,
            moduleSpecifiers.slice(),
        ] as const;
    }

}


function defineHelpersInContext(realmRec: RealmRecord, esm: ESModule, assign: Function) {
    const { defineProperty } = realmRec.intrinsics.Object;
    const { prototype } = realmRec.globalObject.constructor;
    defineProperty(prototype, '__import', {
        value: (specifier: string) => esm.import(specifier),
    });
    defineProperty(prototype, '__from', {
        value: (specifier: string) => esm.get(specifier),
    });
    defineProperty(prototype, '__export', {
        set: (val) => assign(esm.exports, val),
    });
    defineProperty(prototype, '__default', {
        set: (val) => esm.exports!.default = val,
    });
}

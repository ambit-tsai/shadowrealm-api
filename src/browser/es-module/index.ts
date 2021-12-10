import type { RealmRecord } from '../RealmRecord';
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
        if (this.cache[specifier]) {
            return Promise.resolve(this.cache[specifier]);
        }
        return fetch(specifier, {
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
            if (window.Symbol?.toStringTag) {
                Object.defineProperty(exports, Symbol.toStringTag, {
                    value: 'Module',
                });
            }
            this.exports = exports;
            this.realmRec.globalObject.eval(text);
            this.exports = undefined;
            this.cache[specifier] = exports;
            return exports;
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

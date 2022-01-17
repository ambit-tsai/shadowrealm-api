const moduleSpecifiers: string[] = [];
const exportedNames: string[] = [];


/**
 * Syntax:
 *   import("module-name");  =>  __import("module-name");
 */
export const dynamicImportPattern = /\bimport\s*(\(|\/[/*])/g;
export const dynamicImportReplacer = (m: string) => '__' + m;


const exportAndImportPattern = '' +
    '\\bexport\\b(' +
        '\\s+(' +
            // export let name1, name2, …, nameN; // also var, const
            // export let name1 = …, name2 = …, …, nameN; // also var, const
            // export const { name1, name2: bar } = o;
            '(var|let|const)\\s+([^;]+)|' +
            // export function FunctionName(){...}
            '(async\\s+)?function(\\s+|\\s*\\*\\s*)([^\\s(]+)|' +
            // export class ClassName {...}
            'class\\s+([^\\s{]+)|' +
            // export default expression;
            'default\\s+(' +
                // export default function (…) { … }
                '(async\\s+)?function(\\s+|\\s*\\*\\s*)([^\\s(]+)|' +
                // export default class ClassName {...}
                'class\\s+([^\\s{]+)|' +
            ')?' +
        ')|' +
        '\\s*(' +
            // export * from …; // does not set the default export
            '\\*\\s*(' +
                // export * as name1 from …; // Draft ECMAScript® 2O21
                'as\\s+(\\S+)\\s+' +
            ')?from\\s*("[^"]+"|\'[^\']+\'|`[^`]+`)|' +
            // export { name1, variable2 as name2, …, nameN };
            // export { name1, import2 as name2, …, nameN } from …;
            // export { default } from …;
            '{([^}]+)}(\\s*from\\s*("[^"]+"|\'[^\']+\'|`[^`]+`))?' +
        ')' +
    ')|' +
    '\\bimport\\b(' +
        // import "module-name";
        '\\s*(' +
            '(' +
                // import { e1, e2, e3 as alias } from "module-name";
                '{([^}]+)}\\s*|' +
                // import * as name from "module-name";
                '\\*\\s*as\\s+(\\S+)\\s+' +
            ')from\\s*' +
        ')?|' +
        '\\s+([^{*"\'`]+)(' +
            // import defaultExport from "module-name";
            '\\s+from|' +
            '\\s*,\\s*(' +
                // import defaultExport, { export [ , [...] ] } from "module-name";
                '{([^}]+)}\\s*|' +
                // import defaultExport, * as name from "module-name";
                '\\*\\s*as\\s+(\\S+)\\s+' +
            ')from' +
        ')\\s*' +
    ')("[^"]+"|\'[^\']+\'|`[^`]+`)';


const aliasPattern = /([^\s,]+)\s+as\s+([^\s,]+)/g;


const patternAndReplacers: { p: RegExp, r: any }[] = [
    {
        p: RegExp(exportAndImportPattern, 'g'),
        r(
            m: string,
            e1: string, e2: string, e3: string, e4: string, e5: string,
            e6: string, e7: string, e8: string, e9: string, e10: string,
            e11: string, e12: string, e13: string, e14: string, e15: string,
            e16: string, e17: string, e18: string, e19: string, e20: string,
            i1: string, i2: string, i3: string, i4: string, i5: string,
            i6: string, i7: string, i8: string, i9: string, i10: string,
            specifier: string,
        ) {
            // export let name1 = …, name2 = …, …, nameN; // also var, const
            if (e4) {
                for (const str of e4.split(',')) {
                    str.replace(
                        /^\s*([^\s={}:]+)\s*($|=|})|[:{]\s*([^\s={}:]+)\s*($|=|})/, 
                        (m: string, p1: string, p2: string, p3: string) => {
                            exportedNames.push(p1 || p3);
                            return m;
                        }
                    );
                }
                return e2;
            }
            // export function FunctionName(){...}
            if (e7) {
                return '__export={' + e7 + ':' + e7 + '};' + e2;
            }
            // export class ClassName {...}
            if (e8) {
                exportedNames.push(e8);
                return e2;
            }
            // export default function (…) { … }
            if (e12) {
                return '__default=' + e12 + ';' + e9;
            }
            // export default class ClassName {...}
            if (e13) {
                exportedNames.push(e13);
                return e2;
            }
            // export default expression;
            if (e2) {
                return e2.replace(/^default/, '__default=');
            }
            if (e17) {
                moduleSpecifiers.push(e17);
                // export * as name1 from …; // Draft ECMAScript® 2O21
                if (e16) {
                    return '__export={' + e16 + ':__from(' + e17 + ',__meta.url)}';
                }
                // export * from …; // does not set the default export
                return '__export=__from(' + e17 + ',__meta.url)';
            }
            // export { name1, import2 as name2, …, nameN } from …;
            if (e20) {
                moduleSpecifiers.push(e20);
                const exports: string[] = [];
                e18.replace(/([^\s,]+)(\s+as\s+([^\s,]+))?/g, (m: string, p1: string, p2:string, p3:string) => {
                    exports.push((p3 || p1) + ':' + 'm.' + p1);
                    return  m;
                });
                return ';(function(){' +
                    'var m=__from(' + e20 + ',__meta.url);' +
                    '__export={' + exports.join() + '}' +
                '}())';
            }
            // export { name1, variable2 as name2, …, nameN };
            if (e18) {
                const params = e18.replace(aliasPattern, '$2:$1');
                return '__export={' + params + '}';
            }

            if (specifier) {
                moduleSpecifiers.push(specifier);
                const fromModule = '=__from(' + specifier + ',__meta.url)';
                // import { e1, e2, e3 as alias } from "module-name";
                if (i4) {
                    const params = i4.replace(aliasPattern, '$1:$2');
                    return 'const{' + params + '}' + fromModule;
                }
                // import * as name from "module-name";
                if (i5) {
                    return 'var ' + i5 + fromModule;
                }
                // import defaultExport, { export [ , [...] ] } from "module-name";
                if (i9) {
                    const params = i9.replace(aliasPattern, '$1:$2');
                    return 'const{' + params + '}' + fromModule + ',' + i6 + fromModule + '.default';
                }
                // import defaultExport, * as name from "module-name";
                if (i10) {
                    return 'var ' + i10 + fromModule + ',' + i6 + '=' + i10 + '.default';
                }
                // import defaultExport from "module-name";
                if (i6) {
                    return 'var ' + i6 + fromModule + '.default';
                }
                // import "module-name";
                return specifier;
            }
        },
    },
    {
        /**
         * Syntax:
         *   import.meta  =>  __meta
         */
        p: /\bimport\.meta\b/g,
        r: '__meta',
    },
    {
        p: dynamicImportPattern,
        r: dynamicImportReplacer,
    },
];


export function transform(sourceText: string) {
    for (const { p, r } of patternAndReplacers) {
        sourceText = sourceText.replace(p, r);
    }
    if (exportedNames.length) {
        for (let i = exportedNames.length - 1; i >=0; --i) {
            exportedNames[i] += ':' + exportedNames[i];
        }
        sourceText += ';__export={' + exportedNames.join() + '}';
        exportedNames.length = 0;
    }
    const froms: string[] = [];
    for (let i = 0, { length } = moduleSpecifiers; i < length; ++i) {
        const specifier = moduleSpecifiers[i];
        froms.push(specifier.substring(1, specifier.length - 1));
    }
    moduleSpecifiers.length = 0;
    return [sourceText, froms] as const;
}

export const moduleSpecifiers: string[] = [];
export const exportedNames: string[] = [];


/**
 * Syntax:
 *   import("module-name");  =>  __import("module-name");
 */
export const dynamicImportPattern = /\bimport\s*(\(|\/[/*])/g;
export const dynamicImportReplacer = (m: string) => `__${m}`;


const aliasPattern = /([^\s,]+)\s+as\s+([^\s,]+)/g;


export const patternAndReplacers: { p: RegExp, r: any }[] = [
    {
        /**
         * Syntax:
         *   export let name1, name2, …, nameN; // also var, const
         *   export let name1 = …, name2 = …, …, nameN; // also var, const
         *   export const { name1, name2: bar } = o;
         *   export function FunctionName(){...}
         *   export class ClassName {...}
         */
        p: /\bexport\s+((var|let|const)\s+([^;]+)|(async\s+)?function(\s+|\s*\*\s*)([^\s(]+)|class\s+([^\s{]+))/g,
        r(
            m: string, p1: string, p2: string, p3: string,
            p4: string, p5: string, p6: string, p7: string,
        ) {
            if (p2) {
                // MATCH: export let name1 = …, { name1, name2: bar } = o, …, nameN;
                for (const str of p3.split(',')) {
                    str.replace(/^\s*([^\s={}:]+)\s*($|=|})|[:{]\s*([^\s={}:]+)\s*($|=|})/, (m: string, p1: string, p2: string, p3: string) => {
                        exportedNames.push(p1 || p3);
                        return m;
                    });
                }
                return p1;
            } else if (p6) {
                // MATCH: export function FunctionName(){...}
                return `__export = {${p6}:${p6}}; ${p1}`
            } else {
                // MATCH: export class ClassName {...}
                exportedNames.push(p7);
                return p1;
            }
        },
    },
    {
        /**
         * Syntax:
         *   export default function (…) { … } // also class, function*
         *   export default expression;
         */
        p: /\bexport\s+default\s+((async\s+)?function(\s+|\s*\*\s*)([^\s(]+)|class\s+([^\s{]+))?/g,
        r(
            m: string, p1: string, p2: string,
            p3: string, p4: string, p5: string,
        ) {
            if (p4) {
                return `__default = ${p4}; ${p1}`
            } else if (p5) {
                exportedNames.push(p5);
                return p1;
            }
            return m.replace(/export\s+default/, '__default =');
        },
    },
    {
        /**
         * [Syntax]
         *   export * from …; // does not set the default export
         *   export * as name1 from …; // Draft ECMAScript® 2O21
         *   export { name1, variable2 as name2, …, nameN };
         *   export { name1, import2 as name2, …, nameN } from …;
         *   export { default } from …;
         */
        p: /\bexport\s*(\*\s*(as\s+(\S+)\s+)?from\s*('[^']+'|"[^"]+"|`[^`]+`)|{([^}]+)}(\s*from\s*('[^']+'|"[^"]+"|`[^`]+`))?)/g,
        r(
            m: string, p1: string, p2: string, p3: string,
            p4: string, p5: string, p6: string, p7: string,
        ) {
            if (p4) {
                moduleSpecifiers.push(p4);
                if (p3) {
                    // MATCH: export * as name1 from …; // Draft ECMAScript® 2O21
                    return `__export = { ${p3}: __from(${p4}) }`;
                } else {
                    // MATCH: export * from …; // does not set the default export
                    return `__export = __from(${p4})`;
                }
            }
            if (p7) {
                // MATCH: export { name1, import2 as name2, …, nameN } from …;
                moduleSpecifiers.push(p7);
                const exports: string[] = [];
                let hasDefaultExport = false;
                const params = p5.replace(/([^\s,]+)(\s*,|\s+as\s+([^\s,]+))?/g, (m: string, p1: string, p2: string, p3: string) => {
                    if (p3) {
                        exports.push(p3);
                        return `${p1}:${p3}`;
                    } else if (p1 === 'default') {
                        hasDefaultExport = true;
                        return '';
                    } else {
                        exports.push(p1);
                        return m;
                    }
                });
                if (hasDefaultExport) {
                    exports.push(`default: __from(${p7}).default`);
                }
                return `;(function(){` +
                    `var {${params}} = __from(${p7});` +
                    `__export = {${exports.join()}}` +
                `}())`;
            }
            // MATCH: export { name1, variable2 as name2, …, nameN };
            const params = p5.replace(aliasPattern, '$2:$1');
            return `__export = {${params}}`;
        },
    },
    {
        /**
         * Syntax:
         *   import "module-name";
         *   import { e1, e2, e3 as alias } from "module-name";
         *   import * as name from "module-name";
         *   import defaultExport from "module-name";
         *   import defaultExport, { export [ , [...] ] } from "module-name";
         *   import defaultExport, * as name from "module-name";
         */
        p: /\bimport\b(\s*('[^']+'|"[^"]+"|`[^`]+`)|(\s*{([^}]+)}\s*|\s*\*\s*as\s+(\S+)\s+|\s+([^\s,]+)\s*(,\s*{([^}]+)}\s*|,\s*\*\s*as\s+(\S+)\s+)?)\bfrom\s*('[^']+'|"[^"]+"|`[^`]+`))/g,
        r(
            m: string, p1: string, p2: string, p3: string,
            p4: string, p5: string, p6: string, p7: string,
            p8: string, p9: string, p10: string,
        ) {
            if (p2) {
                // MATCH: import "module-name";
                moduleSpecifiers.push(p2);
                return `__from(${p2})`;
            }
            moduleSpecifiers.push(p10);
            if (p4) {
                // MATCH: import { e1, e2, e3 as alias } from "module-name";
                const params = p4.replace(aliasPattern, '$1:$2');
                return `var {${params}} = __from(${p10})`;
            } else if (p5) {
                // MATCH: import * as name from "module-name";
                return `var ${p5} = __from(${p10})`;
            } else if (p6) {
                if (p8) {
                    // MATCH: import defaultExport, { export [ , [...] ] } from "module-name";
                    const params = p8.replace(aliasPattern, '$1:$2');
                    return `var ${p6} = __from(${p10}).default, {${params}} = __from(${p10})`;
                } else if (p9) {
                    // MATCH: import defaultExport, * as name from "module-name";
                    return `var ${p9} = __from(${p10}), ${p6} = ${p9}.default`;
                } else {
                    // MATCH: import defaultExport from "module-name";
                    return `var ${p6} = __from(${p10}).default`;
                }
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

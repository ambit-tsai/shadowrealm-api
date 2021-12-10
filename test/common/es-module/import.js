diyTest('import defaultExport from "module-name"', async () => {
    const module = await createSpecifier(`
        export default true;
    `);
    const specifier = await createSpecifier(`
        import defaultExport from '${module}';
        export default defaultExport;
    `);
    return await sr.importValue(specifier, 'default');
});

diyTest('import * as name from "module-name"', async () => {
    const module = await createSpecifier(`
        export default 1;
        export const export1 = 2;
    `);
    const specifier = await createSpecifier(`
        import * as name from '${module}';
        export default name.default + name.export1 === 3;
    `);
    return await sr.importValue(specifier, 'default');
});

diyTest('import { export1 } from "module-name"', async () => {
    const module = await createSpecifier(`
        export const export1 = true;
    `);
    const specifier = await createSpecifier(`
        import { export1 } from '${module}';
        export default export1;
    `);
    return await sr.importValue(specifier, 'default');
});

diyTest('import { export1 as alias1 } from "module-name"', async () => {
    const module = await createSpecifier(`
        export const export1 = true;
    `);
    const specifier = await createSpecifier(`
        import { export1 as alias1 } from '${module}';
        export default alias1;
    `);
    return await sr.importValue(specifier, 'default');
});

diyTest('import { export1 , export2 } from "module-name"', async () => {
    const module = await createSpecifier(`
        export const export1 = 1;
        export const export2 = 2;
    `);
    const specifier = await createSpecifier(`
        import { export1 , export2 } from '${module}';
        export default export1 + export2 === 3;
    `);
    return await sr.importValue(specifier, 'default');
});

diyTest('import { export1 , export2 as alias2 , [...] } from "module-name"', async () => {
    const module = await createSpecifier(`
        export const export1 = 1;
        export const export2 = 2;
    `);
    const specifier = await createSpecifier(`
        import { export1 , export2 as alias2 } from '${module}';
        export default export1 + alias2 === 3;
    `);
    return await sr.importValue(specifier, 'default');
});

diyTest('import defaultExport, { export1 [ , [...] ] } from "module-name"', async () => {
    const module = await createSpecifier(`
        export default 1;
        export const export1 = 2;
    `);
    const specifier = await createSpecifier(`
        import defaultExport, { export1 } from '${module}';
        export default defaultExport + export1 === 3;
    `);
    return await sr.importValue(specifier, 'default');
});

diyTest('import defaultExport, * as name from "module-name"', async () => {
    const module = await createSpecifier(`
        export default 1;
        export const export1 = 2;
    `);
    const specifier = await createSpecifier(`
        import defaultExport, * as name from '${module}';
        export default defaultExport === name.default;
    `);
    return await sr.importValue(specifier, 'default');
});

diyTest('import "module-name"', async () => {
    const module = await createSpecifier(`
        globalThis._importTest = 123;
    `);
    const specifier = await createSpecifier(`
        import '${module}';
        export default globalThis._importTest === 123;
        delete globalThis._importTest;
    `);
    return await sr.importValue(specifier, 'default');
});

diyTest('import("module-name")', async () => {
    const module = await createSpecifier(`
        export default true;
    `);
    const result = await sr.__realm.globalObject.eval(`import('${module}')`);
    return result.default;
});

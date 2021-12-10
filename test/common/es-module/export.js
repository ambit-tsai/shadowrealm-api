diyTest('export var name1, name2, …, nameN', async () => {
    const module = await createSpecifier(`
        export var name1, name2;
        name1 = 1;
        name2 = 2;
    `);
    const specifier = await createSpecifier(`
        import { name1, name2 } from '${module}';
        export default name1 + name2 === 3;
    `);
    return await sr.importValue(specifier, 'default');
});

diyTest('export let name1, name2, …, nameN', async () => {
    const module = await createSpecifier(`
        export let name1, name2;
        name1 = 1;
        name2 = 2;
    `);
    const specifier = await createSpecifier(`
        import { name1, name2 } from '${module}';
        export default name1 + name2 === 3;
    `);
    return await sr.importValue(specifier, 'default');
});

diyTest('export var name1 = …, name2 = …, …, nameN', async () => {
    const module = await createSpecifier(`
        export var name1 = 1, name2 = 2;
    `);
    const specifier = await createSpecifier(`
        import { name1, name2 } from '${module}';
        export default name1 + name2 === 3;
    `);
    return await sr.importValue(specifier, 'default');
});

diyTest('export let name1 = …, name2 = …, …, nameN', async () => {
    const module = await createSpecifier(`
        export let name1 = 1, name2 = 2;
    `);
    const specifier = await createSpecifier(`
        import { name1, name2 } from '${module}';
        export default name1 + name2 === 3;
    `);
    return await sr.importValue(specifier, 'default');
});

diyTest('export const name1 = …, name2 = …, …, nameN', async () => {
    const module = await createSpecifier(`
        export const name1 = 1, name2 = 2;
    `);
    const specifier = await createSpecifier(`
        import { name1, name2 } from '${module}';
        export default name1 + name2 === 3;
    `);
    return await sr.importValue(specifier, 'default');
});

diyTest('export function functionName(){...}', async () => {
    const specifier = await createSpecifier(`
        export function functionName(){ return true }
    `);
    const fn = await sr.importValue(specifier, 'functionName');
    return fn();
});

diyTest('export class ClassName {...}', async () => {
    const module = await createSpecifier(`
        export class ClassName {
            prop = true;
        }
    `);
    const specifier = await createSpecifier(`
        import { ClassName } from '${module}';
        export default new ClassName().prop;
    `);
    return await sr.importValue(specifier, 'default');
});

diyTest('export { name1, name2, …, nameN }', async () => {
    const module = await createSpecifier(`
        const name1 = 1, name2 = 2;
        export { name1, name2 };
    `);
    const specifier = await createSpecifier(`
        import { name1, name2 } from '${module}';
        export default name1 + name2 === 3;
    `);
    return await sr.importValue(specifier, 'default');
});

diyTest('export { variable1 as name1, variable2 as name2, …, nameN }', async () => {
    const module = await createSpecifier(`
        const variable1 = 1, variable2 = 2;
        export { variable1 as name1, variable2 as name2 };
    `);
    const specifier = await createSpecifier(`
        import { name1, name2 } from '${module}';
        export default name1 + name2 === 3;
    `);
    return await sr.importValue(specifier, 'default');
});

diyTest('export var { name1, name2: bar } = o', async () => {
    const module = await createSpecifier(`
        const o = { name1: 1, name2: 2 };
        export var { name1, name2: bar } = o;
    `);
    const specifier = await createSpecifier(`
        import { name1, bar } from '${module}';
        export default name1 + bar === 3;
    `);
    return await sr.importValue(specifier, 'default');
});

diyTest('export let { name1, name2: bar } = o', async () => {
    const module = await createSpecifier(`
        const o = { name1: 1, name2: 2 };
        export let { name1, name2: bar } = o;
    `);
    const specifier = await createSpecifier(`
        import { name1, bar } from '${module}';
        export default name1 + bar === 3;
    `);
    return await sr.importValue(specifier, 'default');
});

diyTest('export const { name1, name2: bar } = o', async () => {
    const module = await createSpecifier(`
        const o = { name1: 1, name2: 2 };
        export const { name1, name2: bar } = o;
    `);
    const specifier = await createSpecifier(`
        import { name1, bar } from '${module}';
        export default name1 + bar === 3;
    `);
    return await sr.importValue(specifier, 'default');
});

diyTest('export default expression', async () => {
    const specifier = await createSpecifier(`
        export default 1 + 2 === 3;
    `);
    return await sr.importValue(specifier, 'default');
});

diyTest('export default function (…) { … }', async () => {
    const specifier = await createSpecifier(`
        export default function () { return true }
    `);
    const fn = await sr.importValue(specifier, 'default');
    return fn();
});

diyTest('export default function name1(…) { … }', async () => {
    const module = await createSpecifier(`
        export default function name1() { return true }
    `);
    const specifier = await createSpecifier(`
        import fn from '${module}';
        export default fn.name === 'name1' && fn();
    `);
    return await sr.importValue(specifier, 'default');
});

diyTest('export { name1 as default, … }', async () => {
    const specifier = await createSpecifier(`
        const name1 = true;
        export { name1 as default }
    `);
    return await sr.importValue(specifier, 'default');
});

diyTest('export * from …', async () => {
    const module = await createSpecifier(`
        export const name1 = 1;
        export const name2 = 2;
    `);
    const middle = await createSpecifier(`
        export * from '${module}';
    `);
    const specifier = await createSpecifier(`
        import { name1, name2 } from '${middle}';
        export default name1 + name2 === 3;
    `);
    return await sr.importValue(specifier, 'default');
});

diyTest('export * as name1 from …', async () => {
    const module = await createSpecifier(`
        export default 1;
        export const abc = 2;
    `);
    const middle = await createSpecifier(`
        export * as name1 from '${module}';
    `);
    const specifier = await createSpecifier(`
        import { name1 } from '${middle}';
        export default name1.default + name1.abc === 3;
    `);
    return await sr.importValue(specifier, 'default');
});

diyTest('export { name1, name2, …, nameN } from …', async () => {
    const module = await createSpecifier(`
        export const name1 = 1;
        export const name2 = 2;
    `);
    const middle = await createSpecifier(`
        export { name1, name2 } from '${module}';
    `);
    const specifier = await createSpecifier(`
        import { name1, name2 } from '${middle}';
        export default name1 + name2 === 3;
    `);
    return await sr.importValue(specifier, 'default');
});

diyTest('export { import1 as name1, import2 as name2, …, nameN } from …', async () => {
    const module = await createSpecifier(`
        export const import1 = 1;
        export const import2 = 2;
    `);
    const middle = await createSpecifier(`
        export { import1 as name1, import2 as name2 } from '${module}';
    `);
    const specifier = await createSpecifier(`
        import { name1, name2 } from '${middle}';
        export default name1 + name2 === 3;
    `);
    return await sr.importValue(specifier, 'default');
});

diyTest('export { default, … } from …', async () => {
    const module = await createSpecifier(`
        export default true;
    `);
    const specifier = await createSpecifier(`
        export { default } from '${module}';
    `);
    return await sr.importValue(specifier, 'default');
});

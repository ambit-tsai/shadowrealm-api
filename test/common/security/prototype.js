diyTest('ShadowRealm', () => {
    return ShadowRealm.hasOwnProperty === Object.prototype.hasOwnProperty;
});

diyTest('this in ShadowRealm', () => {
    return sr.evaluate('this.hasOwnProperty === Object.prototype.hasOwnProperty');
});

diyTest('globalThis in ShadowRealm', () => {
    return sr.evaluate('globalThis.hasOwnProperty === Object.prototype.hasOwnProperty');
});

diyTest('Constructor "ShadowRealm" in ShadowRealm', () => {
    return sr.evaluate('ShadowRealm.hasOwnProperty === Object.prototype.hasOwnProperty');
});

diyTest('eval in ShadowRealm', () => {
    return sr.evaluate('eval.hasOwnProperty === Object.prototype.hasOwnProperty');
});

diyTest('Function in ShadowRealm', () => {
    return sr.evaluate('Function.hasOwnProperty === Object.prototype.hasOwnProperty');
});

diyTest('promise return by dynamic import', async () => {
    const specifier = await createSpecifier('');
    return sr.evaluate(`
        const promise = import('${specifier}');
        promise.hasOwnProperty === Object.prototype.hasOwnProperty;
    `);
});

diyTest('module return by dynamic import', async () => {
    const specifier = createSpecifier('export default 123');
    const module = await sr.__realm.globalObject.eval(`import('${specifier}')`);
    return Object.getPrototypeOf(module) === null;
});

diyTest('object return by dynamic import', async () => {
    const specifier = createSpecifier('export default {}');
    return await sr.__realm.globalObject.eval(`
        import('${specifier}').then(module => module.default.hasOwnProperty === Object.prototype.hasOwnProperty)
    `);
});

diyTest('function return by evaluate', () => {
    const fn = sr.evaluate('() => {}');
    return fn.hasOwnProperty === Object.prototype.hasOwnProperty;
});

diyTest('promise return by importValue', async () => {
    const specifier = await createSpecifier('export default true');
    const promise = sr.importValue(specifier, 'default');
    return promise.hasOwnProperty === Object.prototype.hasOwnProperty;
});

diyTest('function return by importValue', async () => {
    const specifier = await createSpecifier('export default () => {}');
    const fn = await sr.importValue(specifier, 'default');
    return fn.hasOwnProperty === Object.prototype.hasOwnProperty;
});

diyTest('arguments are wrapped into the inner ShadowRealm', () => {
    const callFn = sr.evaluate('fn => fn.hasOwnProperty === Object.prototype.hasOwnProperty');
    return callFn(() => {});
});

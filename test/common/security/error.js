diyTest('call ShadowRealm as function', () => {
    try {
        ShadowRealm();
    } catch (error) {
        return error.hasOwnProperty === Object.prototype.hasOwnProperty;
    }
});

diyTest('catch inner error', () => {
    try {
        sr.evaluate('throw new Error("inner")');
    } catch (error) {
        return error.hasOwnProperty === Object.prototype.hasOwnProperty;
    }
});

diyTest('catch outer error in ShadowRealm', () => {
    const callFn = sr.evaluate(`fn => {
        try {
            fn();
        } catch(error) {
            return error.hasOwnProperty === Object.prototype.hasOwnProperty;
        }
    }`);
    return callFn(() => { throw new Error('outer') });
});

diyTest('evaluate return object', () => {
    try {
        sr.evaluate('({})');
    } catch (error) {
        return error.hasOwnProperty === Object.prototype.hasOwnProperty;
    }
});

diyTest('call outer function with object argument', () => {
    try {
        const callFn = sr.evaluate('fn => fn({})');
        callFn(() => {});
    } catch (error) {
        return error.hasOwnProperty === Object.prototype.hasOwnProperty;
    }
});

diyTest('importValue return object', async () => {
    try {
        const specifier = await createSpecifier('export default {}');
        await sr.importValue(specifier, 'default');
    } catch (error) {
        return error.hasOwnProperty === Object.prototype.hasOwnProperty;
    }
});

diyTest('import non-existent module', async () => {
    try {
        await sr.importValue('non-existent', 'default');
    } catch (error) {
        return error.hasOwnProperty === Object.prototype.hasOwnProperty;
    }
});

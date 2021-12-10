diyTest('this', () => {
    return sr.evaluate('this.window') === undefined;
});

diyTest('globalThis', () => {
    return sr.evaluate('globalThis.window') === undefined;
});

diyTest('this in function', () => {
    return sr.evaluate('(function(){ return this && this.window }())') === undefined;
});

diyTest('this in Function', () => {
    return sr.evaluate('Function("return this && this.window")')() === undefined;
});

diyTest('this in Function.prototype.constructor', () => {
    return sr.evaluate('Function.prototype.constructor("return this && this.window")')() === undefined;
});

diyTest('this in eval', () => {
    return sr.evaluate('eval("this.window")') === undefined;
});

diyTest('this in importValue', async () => {
    const specifier = createSpecifier('export default this.window === undefined');
    return await sr.importValue(specifier, 'default');
});

diyTest('window', () => {
    return sr.evaluate('window') === undefined;
});

diyTest('window in eval', () => {
    return sr.evaluate('eval("window")') === undefined;
});

diyTest('window in Function', () => {
    return sr.evaluate('Function("return window")')() === undefined;
});

diyTest('window in Function.prototype.constructor', () => {
    return sr.evaluate('Function.prototype.constructor("return window")')() === undefined;
});

diyTest('window in importValue', async () => {
    const specifier = createSpecifier('export default window === undefined');
    return await sr.importValue(specifier, 'default');
});

diyTest('set Symbol.unscopables for Object.prototype', () => {
    return sr.evaluate(`
        Object.defineProperty(Object.prototype, Symbol.unscopables, {
            value: { window: true },
        });
        window === undefined;
    `);
});

diyTest('set Symbol.unscopables for globalThis', () => {
    return sr.evaluate(`
        const desc = Object.getOwnPropertyDescriptor(globalThis, Symbol.unscopables);
        try {
            desc.value.window = true;
            window === undefined;
        } catch (error) {
            true;
        }
    `);
});

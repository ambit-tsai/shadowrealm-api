diyTest('undefined', async () => {
    const specifier = await createSpecifier('export default undefined');
    const result = await sr.importValue(specifier, 'default');
    return result === undefined;
});

diyTest('null', async () => {
    const specifier = await createSpecifier('export default null');
    const result = await sr.importValue(specifier, 'default');
    return result === null;
});

diyTest('boolean', async () => {
    const specifier = await createSpecifier('export default true');
    return await sr.importValue(specifier, 'default');
});

diyTest('string', async () => {
    const specifier = await createSpecifier('export default "ambit"');
    const result = await sr.importValue(specifier, 'default');
    return result === 'ambit';
});

diyTest('symbol', async () => {
    const specifier = await createSpecifier('export default Symbol(123)');
    const result = await sr.importValue(specifier, 'default');
    return String(result) === 'Symbol(123)';
});

diyTest('number', async () => {
    const specifier = await createSpecifier('export default 123');
    const result = await sr.importValue(specifier, 'default');
    return result === 123;
});

diyTest('bigint', async () => {
    const specifier = await createSpecifier('export default 123n');
    const result = await sr.importValue(specifier, 'default');
    return result === 123n;
});

diyTest('function: return primitive value', async () => {
    const specifier = await createSpecifier('export default () => true');
    const fn = await sr.importValue(specifier, 'default');
    return fn()
});

diyTest('function: return callable value', async () => {
    const specifier = await createSpecifier('export default () => () => true');
    const fn = await sr.importValue(specifier, 'default');
    return fn()();
});

diyTest('function: return object', async () => {
    try {
        const specifier = await createSpecifier('export default () => ({})');
        const fn = await sr.importValue(specifier, 'default');
        fn();
    } catch (error) {
        return error instanceof TypeError;
    }
});

diyTest('function: pass primitive argument', async () => {
    const specifier = await createSpecifier('export default num => num === 123');
    const fn = await sr.importValue(specifier, 'default');
    return fn(123);
});

diyTest('function: pass callable argument', async () => {
    const specifier = await createSpecifier('export default fn => fn()');
    const callFn = await sr.importValue(specifier, 'default');
    return callFn(() => true);
});

diyTest('function: pass object argument', async () => {
    try {
        const specifier = await createSpecifier('export default () => {}');
        const fn = await sr.importValue(specifier, 'default');
        fn({});
    } catch (error) {
        return error instanceof TypeError;
    }
});

diyTest('object', async () => {
    try {
        const specifier = await createSpecifier('export default {}');
        await sr.importValue(specifier, 'default');
    } catch (error) {
        return error instanceof TypeError;
    }
});

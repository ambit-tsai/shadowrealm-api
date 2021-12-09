export type GlobalObject = typeof global;
export type RealmRecord = {
    intrinsics: GlobalObject;
    globalObject: GlobalObject;
};


export function createRealmRecord(globalObject: GlobalObject): RealmRecord {
    const { Object } = globalObject;
    const intrinsics = Object();
    for (const key of Object.getOwnPropertyNames(globalObject)) {
        // @ts-ignore
        intrinsics[key] = globalObject[key];
    }
    const realmRec = Object();
    realmRec.intrinsics = intrinsics;
    realmRec.globalObject = globalObject;
    return realmRec;
}

export type CreateRealmRecord = typeof createRealmRecord;


const { apply } = Function.prototype;

const safeApply = global.Reflect?.apply || function (fn: Function, ctx: any, args: ArrayLike<any>) {
    return apply.call(fn, ctx, args);
};

type SafeApply = typeof safeApply;


export function getWrappedValue<T>(
    callerRealm: RealmRecord,
    value: T,
    valueRealm: RealmRecord,
): T {
    if (typeof value === 'function') {
        return createWrappedFunction(callerRealm, value, valueRealm);
    } else if (typeof value === 'object' && value) {
        throw new callerRealm.intrinsics.TypeError('value must be primitive or callable');
    }
    return value;
}

export type GetWrappedValue = typeof getWrappedValue;


const codeOfWrappedFunction = `return ${wrappedFunctionInContext.toString()}`;

function createWrappedFunction(
    callerRealm: RealmRecord,
    targetFunction: Function,
    targetRealm: RealmRecord,
) {
    return callerRealm.intrinsics.Function('params', codeOfWrappedFunction)({
        getWrappedValue,
        callerRealm,
        targetFunction,
        targetRealm,
        safeApply,
        wrapError,
    });
}

type ParamsForWrappedFunction = {
    getWrappedValue: typeof getWrappedValue,
    callerRealm: RealmRecord,
    targetFunction: Function,
    targetRealm: RealmRecord,
    safeApply: SafeApply,
    wrapError: WrapError,
};

function wrappedFunctionInContext(this: any) {
    const {
        getWrappedValue,
        callerRealm,
        targetFunction,
        targetRealm,
        safeApply,
        wrapError,
        // @ts-ignore: `params` is in parent scope
    } = params as ParamsForWrappedFunction;
    try {
        const wrappedArgs: any[] = [];
        for (let i = 0, { length } = arguments; i < length; ++i) {
            const wrappedValue = getWrappedValue(targetRealm, arguments[i], callerRealm);
            wrappedArgs.push(wrappedValue);
        }
        const result = safeApply(targetFunction, targetRealm.globalObject, wrappedArgs);
        return getWrappedValue(callerRealm, result, targetRealm);
    } catch (error) {
        wrapError(error, callerRealm);
    }
}


export function wrapError(error: any, realmRec: RealmRecord): never {
    const isObject = typeof error === 'object' && error;
    // @ts-ignore: They are in the same context if the same `hasOwnProperty` is available.
    if ((isObject || typeof error === 'function') && error.hasOwnProperty !== realmRec.hasOwnProperty) {
        if (isObject
            && typeof error.name === 'string'
            && /Error$/.test(error.name)
            && error.name in realmRec.intrinsics
        ) {
            // @ts-ignore
            error = new realmRec.intrinsics[error.name](error.message);
        } else {
            error += '';
        }
    }
    throw error;
}

export type WrapError = typeof wrapError;

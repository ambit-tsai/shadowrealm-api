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
        invokeWithErrorHandling,
        getWrappedValue,
        callerRealm,
        targetFunction,
        targetRealm,
        safeApply,
    });
}

type ParamsForWrappedFunction = {
    invokeWithErrorHandling: InvokeWithErrorHandling,
    getWrappedValue: typeof getWrappedValue,
    callerRealm: RealmRecord,
    targetFunction: Function,
    targetRealm: RealmRecord,
    safeApply: SafeApply,
};

function wrappedFunctionInContext(this: any) {
    const args = arguments;
    const {
        invokeWithErrorHandling,
        getWrappedValue,
        callerRealm,
        targetFunction,
        targetRealm,
        safeApply,
        // @ts-ignore: `params` is in parent scope
    } = params as ParamsForWrappedFunction;
    return invokeWithErrorHandling(() => {
        const wrappedArgs: any[] = [];
        for (let i = 0, { length } = args; i < length; ++i) {
            const wrappedValue = getWrappedValue(targetRealm, args[i], callerRealm);
            wrappedArgs.push(wrappedValue);
        }
        const result = safeApply(targetFunction, targetRealm.globalObject, wrappedArgs);
        return getWrappedValue(callerRealm, result, targetRealm);
    }, callerRealm);
}


export function invokeWithErrorHandling<T>(callback: () => T, callerRealm: RealmRecord): T {
    try {
        return callback();
    } catch (err: any) {
        const isObject = typeof err === 'object' && err;
        // @ts-ignore: They are in the same context if the same `hasOwnProperty` is available.
        if ((isObject || typeof err === 'function') && err.hasOwnProperty !== callerRealm.hasOwnProperty) {
            if (isObject
                && typeof err.name === 'string'
                && /Error$/.test(err.name)
                && err.name in callerRealm.intrinsics
            ) {
                // @ts-ignore
                err = new callerRealm.intrinsics[err.name](err.message);
            } else {
                err += '';
            }
        }
        throw err;
    }
}

export type InvokeWithErrorHandling = typeof invokeWithErrorHandling;

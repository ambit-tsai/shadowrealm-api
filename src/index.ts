import * as helpers from './helpers';
import { addEsModuleHelpers } from './es-module';
import { createRealmRecord } from './RealmRecord';
import { createShadowRealmCtor, defineShadowRealmCtor } from './ShadowRealm';
import {
    dynamicImportPattern,
    dynamicImportReplacer,
    transformEsmSyntax,
} from './es-module/helpers';
import type { RealmRecord } from './type';

export const utils = helpers.assign(
    {
        addEsModuleHelpers,
        createRealmRecord,
        createShadowRealmCtor,
        defineShadowRealmCtor,
        dynamicImportPattern,
        dynamicImportReplacer,
        transformEsmSyntax,
    },
    helpers
);

export type Utils = typeof utils;

export default createShadowRealmCtor(
    { intrinsics: helpers.GLOBAL } as RealmRecord,
    utils
);

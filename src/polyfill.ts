import { GLOBAL } from './helpers';
import { defineShadowRealmCtor } from './ShadowRealm';
import type { RealmRecord } from './type';
import { utils } from '.';

if (!GLOBAL.ShadowRealm) {
    defineShadowRealmCtor(
        { intrinsics: GLOBAL, globalObject: GLOBAL } as RealmRecord,
        utils
    );
}

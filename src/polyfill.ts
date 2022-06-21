import { GLOBAL } from './helpers';
import { defineShadowRealmCtor } from './ShadowRealm';
import type { RealmRecord, ShadowRealmConstructor } from './type';
import { utils } from '.';

if (!GLOBAL.ShadowRealm) {
    defineShadowRealmCtor(
        { intrinsics: GLOBAL, globalObject: GLOBAL } as RealmRecord,
        utils
    );
}

declare global {
    interface Window {
        ShadowRealm: ShadowRealmConstructor;
    }
    var ShadowRealm: ShadowRealmConstructor;
}

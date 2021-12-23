import { globalObject } from './utils';
import { defineShadowRealm } from './ShadowRealm';


if (!globalObject.ShadowRealm) {
    defineShadowRealm(globalObject);
}
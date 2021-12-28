import { topGlobal } from './utils';
import { defineShadowRealm } from './ShadowRealm';


if (!topGlobal.ShadowRealm) {
    defineShadowRealm(topGlobal);
}
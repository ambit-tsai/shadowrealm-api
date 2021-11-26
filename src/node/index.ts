import { createShadowRealm, ShadowRealmConstructor } from './main';

// @ts-ignore
export default global.ShadowRealm as ShadowRealmConstructor || createShadowRealm();

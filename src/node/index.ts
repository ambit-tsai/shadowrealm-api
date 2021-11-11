import { createShadowRealm, ShadowRealmConstructor } from './helpers';

// @ts-ignore
export default global.ShadowRealm as ShadowRealmConstructor || createShadowRealm(Function);

import { createShadowRealm, ShadowRealmConstructor } from './helpers';

// @ts-ignore
export default window.ShadowRealm as ShadowRealmConstructor || createShadowRealm(window);

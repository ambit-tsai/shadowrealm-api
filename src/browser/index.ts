import { createShadowRealm, ShadowRealmConstructor } from './ShadowRealm';

// @ts-ignore
export default window.ShadowRealm as ShadowRealmConstructor || createShadowRealm(window);

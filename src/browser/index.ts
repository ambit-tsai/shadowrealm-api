import { createShadowRealm, ShadowRealmConstructor } from './main';

// @ts-ignore
export default window.ShadowRealm as ShadowRealmConstructor || createShadowRealm(window);

import { createSafeShadowRealm, ShadowRealmConstructor } from './helpers';

// @ts-ignore
export default window.ShadowRealm as ShadowRealmConstructor || createSafeShadowRealm(window);

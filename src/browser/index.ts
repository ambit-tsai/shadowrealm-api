import { createSafeShadowRealm, ShadowRealmConstructor } from './helpers';

export default (
    // @ts-ignore
    window.ShadowRealm || createSafeShadowRealm(window)
) as ShadowRealmConstructor;


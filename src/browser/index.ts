import { globalObject } from './utils';
import { createShadowRealm } from './ShadowRealm';


export default globalObject.ShadowRealm || createShadowRealm(globalObject);

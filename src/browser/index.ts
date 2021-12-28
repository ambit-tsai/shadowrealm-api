import { topGlobal } from './utils';
import { createShadowRealm } from './ShadowRealm';


export default topGlobal.ShadowRealm || createShadowRealm(topGlobal);

import {config,required} from './config.mjs';
const c=config();console.log(JSON.stringify({missing:required.filter(k=>!c[k]),synthetic_approved:c.SYNTHETIC_DATA_APPROVED==='true',jobs:c.ENABLE_JOBS==='true',polling:c.ENABLE_POLLING==='true',external_verification:'pending'},null,2));

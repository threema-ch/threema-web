/**
 * Copyright © 2016-2019 Threema GmbH (https://threema.ch/).
 *
 * This file is part of Threema Web.
 */
import '@babel/polyfill';

import {init as initComposeArea} from './compose_area';

// Expose global functions
(window as any).uiTests = {
    initComposeArea: initComposeArea,
};

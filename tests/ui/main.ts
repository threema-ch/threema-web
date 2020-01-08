/**
 * Copyright © 2016-2020 Threema GmbH (https://threema.ch/).
 *
 * This file is part of Threema Web.
 */
import {init as initComposeArea} from './compose_area';

// Expose global functions
(window as any).uiTests = {
    initComposeArea: initComposeArea,
};

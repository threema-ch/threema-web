/**
 * Copyright © 2016-2020 Threema GmbH (https://threema.ch/).
 *
 * This file is part of Threema Web.
 *
 * Threema Web is free software: you can redistribute it and/or modify it
 * under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or (at
 * your option) any later version.
 *
 * This program is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero
 * General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with Threema Web. If not, see <http://www.gnu.org/licenses/>.
 */

import config from '../src/config';
import {MemoryLogger} from '../src/helpers/logger';

// A dependency graph that contains any wasm must all be imported asynchronously.
import('../src/app')
    .then(() => {
        // @ts-ignore
        window.config = config;
        console.info('Bundle loaded')
    })
    .catch((e) => console.error('Could not load bundle', e));

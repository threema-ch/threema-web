/**
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

import {hasValue} from '../helpers';

// Extend global APIs
declare global {
    interface Window {
        AppDataStore: {
            setValue: (key: string, value: unknown) => void;
            getValue: (key: string) => unknown;
        }
    }
}

export class InMemorySession {
    private static SESSION_PASSWORD_STORAGE_KEY = 'inMemorySessionPassword';

    /**
     * Return true if the AppDataStore API is available.
     */
    public storeAvailable(): boolean {
        return hasValue(window.AppDataStore);
    }

    /**
     * Return the in-memory session password.
     *
     * If the AppDataStore API is not available, return undefined.
     */
    public getPassword(): string | undefined {
        if (!this.storeAvailable()) {
            return undefined;
        }
        const sessionPassword = window.AppDataStore.getValue(InMemorySession.SESSION_PASSWORD_STORAGE_KEY);
        return typeof sessionPassword === 'string' ? sessionPassword : undefined;
    }

    /**
     * Set the in-memory session password.
     *
     * If the AppDataStore API is not available, do nothing.
     */
    public setPassword(password: string) {
        if (!this.storeAvailable()) {
            return;
        }
        window.AppDataStore.setValue(InMemorySession.SESSION_PASSWORD_STORAGE_KEY, password);
    }

    /**
     * Clear the in-memory session password.
     *
     * If the AppDataStore API is not available, do nothing.
     */
    public clearPassword() {
        this.setPassword(undefined);
    }
}

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

/**
 * A future similar to Python's asyncio.Future. Allows to resolve or reject
 * outside of the executor and query the current status.
 */
interface Future<T> extends Promise<T> {
    /**
     * Return whether the future is done (resolved or rejected).
     */
    readonly done: boolean;

    /**
     * Resolve the future.
     */
    resolve(value?: T | PromiseLike<T>): void;

    /**
     * Reject the future.
     */
    reject(reason?: any): void;
}

interface FutureStatic {
    new<T>(executor?: (resolveFn: (value?: T | PromiseLike<T>) => void,
                       rejectFn: (reason?: any) => void) => void,
    ): Future<T>
}

declare var Future: FutureStatic;

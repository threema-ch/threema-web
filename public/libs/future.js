'use strict';

/**
 * A future similar to Python's asyncio.Future. Allows to resolve or reject
 * outside of the executor and query the current status.
 */
class Future extends Promise {
    constructor(executor) {
        let resolve, reject;
        super((resolve_, reject_) => {
            resolve = resolve_;
            reject = reject_;
            if (executor) {
                return executor(resolve_, reject_);
            }
        });

        this._done = false;
        this._resolve = resolve;
        this._reject = reject;
    }

    static withMinDuration(promise, minDuration) {
        const start = new Date();
        return new Future((resolve, reject) => {
            promise
                .then((result) => {
                    const timediff = new Date() - start;
                    const delay = Math.max(minDuration - timediff, 0);
                    self.setTimeout(() => resolve(result), delay);
                })
                .catch((error) => reject(error));
        });
    }

    /**
     * Return whether the future is done (resolved or rejected).
     */
    get done() {
        return this._done;
    }

    /**
     * Resolve the future.
     */
    resolve(...args) {
        this._done = true;
        return this._resolve(...args);
    }

    /**
     * Reject the future.
     */
    reject(...args) {
        this._done = true;
        return this._reject(...args);
    }
}

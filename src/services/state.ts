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

import {AsyncEvent} from 'ts-events';
import {Logger} from 'ts-log';

import {LogService} from './log';

import TaskConnectionState = threema.TaskConnectionState;
import GlobalConnectionState = threema.GlobalConnectionState;
import ChosenTask = threema.ChosenTask;

const enum Stage {
    Signaling,
    Task,
}

export class StateService {
    // Angular services
    private $interval: ng.IIntervalService;

    // Logging
    private readonly log: Logger;

    // Events
    public evtConnectionBuildupStateChange = new AsyncEvent<threema.ConnectionBuildupStateChange>();
    public evtGlobalConnectionStateChange = new AsyncEvent<threema.GlobalConnectionStateChange>();
    public evtUnreadCountChange = new AsyncEvent<number>();

    // Connection states
    public signalingConnectionState: saltyrtc.SignalingState;
    public taskConnectionState: TaskConnectionState;

    // Connection buildup state
    public connectionBuildupState: threema.ConnectionBuildupState;
    public progress = 0;
    private progressInterval: ng.IPromise<any> = null;
    public slowConnect = false;

    // Global connection state
    private stage: Stage;
    private _state: threema.GlobalConnectionState;
    public attempt: number = 0;

    // Unread messages
    private _unreadCount: number = 0;

    public static $inject = ['$interval', 'LogService'];
    constructor($interval: ng.IIntervalService, logService: LogService) {
        this.$interval = $interval;
        this.log = logService.getLogger('State-S', 'color: #fff; background-color: #cc9900');
        this.reset();
    }

    /**
     * Getters and setters for global connection state.
     */
    public get state(): threema.GlobalConnectionState {
        return this._state;
    }
    public set state(state: threema.GlobalConnectionState) {
        const prevState = this._state;
        if (prevState === state) {
            // No need to dispatch any events
            return;
        }
        this._state = state;
        this.evtGlobalConnectionStateChange.post({state: state, prevState: prevState});
    }

    /**
     * Signaling connection state.
     */
    public updateSignalingConnectionState(
        state: saltyrtc.SignalingState, chosenTask: ChosenTask, handoverDone: boolean,
    ): void {
        const prevState = this.signalingConnectionState;
        this.signalingConnectionState = state;
        if (!handoverDone) {
            this.log.debug('Signaling connection state:', prevState, '=>', state);
            switch (state) {
                case 'new':
                case 'ws-connecting':
                case 'server-handshake':
                case 'peer-handshake':
                    this.state = GlobalConnectionState.Warning;
                    break;
                case 'task':
                    this.stage = Stage.Task;
                    if (chosenTask === ChosenTask.RelayedData) {
                        this.updateTaskConnectionState(TaskConnectionState.Connected);
                    } else {
                        this.state = GlobalConnectionState.Warning;
                    }
                    break;
                case 'closing':
                case 'closed':
                    this.state = GlobalConnectionState.Error;
                    break;
                default:
                    this.log.warn(`Unknown signaling connection state: ${state}`);
            }
        } else {
            this.log.debug('Ignored signaling connection state to "' + state + '"');
        }
    }

    /**
     * Task connection state.
     */
    public updateTaskConnectionState(state: TaskConnectionState): void {
        const prevState = this.taskConnectionState;
        this.taskConnectionState = state;
        if (this.stage === Stage.Task) {
            this.log.debug('Task connection state:', prevState, '=>', state);
            switch (state) {
                case TaskConnectionState.New:
                case TaskConnectionState.Connecting:
                case TaskConnectionState.Reconnecting:
                    this.state = GlobalConnectionState.Warning;
                    break;
                case TaskConnectionState.Connected:
                    this.state = GlobalConnectionState.Ok;
                    this.attempt = 0;
                    break;
                case TaskConnectionState.Disconnected:
                    this.state = GlobalConnectionState.Error;
                    break;
                default:
                    this.log.warn('Ignored task connection state change to "' + state + '"');
            }
        } else {
            this.log.debug('Ignored task connection state change to "' + state + '"');
        }
    }

    /**
     * Connection buildup state.
     */
    public updateConnectionBuildupState(state: threema.ConnectionBuildupState): void {
        if (this.connectionBuildupState === state) {
            return;
        }
        const prevState = this.connectionBuildupState;
        this.log.debug('Connection buildup state:', prevState, '=>', state);

        // Update state
        this.connectionBuildupState = state;
        this.evtConnectionBuildupStateChange.post({state: state, prevState: prevState});

        // Cancel progress interval if present
        if (this.progressInterval !== null) {
            this.$interval.cancel(this.progressInterval);
            this.progressInterval = null;
        }

        // Reset slow connect state
        this.slowConnect = false;

        // Update progress
        switch (state) {
            case 'new':
                this.progress = 0;
                break;
            case 'push':
                this.progress = 0;
                this.progressInterval = this.$interval(() => {
                    if (this.progress < 12) {
                        this.progress += 1;
                    } else {
                        this.slowConnect = true;
                    }
                }, 800);
                break;
            case 'manual_start':
                this.progress = 0;
                break;
            case 'connecting':
                this.progress = 13;
                break;
            case 'waiting':
                this.progress = 14;
                break;
            case 'peer_handshake':
                this.progress = 15;
                this.progressInterval = this.$interval(() => {
                    if (this.progress < 40) {
                        this.progress += 5;
                    } else if (this.progress < 55) {
                        this.progress += 3;
                    } else if (this.progress < 60) {
                        this.progress += 1;
                    } else {
                        this.slowConnect = true;
                    }
                }, 500);
                break;
            case 'loading':
                this.progress = 60;
                this.progressInterval = this.$interval(() => {
                    if (this.progress < 80) {
                        this.progress += 4;
                    } else if (this.progress < 90) {
                        this.progress += 2;
                    } else if (this.progress < 99) {
                        this.progress += 1;
                    } else {
                        this.slowConnect = true;
                    }
                }, 600);
                break;
            case 'done':
                this.progress = 100;
                break;
            default:
                this.progress = 0;
                break;
        }
    }

    /**
     * Return whether messages can be submitted to the outgoing queue.
     *
     * The `startupDone` flag indicates, whether the initial data in the
     * webclient service has been loaded or not.
     */
    public readyToSubmit(chosenTask: ChosenTask, startupDone: boolean): boolean {
        switch (chosenTask) {
            case ChosenTask.RelayedData:
                return true;
            case ChosenTask.WebRTC:
            default:
                return this.state === GlobalConnectionState.Ok && startupDone;
        }
    }

    /**
     * Getters and setters for unread messages count.
     */
    public get unreadCount(): number {
        return this._unreadCount;
    }
    public set unreadCount(count: number) {
        if (this._unreadCount === count) {
            // No need to dispatch any events
            return;
        }
        this._unreadCount = count;
        this.evtUnreadCountChange.post(count);
    }

    /**
     * Reset all states.
     */
    public reset(connectionBuildupState: threema.ConnectionBuildupState = 'new', shouldResetUnreadCount : boolean = false): void {
        this.log.debug('Reset states');

        // Reset state
        this.signalingConnectionState = 'new';
        this.taskConnectionState = TaskConnectionState.New;
        this.stage = Stage.Signaling;
        this.state = GlobalConnectionState.Error;
        this.connectionBuildupState = connectionBuildupState;
        this.progress = 0;

        if (shouldResetUnreadCount) {
          this.unreadCount = 0;
        }
    }
}

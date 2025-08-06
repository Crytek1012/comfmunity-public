import { Heap } from "heap-js";
import { ErrorHandler } from "./error-handler.js";

export enum GlobalRelayPriority {
    PostLowPriority = 1,
    PostHighPriority,
    Update,
    Delete,
    ModDelete
}
type TaskOperation<T> = () => T | Promise<T>;

class Task<T = void> {
    readonly id: string;
    readonly priority: GlobalRelayPriority;
    operation: () => T | Promise<T>;
    private static _number = 0;
    readonly number: number;
    resolve!: (value: T | PromiseLike<T>) => void;
    reject!: (reason?: unknown) => void;
    readonly promise: Promise<T>;

    constructor(id: string, priority: GlobalRelayPriority, operation: TaskOperation<T>, dependsOnTask?: string) {
        this.id = id;
        this.priority = priority;
        this.operation = operation;
        this.number = Task._number++;
        this.promise = new Promise<T>((res, rej) => {
            this.resolve = res;
            this.reject = rej;
        });
    }

    isRelayPOST() {
        return this.priority === GlobalRelayPriority.PostLowPriority || this.priority === GlobalRelayPriority.PostHighPriority;
    }

    isRelayPATCH() {
        return this.priority === GlobalRelayPriority.Update;
    }

    isRelayDELETE() {
        return this.priority === GlobalRelayPriority.Delete || this.priority === GlobalRelayPriority.ModDelete;
    }
}

/* eslint-disable  @typescript-eslint/no-explicit-any */
class Queue {
    private tasks: Map<string, Map<GlobalRelayPriority, Task<any>>> = new Map();
    private queue: Heap<Task<any>>;
    private inProcess = false;
    private lastExecutionTimestamp: number = 0;

    constructor() {
        this.queue = new Heap((a, b) =>
            a.priority === b.priority ? a.number - b.number : b.priority - a.priority
        );
    }

    /**
     * Add a task to the queue
     * @param id 
     * @param priority 
     * @param operation 
     * @param dependsOnTask 
     * @returns 
     */
    async addTask<T>(id: string, priority: GlobalRelayPriority, operation: TaskOperation<T>, dependsOnTask?: string): Promise<T> {
        const task = new Task(id, priority, operation, dependsOnTask);

        // remove redundant tasks
        const shouldCancelTask = this.redundancyCleaner(task);
        if (shouldCancelTask) return task.promise;

        if (!this.tasks.has(task.id)) this.tasks.set(task.id, new Map());
        this.tasks.get(task.id)!.set(task.priority, task);

        this.queue.push(task);

        if (!this.inProcess) this.processTasks();

        return task.promise;
    }

    /**
     * Remove a priority task from the queue
     * @param id the ID of the task
     * @param priority the priority of the task
     */
    removeTask(id: string, priority: GlobalRelayPriority) {
        const tasks = this.getTasks(id);
        if (!tasks) return;

        tasks.delete(priority);
        if (tasks.size === 0) this.tasks.delete(id);
    }

    /**
     * Remove all the tasks for an ID
     * @param id the id of the tasks
     */
    removeTasks(id: string) {
        const tasks = this.tasks.get(id);
        if (!tasks) return;
        tasks.forEach(t => this.queue.remove(t));
        this.tasks.delete(id);
    }

    /**
     * Whether a task with this priority is queued
     * @param id the ID of the task
     * @param priority the priority of the task
     * @returns 
     */
    hasTask(id: string, priority: GlobalRelayPriority) {
        return !!this.tasks.get(id)?.get(priority);
    }

    /**
     * Whether a task with a lower priority exists
     * @param id the ID of the task
     * @param priority the priority to compare
     * @returns 
     */
    hasLowerTasks(id: string, priority: GlobalRelayPriority) {
        const tasks = this.tasks.get(id);
        if (!tasks) return false;

        if ([...tasks.values()].some(task => task.priority < priority)) return true;

        return false;
    }

    /**
     * Whether a task has any POST tasks
     * @param id the ID of the task
     * @returns 
     */
    hasPostTaskForId(id: string) {
        const tasks = this.tasks.get(id);
        if (!tasks) return false;
        if (tasks.has(GlobalRelayPriority.PostLowPriority) || tasks.has(GlobalRelayPriority.PostHighPriority)) return true;
        return false;
    }

    /**
     * Get a priority task for an ID
     * @param id the ID of the task
     * @param priority the priority of the task
     * @returns 
     */
    getTask(id: string, priority: GlobalRelayPriority) {
        return this.tasks.get(id)?.get(priority) || null;
    }

    /**
     * Get all the tasks for an ID
     * @param id the ID of the tasks
     * @returns 
     */
    getTasks(id: string) {
        return this.tasks.get(id) || null;
    }

    /**
     * Processes all the tasks in the queue
     */
    private async processTasks() {
        if (this.queue.size() === 0) return;
        this.inProcess = true;

        const task = this.queue.pop();
        if (!task) {
            this.inProcess = false;
            return;
        }

        this.removeTask(task.id, task.priority);

        // throttle
        const timeSinceLastExecution = Date.now() - this.lastExecutionTimestamp;
        if (timeSinceLastExecution < 1000) {
            await new Promise(resolve => setTimeout(resolve, 1000 - timeSinceLastExecution));
        }

        try {
            const result = await task.operation();
            this.lastExecutionTimestamp = Date.now();
            task.resolve(result);
        } catch (err) {
            task.reject(err);
            ErrorHandler.handle(err, { context: 'queue', emitAlert: true });
        }

        this.inProcess = false;
        this.processTasks();
    }

    /**
     * Remove tasks with lower priority
     * @param id the ID of the tasks
     * @param targetPriority the priority target
     * @returns the tasks removed
     */
    private redundancyCleaner<T>(task: Task<T>): boolean {
        // There is nothing to cancel on POST, and PATCH is depended on the existence of POST.
        if (task.isRelayPOST() || task.isRelayPATCH()) return false;
        // if the task was never POSTED cancel all operations
        if (task.isRelayDELETE() && this.hasPostTaskForId(task.id)) {
            this.removeTasks(task.id);
            return true;
        }

        // otherwise remove the lower priority tasks
        const tasks = this.getTasks(task.id);
        if (!tasks) return false;

        tasks.forEach(t => {
            if (t.priority < task.priority) this.removeTask(t.id, t.priority)
        });
        return false
    }
}

export const GlobalRelayQueue = new Queue();
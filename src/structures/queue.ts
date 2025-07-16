import { Heap } from "heap-js";
import { ErrorHandler } from "./error-handler.js";

export enum GlobalRelayPriority {
    PostLowPriority = 1,
    PostHighPriority,
    Update,
    Delete,
    ModDelete
}

export class Task<T = void> {
    static counter = 0;
    order: number;
    id: string;
    priority: GlobalRelayPriority;
    isExecuting: boolean = false;
    private readonly operation: () => Promise<T>;
    private resolve!: (value: T) => void;
    private reject!: (reason?: any) => void;
    promise: Promise<T>;

    constructor(id: string, priority: GlobalRelayPriority, task: () => Promise<any>) {
        this.id = id;
        this.priority = priority;
        this.operation = task;
        this.order = Task.counter++;
        this.promise = new Promise<T>((res, rej) => {
            this.resolve = res;
            this.reject = rej;
        });
    }

    async _run(): Promise<T> {
        this.isExecuting = true;
        try {
            const result = await this.operation();
            this.resolve(result);
            return result;
        } catch (err) {
            this.reject(err);
            throw err;
        }
    }

    /**
     * Whether the task aims to delete a relay
     * @returns
     */
    isDeletionOperation() {
        return this.priority >= GlobalRelayPriority.Delete;
    }

    /**
     * Whether the task is a relay (sending a message)
     * @returns 
     */
    isRelayOperation() {
        return (this.priority === GlobalRelayPriority.PostHighPriority) || (this.priority === GlobalRelayPriority.PostLowPriority);
    }
}

export class Queue {
    private taskMap: Map<string, Map<GlobalRelayPriority, Task<any>>>;
    private queue: Heap<Task<any>>;
    private isRunning = false;
    private currentTask: Task | null = null;
    private history: Map<string, GlobalRelayPriority> = new Map();
    private lastExecutionTime: number = 0;

    constructor() {
        this.queue = new Heap((a, b) => {
            if (a.priority === b.priority) return a.order - b.order;
            return b.priority - a.priority;
        });
        this.taskMap = new Map();
    }

    /**
     * Adds a new task to the queue
     * @param id the ID of the task
     * @param priority the priority of the task
     * @param operation the task to execute
     * @returns
     */
    addTask<T>(id: string, priority: GlobalRelayPriority, operation: (() => Promise<T>) | Promise<T>): Promise<T> {
        const op = typeof operation === 'function' ? operation : () => operation;
        const newTask = new Task<T>(id, priority, op);

        const hasCanceled = this.removeLowerPriorityTasks(newTask.id, newTask.priority);
        if (hasCanceled) return Promise.resolve(undefined as T);

        if (!this.taskMap.has(newTask.id)) this.taskMap.set(newTask.id, new Map());
        this.taskMap.get(newTask.id)!.set(newTask.priority, newTask);

        this.queue.push(newTask);
        if (!this.isRunning) this.processNextTask();

        return newTask.promise;
    }

    /**
     * Remove all the task's priorities lower than the provided one
     * @param id the ID of the task
     * @param priority The priority to compare to
     * @returns
     */
    removeLowerPriorityTasks(id: string, priority: GlobalRelayPriority) {
        const tasks = this.getTask(id);
        if (!tasks) return false;

        let currentPriority = GlobalRelayPriority.PostLowPriority;
        let removedCount = 0;
        while (currentPriority <= priority) {
            if (tasks.has(currentPriority)) removedCount += 1;
            this.removeTask(id, currentPriority);

            currentPriority += 1;
        }
        return removedCount ? true : false;
    }

    /**
     * Dequeues a task from the taskMap
     * @param task the task to dequeue on
     * @returns 
     */
    private dequeueMapTask(task: Task) {
        const result = this.taskMap.get(task.id);
        if (!result) return;

        result.delete(task.priority);
        if (result.size === 0) this.taskMap.delete(task.id);
    }

    /**
     * Removes and returns the next task in the queue
     * @returns 
     */
    private getNextTask() {
        const task = this.queue.pop() ?? null;
        if (task) this.dequeueMapTask(task);

        return task;
    }

    /**
     * Removes a priority task from the queue.
     * @param id the ID of the task
     * @param priority the priority to remove
     */
    removeTask(id: string, priority: GlobalRelayPriority) {
        const priorityTask = this.taskMap.get(id)?.get(priority);
        if (!priorityTask) return false

        this.queue.remove(priorityTask);
        this.dequeueMapTask(priorityTask);
        return true;
    }

    /**
     * Returns a priority task
     * @param id the ID of the task
     * @param priority the priority of the task
     * @returns 
     */
    getPriorityTask(id: string, priority: GlobalRelayPriority): Task | undefined {
        return this.taskMap.get(id)?.get(priority);
    }

    /**
     * Returns a task
     * @param id the ID of the task
     * @returns 
     */
    getTask(id: string) {
        return this.taskMap.get(id);
    }

    /**
     * Whether this ID has been queued.
     * @param id the ID of the task
     * @returns 
     */
    hasTask(id: string) {
        return id === this.currentTask?.id || this.taskMap.has(id);
    }

    /**
     * Checks if a task was queued with the given priority
     * @param id the ID of the task
     * @param priority the priority level of the task
     * @returns 
     */
    hasPriorityTask(id: string, priority: GlobalRelayPriority) {
        if (this.currentTask?.id === id && this.currentTask.priority === priority) return true;

        if (this.getTask(id)?.has(priority)) return true;

        if ((this.history.get(id) || 0) === priority) return true;

        return this.history.get(id) === priority;
    }

    /**
     * Processes all the tasks in the queue
     * @returns 
     */
    private async processNextTask() {
        if (this.isRunning) return;
        this.isRunning = true;

        while (true) {
            const task = this.getNextTask();
            if (!task) break;
            this.currentTask = task;

            const now = Date.now();
            const timeSinceLastExecution = now - this.lastExecutionTime;
            if (timeSinceLastExecution < 1000) {
                await new Promise(resolve => setTimeout(resolve, 1000 - timeSinceLastExecution));
            }

            try {
                await task._run();
                this.lastExecutionTime = Date.now();
            } catch (err) {
                ErrorHandler.handle(err, { context: 'Queue', emitAlert: true });
            }

            this.addHistory(task.id, task.priority);
        }

        this.currentTask = null;
        this.isRunning = false;
    }

    /**
     * Add a task to the history ( max age: 10 )
     * @param id the ID of the task
     * @param priority the priority of the task
     */
    private addHistory(id: string, priority: GlobalRelayPriority) {
        this.history.set(id, priority);
        if (this.history.size > 10) {
            this.history.delete(this.history.keys().next().value!)
        }
    }
}

export const GlobalRelayQueue = new Queue();
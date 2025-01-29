interface WorkboxEvent extends Event {
    type: string;
    target: any;
    waitUntil(fn: Promise<any>): void;
}

interface Workbox {
    addEventListener(
        event: string,
        callback: (event: WorkboxEvent) => void
    ): void;
    register(): Promise<void>;
    messageSkipWaiting(): void;
}

declare interface Window {
    workbox: Workbox;
}

export class PendingStore<T> {
  private value: T | null = null;

  set(v: T): void {
    this.value = v;
  }

  get(): T | null {
    return this.value;
  }

  take(): T | null {
    const v = this.value;
    this.value = null;
    return v;
  }
}

// Vendored from console-one/utils/async.ts — only the bits the test
// runner needs. `toRemoteSignal` exposes a callable consumer plus the
// promise that resolves with the wrapped function's result; the test
// environment uses it to give a Validator a one-way signal back to the
// summarizer without exposing the summarizer's internals.

type Mapper<K, T> = (...args: K[]) => T;
type Consumer<T> = (arg: T) => void;

/**
 * Wrap an async function so its eventual result is exposed as a
 * `[consumer, promise]` pair: invoke `consumer(...args)` to drive the
 * function, await `promise` to receive the result.
 */
export function toRemoteSignal<K, T>(fnc: any): [Consumer<K>, Promise<T>] {
  const toResolver = (
    resolve: Consumer<T>,
    reject: Consumer<any>,
  ): Mapper<K, Promise<void>> => {
    return async (...args: K[]): Promise<void> => {
      try {
        const result: T = await (fnc as Mapper<K, T>)(...args);
        resolve(result);
      } catch (err) {
        reject(err);
      }
    };
  };

  let wrapped!: Mapper<K, Promise<void>>;
  const promised = new Promise<T>((resolve, reject) => {
    wrapped = toResolver(resolve, reject);
  });
  return [wrapped as unknown as Consumer<K>, promised];
}

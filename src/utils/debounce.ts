export class DebounceCancelledError extends Error {}

export function debounce(
  func: () => Promise<void>,
  wait: number,
): () => Promise<void> {
  let timeoutId: number | null = null;
  let rejectPrevious: ((err: Error) => void) | null = null;

  return () => {
    if (rejectPrevious) {
      rejectPrevious(new DebounceCancelledError());
    }

    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }

    return new Promise<void>((resolve, reject) => {
      rejectPrevious = reject;
      timeoutId = setTimeout(async () => {
        try {
          await func();
          resolve();
        } catch (err) {
          reject(err);
        } finally {
          timeoutId = null;
          rejectPrevious = null;
        }
      }, wait);
    });
  };
}

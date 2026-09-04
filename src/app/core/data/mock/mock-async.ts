import { Observable, delay, of, throwError, timer } from 'rxjs';
import { switchMap } from 'rxjs/operators';

/** One-shot async, matching a future HTTP call. No artificial multi-second wait. */
const MOCK_LATENCY_MS = 0;

export function mockOf<T>(value: T): Observable<T> {
  return of(structuredClone(value)).pipe(delay(MOCK_LATENCY_MS));
}

export function mockVoid(): Observable<void> {
  return of(undefined).pipe(delay(MOCK_LATENCY_MS));
}

export function mockNotFound(entity: string): Observable<never> {
  return timer(MOCK_LATENCY_MS).pipe(
    switchMap(() => throwError(() => new Error(`${entity} not found`))),
  );
}

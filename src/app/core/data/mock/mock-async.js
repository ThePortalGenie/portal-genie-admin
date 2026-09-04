import { delay, of, throwError, timer } from 'rxjs';
import { switchMap } from 'rxjs/operators';
/** One-shot async, matching a future HTTP call. No artificial multi-second wait. */
const MOCK_LATENCY_MS = 0;
export function mockOf(value) {
    return of(structuredClone(value)).pipe(delay(MOCK_LATENCY_MS));
}
export function mockVoid() {
    return of(undefined).pipe(delay(MOCK_LATENCY_MS));
}
export function mockNotFound(entity) {
    return timer(MOCK_LATENCY_MS).pipe(switchMap(() => throwError(() => new Error(`${entity} not found`))));
}

type UnauthorizedHandler = () => void;

let handler: UnauthorizedHandler | null = null;

export function registerUnauthorizedHandler(fn: UnauthorizedHandler): void {
  handler = fn;
}

export function triggerUnauthorized(): void {
  if (handler) {
    handler();
  } else {
    console.error('[session] No hay handler registrado para sesión no autorizada');
  }
}

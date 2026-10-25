export class PurchaseCancelledError extends Error {
  readonly code = 'cancelled' as const;

  constructor() {
    super('Purchase cancelled');
    this.name = 'PurchaseCancelledError';
  }
}

export class PurchaseFailedError extends Error {
  readonly code = 'failed' as const;

  constructor(message = 'Purchase failed') {
    super(message);
    this.name = 'PurchaseFailedError';
  }
}

export function isPurchaseCancelled(error: unknown): boolean {
  if (error instanceof PurchaseCancelledError) {
    return true;
  }
  return error instanceof Error && error.name === 'PurchaseCancelledError';
}

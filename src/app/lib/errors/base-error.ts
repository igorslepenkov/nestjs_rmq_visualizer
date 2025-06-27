export abstract class BaseError extends Error {
  constructor(message: string) {
    super(message);
  }

  abstract getMessage(): string;
}

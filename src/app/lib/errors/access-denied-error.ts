import { BaseError } from "./base-error";

export class AccessDeniedError extends BaseError {
  constructor(inputPath: string) {
    super(
      `Directory: ${inputPath} is not found or cannot be accessed by the app`,
    );
  }

  getMessage(): string {
    return this.message;
  }
}

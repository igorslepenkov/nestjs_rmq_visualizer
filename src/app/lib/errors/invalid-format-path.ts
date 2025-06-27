import { BaseError } from "./base-error";

export class InvalidFormatPathError extends BaseError {
  constructor(inputPath: string) {
    super(`Project path format is invalid: ${inputPath}`);
  }

  getMessage(): string {
    return this.message;
  }
}

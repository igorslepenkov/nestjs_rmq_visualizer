import { BaseError } from "./base-error";

export class NestProjectNotFoundError extends BaseError {
  constructor(inputPath: string) {
    super(`Nest project is not found on path ${inputPath}`);
  }

  getMessage(): string {
    return this.message;
  }
}

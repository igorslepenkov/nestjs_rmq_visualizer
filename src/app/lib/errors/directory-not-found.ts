import { BaseError } from "./base-error";

export class DirectoryNotFoundError extends BaseError {
  constructor(inputPath: string) {
    super(`Directory: ${inputPath} could not be found`);
  }

  getMessage(): string {
    return this.message;
  }
}

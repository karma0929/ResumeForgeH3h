export class ResumeForgeError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "CONFIGURATION_ERROR"
      | "AUTHENTICATION_ERROR"
      | "AUTHORIZATION_ERROR"
      | "VALIDATION_ERROR"
      | "RATE_LIMIT_ERROR"
      | "EXTERNAL_SERVICE_ERROR",
  ) {
    super(message);
    this.name = "ResumeForgeError";
  }
}

export class ConfigurationError extends ResumeForgeError {
  constructor(message: string) {
    super(message, "CONFIGURATION_ERROR");
    this.name = "ConfigurationError";
  }
}

export class AuthenticationError extends ResumeForgeError {
  constructor(message = "You must be logged in to continue.") {
    super(message, "AUTHENTICATION_ERROR");
    this.name = "AuthenticationError";
  }
}

export class AuthorizationError extends ResumeForgeError {
  constructor(message = "You do not have permission to perform this action.") {
    super(message, "AUTHORIZATION_ERROR");
    this.name = "AuthorizationError";
  }
}

export class ValidationError extends ResumeForgeError {
  constructor(message: string) {
    super(message, "VALIDATION_ERROR");
    this.name = "ValidationError";
  }
}

export class RateLimitError extends ResumeForgeError {
  constructor(message = "Please wait a moment before trying again.") {
    super(message, "RATE_LIMIT_ERROR");
    this.name = "RateLimitError";
  }
}

export class ExternalServiceError extends ResumeForgeError {
  constructor(message: string) {
    super(message, "EXTERNAL_SERVICE_ERROR");
    this.name = "ExternalServiceError";
  }
}

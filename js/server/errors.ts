export class CanonicalCodeError extends Error {
  
  constructor(readonly statusCode: number, message?: string) {
    super(message);
    this.name = 'CanonicalCodeError';
  }
}

export class BadRequestError extends CanonicalCodeError {
  
  constructor(message?: string) {
    super(400, message);
    this.name = 'BadRequestError';
  }
}

export class NotFoundError extends CanonicalCodeError {
  
  constructor(message?: string) {
    super(404, message);
    this.name = 'NotFoundError';
  }
}

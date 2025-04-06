export abstract class Result<T, E> {
  isOk(): this is Ok<T> {
    return this instanceof Ok;
  }
  isErr(): this is Err<E> {
    return this instanceof Err;
  }
  abstract map<U>(f: (value: T) => U): Result<U, E>;
  abstract flatMap<U>(f: (value: T) => Result<U, E>): Result<U, E>;
  abstract get(): T;
}

export class Ok<T> extends Result<T, never> {
  constructor(public value: T) {
    super();
  }
  map<U>(f: (value: T) => U): Result<U, never> {
    return new Ok(f(this.value));
  }

  flatMap<U>(f: (value: T) => Result<U, never>): Result<U, never> {
    return f(this.value);
  }
  get(): T {
    return this.value;
  }
}

export class Err<E> extends Result<never, E> {
  constructor(public error: E) {
    super();
  }
  map<U>(f: (value: never) => U): Result<U, E> {
    return this;
  }

  flatMap<U>(f: (value: never) => Result<U, E>): Result<U, E> {
    return this;
  }
  get(): never {
    throw this.error;
  }
}

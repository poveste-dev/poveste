export class Account {
  [Symbol.iterator]() {
    return [this.token, this.role, this.#secret][Symbol.iterator]()
  }

  id = ''
  private token = ''
  protected role = ''
  #secret = ''
}

export declare const account: Account

// TODO: remove this file completely and replace the use of __proto__ with Object.getPrototypeOf
interface History {
  [key: string]: any;
  __proto__: Record<string, unknown>;
}

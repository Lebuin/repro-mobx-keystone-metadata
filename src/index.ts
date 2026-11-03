// Polyfills `Symbol.metadata` and defines the non-writable
// `Function.prototype[Symbol.metadata] = null` required by the decorator metadata
// proposal. Engines that implement decorator metadata natively behave the same.
import 'core-js/actual/symbol/metadata.js';
import 'core-js/actual/function/metadata.js';

import { computed } from 'mobx';
import { ExtendedModel, Model, model, prop } from 'mobx-keystone';

// Any standard decorator works. Compiling it gives `Base` an own, enumerable
// `Symbol.metadata` property.
@model('repro/Base')
class Base extends Model({ x: prop(1) }) {
  @computed
  get double() {
    return this.x * 2;
  }
}

console.log(
  'Base has an own Symbol.metadata property:',
  Object.getOwnPropertyDescriptor(Base, Symbol.metadata),
);

// Throws: TypeError: Cannot assign to read only property 'Symbol(Symbol.metadata)' of
// function 'function ThisModel(...) {...}'
@model('repro/Child')
class Child extends ExtendedModel(Base, { y: prop(2) }) {}

console.log('No error:', new Child({}).double);

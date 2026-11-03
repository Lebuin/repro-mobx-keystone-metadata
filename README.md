# mobx-keystone: `ExtendedModel` throws when the base class has decorator metadata

`ExtendedModel` throws a `TypeError` when the base model uses standard (TC39)
decorators and decorator metadata is supported, either natively or through a
polyfill like core-js:

```
TypeError: Cannot assign to read only property 'Symbol(Symbol.metadata)' of function 'function ThisModel(initialData, constructorOptions) {...}'
    at sharedInternalModel (mobx-keystone/dist/mobx-keystone.esm.mjs:12134:77)
    at internalModel$1 (mobx-keystone/dist/mobx-keystone.esm.mjs:12242:9)
    at ExtendedModel (mobx-keystone/dist/mobx-keystone.esm.mjs:12235:9)
```

Versions: mobx-keystone 2.4.2, mobx 7.1.4, core-js 3.51.0, TypeScript 7.0.2, Node
22.

## Run

```sh
pnpm install
pnpm run repro
```

[`src/index.ts`](src/index.ts) defines a model with a standard decorator and extends
it with `ExtendedModel`. The decorators are compiled by TypeScript, so no other build
tool is involved.

## Cause

Compiling a class with standard decorators gives it an own, enumerable
`Symbol.metadata` property. TypeScript emits:

```js
Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
```

The decorator metadata proposal also defines `Function.prototype[Symbol.metadata]` as
a non-writable `null`. core-js polyfills that, and engines that implement the proposal
natively will have it as well.

When creating the model class, `sharedInternalModel` copies the enumerable static
properties of the base class onto `ThisModel`, a plain function whose prototype is
`Function.prototype`, by assignment:

```ts
for (const key of Reflect.ownKeys(base)) {
  // ...
  if (Object.prototype.propertyIsEnumerable.call(base, key)) {
    ;(ThisModel as any)[key] = (base as any)[key]
  }
}
```

Assigning a property that is inherited as non-writable fails, and throws in strict
mode (the "override mistake"). So copying `Symbol.metadata` throws. The UMD build is
not in strict mode, so there the assignment silently does nothing and the subclass
doesn't get the base class's metadata. The same applies to any key that is
non-writable on `Function.prototype`, like `Symbol.hasInstance`.

Without the `Symbol.metadata` polyfill, TypeScript doesn't emit metadata at all and
the repro passes. Remove the two core-js imports to see that.

## Fix

Define the property instead of assigning it. This creates the same property that a
successful assignment would, and still reads `base[key]`, so static getters behave the
same:

```ts
if (Object.prototype.propertyIsEnumerable.call(base, key)) {
  Object.defineProperty(ThisModel, key, {
    value: (base as any)[key],
    writable: true,
    enumerable: true,
    configurable: true,
  })
}
```

With this change applied to `dist/mobx-keystone.esm.mjs`, the repro prints
`No error: 2`.

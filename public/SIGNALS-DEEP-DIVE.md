# Advanced Angular Signals — Deep Dive (Beginner Friendly)

This guide explains Angular Signals step-by-step with a lot of commentary and examples aimed at beginners and developers new to reactive concepts.

Why this file exists
- The official docs cover the APIs (`signal`, `computed`, `effect`, `untracked`), but they assume some background in reactivity. This document fills the gap with detailed explanations, annotated code, common pitfalls, and simple exercises you can try right away.

Who this is for
- Angular developers who know components and services, but are new to signals or reactive programming.
- JS/TS developers who want a practical, example-first explanation.

Prerequisites
- Angular 16+ (signals introduced and improved in later versions; your workspace is Angular 19+)
- Basic TypeScript and Angular component knowledge

Quick contract (what you'll get)
- Inputs: simple values and example code snippets (TypeScript / Angular components)
- Outputs: clear behaviors, when updates run, and example patterns
- Error modes covered: memory leaks, stale subscriptions, accidental reactivity

Table of contents
- What is a Signal? (plain English)
- Core APIs: signal, computed, effect, untracked — with annotated examples
- Practical patterns (resource, debounced input, history/undo)
- Interop with RxJS
- Debugging and visualization tips
- FAQ and common pitfalls
- Small exercises to solidify learning

---

## What is a Signal? (plain English)

A signal is a small reactive value container. Think of it like a variable that can notify subscribers when it changes. Compared to classic Angular change detection or RxJS Observables:

- Signals are synchronous and pull-based: a reader asks for a value and the system knows which readers depend on which signals.
- Signals are lightweight and designed for fine-grained reactivity inside components and services.

High-level analogy: A signal is like a thermostat that tells all the radiators (readers) to update when the temperature (value) changes. But the thermostat only notifies radiators that have explicitly registered interest.

Core idea in one line
- You call `signal(value)` to create reactive state, `computed(fn)` to derive values, and `effect(fn)` to react to changes.

---

## Core APIs — gentle introductions with commentary

Note: the code below is TypeScript and targets Angular’s signal API.

1) signal(value)
- Creates a mutable reactive value.
- Basic example:

```typescript
import { signal } from '@angular/core';

// Create a signal holding a number
const counter = signal(0);

// Read the value
console.log(counter()); // prints 0

// Update the value
counter.set(counter() + 1);
console.log(counter()); // prints 1
```

Comments:
- counter() is a read. It registers a dependency if called inside a `computed` or `effect`.
- counter.set(...) updates the value and notifies dependents only if the new value is considered different (see equality below).

2) computed(() => value)
- A derived value that recalculates when its dependencies change. It's lazy: it only runs when someone reads it.

```typescript
import { computed } from '@angular/core';

const a = signal(2);
const b = signal(3);

const sum = computed(() => {
  // This function runs when a or b change, but only when someone reads `sum()`
  console.log('computing sum');
  return a() + b();
});

// Nothing logged yet — no one asked for `sum`.
console.log(sum()); // logs 'computing sum', then prints 5
console.log(sum()); // prints 5 (cached, no recompute)

a.set(4);
console.log(sum()); // logs 'computing sum', prints 7
```

Comments:
- Computed caches results until a dependency changes.
- If no one reads the computed, Angular may never execute the function; this is good for performance incase you are running intense or computationally expensive.

3) effect(fn)
- Run a function for side effects whenever dependencies used inside it change. Effects run immediately once when created.
> By default, you can only create an effect() within an injection context (where you have access to the inject function). The easiest way to satisfy this requirement is to call effect within a component, directive, or service constructor

```typescript
import { effect } from '@angular/core';

const count = signal(0);

effect(() => {
  // This runs now, and whenever count changes
  console.log('count changed to', count());
});

count.set(1); // effect runs -> logs 'count changed to 1'
count.set(2); // effect runs -> logs 'count changed to 2'
```

Effect cleanup
- Effects accept an `onCleanup` callback so you can unsubscribe from external resources.

```typescript
effect((onCleanup) => {
  const id = setInterval(() => console.log('tick', count()), 1000);
  onCleanup(() => clearInterval(id));
});
```

4) untracked(fn)
- Run a function without tracking signal reads as dependencies. Useful to read a signal's value without causing reactivity.

```typescript
const a = signal(1);
const b = signal(10);

const derived = computed(() => {
  const tracked = a();
  const untrackedValue = untracked(() => b()); // won't register b as a dependency
  return tracked + untrackedValue;
});

// derived only updates when `a` changes, not when `b` changes.
```

When to use untracked
- Use untracked when you want to read a signal but not react when it changes (e.g., one-off read inside an effect or computed where only some parts should drive updates).

---

## Key internals that beginners should understand (plain language)

1) Equality check (when does a signal notify dependents?)
- By default Angular uses reference equality (Object.is) i.e. if the reference changes, it's an update.
- For complex objects, consider `update` with functional updates or provide a custom equality when creating signals (some helper libs allow this). Example problem:

```typescript
const user = signal({ name: 'Alice' });
user.set({ name: 'Alice' }); // still a new object -> triggers updates although the same

// Use functional updates to keep the same reference when appropriate
user.update(u => ({ ...u, name: 'Alice' })); // still new ref
// To avoid triggering, don't create a new object unless needed
```

2) Laziness and caching
- Computed values are lazy and cached. They recalc only when: a) someone reads them, and b) at least one dependency changed since last calculation.

3) Batching
- Synchronous updates that happen in the same JavaScript turn will batch notifications so effects/computeds run only once per turn.

4) Memory & cleanup
- Effects can subscribe to external APIs. Always use `onCleanup` to unsubscribe to prevent leaks when the effect is torn down (such as when a component is destroyed).

---

## Practical patterns with annotated code

Pattern 1 — Resource (loading/error/data)
- A small helper pattern to manage async loading of data.

```typescript
import { signal, computed } from '@angular/core';

function createResource<T>(loader: () => Promise<T>) {
  const data = signal<T | null>(null);
  const loading = signal(false);
  const error = signal<any>(null);

  async function load() {
    loading.set(true);
    error.set(null);
    try {
      const result = await loader();
      data.set(result);
    } catch (err) {
      error.set(err);
    } finally {
      loading.set(false);
    }
  }

  // Convenience computed for direct checks
  const state = computed(() => ({ data: data(), loading: loading(), error: error() }));

  return { data, loading, error, load, state };
}

// Usage:
// const userResource = createResource(() => fetch('/api/user').then(r => r.json()));
// userResource.load();

// In template: show spinner when userResource.state().loading is true
```

Pattern 2 — Debounced signal (useful for search)

```typescript
import { signal, effect } from '@angular/core';

function createDebouncedSignal<T>(initial: T, delay = 300) {
  const immediate = signal(initial);
  const debounced = signal(initial);

  effect((onCleanup) => {
    const id = setTimeout(() => debounced.set(immediate()), delay);
    onCleanup(() => clearTimeout(id));
  });

  return { immediate, debounced };
}

// Usage:
// const { immediate, debounced } = createDebouncedSignal('', 250);
// immediate.set('u'); // user types -> immediate changes
// debounced updates after 250ms of pause
```

Pattern 3 — History / undo (simple)

```typescript
import { signal } from '@angular/core';

function createHistorySignal<T>(initial: T) {
  const value = signal(initial);
  const history = signal<T[]>([initial]);
  const index = signal(0);

  function set(v: T) {
    const newHistory = history().slice(0, index() + 1).concat([v]);
    history.set(newHistory);
    index.set(newHistory.length - 1);
    value.set(v);
  }

  function undo() {
    if (index() > 0) {
      index.set(index() - 1);
      value.set(history()[index()]);
    }
  }

  function redo() {
    const h = history();
    if (index() < h.length - 1) {
      index.set(index() + 1);
      value.set(history()[index()]);
    }
  }

  return { value, set, undo, redo, history, index };
}

// Usage: helpful for an editor or form undo stack
```

---

## Interop with RxJS

When you need to interoperate between RxJS Observables and signals, use helper functions like `toSignal` and `toObservable`.

> `toSignal` and `toObservable` run within an injection context (i.e. where you have access to the inject function). The easiest way to satisfy this requirement is to call effect within a component, directive, or service constructor

Basic pattern: turn observable into a signal

```typescript
import { toSignal } from '@angular/core/rxjs-interop';

const obs$ = someObservable$; // RxJS
const sig = toSignal(obs$, { initialValue: null });

// Now `sig()` reads the latest emitted value.
```

Conversely, if an API expects an Observable, you can create one from a signal with `toObservable`.

---

## Debugging tips and visualization

- Console logs: Add logging inside `computed` and `effect` functions to see when they run.
- Use small helper utilities to print the dependency graph (advanced). You can instrument your signals in development to trace which signals depend on which.
- Watch for too-frequent recomputations: add a console counter in a heavy computed to ensure it's not recalculating unnecessarily.

Example: instrument a computed

```typescript
let computeCount = 0;
const heavy = computed(() => {
  computeCount++;
  console.log('heavy computed runs', computeCount);
  return expensiveCalculation();
});
```

If computeCount grows unexpectedly, search for where dependencies are changing, perhaps an object reference was recreated each change.

---

## FAQ & common pitfalls (quick answers)

Q: I changed an object but my computed didn't run — why?
- A: You may be mutating the object rather than creating a new reference. Signals use reference equality; mutating an object keeps the same reference so no notification. Use immutable updates.

Q: My effect runs many times — how to reduce it?
- A: Check what signals you read inside the effect. Use `untracked` for reads that should not be dependencies. Or split the effect into smaller effects.

Q: Are signals async or sync?
- Signals are synchronous: updates and notifications happen in the same JavaScript turn, but async actions (fetch, setTimeout) still use Promises/timeouts.

Q: How to avoid memory leaks in effects?
- Always use `onCleanup` to teardown subscriptions and intervals created inside effects.

Q: When should I use RxJS vs signals?
- RxJS is powerful for streams and operators; use it for complex async pipelines or cross-app streaming. Use signals for local, synchronous reactive state within components and services. They can interoperate.

---

## Exercises (quick & practical)

1) Create a debounced search: use `createDebouncedSignal` above and wire it to a fake fetch that logs queries.
2) Implement a small todo list with a Signal Set (add/remove/toggle) and persist to localStorage.
3) Convert a small RxJS-based component to signals: replace a BehaviorSubject with a signal and compare the code size and clarity.

---

## Links & further reading

- Official Angular signals guide: https://angular.dev/guide/signals
- RxJS docs for thinking about streams: https://rxjs.dev
- Community posts and deep dives (search for example "angular signals deep dive")

---

This repo has:
- Runnable demo components in `src/app/components/`.

You can go ahead, fork this repo and:
- Create small unit tests for the patterns above.
- Add more signal concepts and ideas on how one can use signals creatively

> If you have something interesting, create a PR and share with us all.

Happy learning!

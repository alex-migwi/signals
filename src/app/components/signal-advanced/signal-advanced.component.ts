// ============================================================================
// ADVANCED ANGULAR SIGNALS - DEEP DIVE COMPONENT
// ============================================================================
// This component demonstrates advanced signal concepts that go beyond basic usage.
// These are patterns and techniques you won't find in most tutorials:
//
// 1. Custom equality functions for performance optimization
// 2. Untracked reads to break reactive dependencies
// 3. Effect cleanup and lifecycle management
// 4. Linked signals (bidirectional synchronization)
// 5. RxJS interop patterns
// 6. Dynamic signal creation with injection contexts
// 7. Understanding signal dependency graphs
// 8. Custom state management with signals
// 9. Computed signal memoization behavior
// 10. WritableSignal update() vs set() differences
//
// For beginners: These are "power user" features. Start with the basic
// patterns first, then come back here when you need advanced control.
// ============================================================================

import {
  Component,
  signal,
  computed,
  effect,
  Signal,
  WritableSignal,
  untracked,
  Injector,
  runInInjectionContext,
  DestroyRef,
  inject,
  ChangeDetectorRef
} from '@angular/core';
import { toSignal, toObservable } from '@angular/core/rxjs-interop';
import { Observable, Subject, interval, map, take, tap } from 'rxjs';
import { CommonModule } from '@angular/common';

/**
 * ADVANCED ANGULAR SIGNALS PATTERNS
 * 
 * This component is designed as an interactive learning tool.
 * Each section has buttons you can click to see the concepts in action.
 * Open your browser's console to see detailed logs of what's happening.
 * 
 * Key learning goals:
 * - Understand when and why signals update
 * - Learn to optimize performance
 * - Master effect cleanup to prevent memory leaks
 * - Integrate signals with existing RxJS code
 */
@Component({
  selector: 'app-signal-advanced',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="signals-demo">
      <h1>Advanced Angular Signals - Hidden Patterns</h1>
      
      <section>
        <h2>1. Custom Equality Functions (Performance)</h2>
        <p>Signals accept a custom equality function to prevent unnecessary updates</p>
        <div class="demo-box">
          <button (click)="updateUser()">Update User (same data)</button>
          <button (click)="updateUserDeepChange()">Update User (nested change)</button>
          <p>Compute count (no custom equality): {{ computeCountNoCustom() }}</p>
          <p>Compute count (with deep equality): {{ computeCountWithCustom() }}</p>
          <pre>{{ userWithCustomEquality() | json }}</pre>
        </div>
      </section>

      <section>
        <h2>2. Untracked Reads - Breaking Reactivity</h2>
        <p>Use untracked() to read signals without creating dependencies</p>
        <div class="demo-box">
          <button (click)="incrementCounter()">Increment Counter: {{ counter() }}</button>
          <button (click)="incrementHidden()">Increment Hidden: {{ hiddenCounter() }}</button>
          <p>Tracked Message: "{{ trackedMessage() }}"</p>
          <p>Untracked Message: "{{ untrackedMessage() }}"</p>
          <p class="hint">Notice: untrackedMessage only updates with counter, not hiddenCounter!</p>
        </div>
      </section>

      <section>
        <h2>3. Effect Cleanup & Lifecycle</h2>
        <p>Effects can return cleanup functions and use onCleanup</p>
        <div class="demo-box">
          <button (click)="toggleTimer()">{{ timerActive() ? 'Stop' : 'Start' }} Timer</button>
          <p>Effect execution count: {{ effectExecutionCount() }}</p>
          <p>Cleanup count: {{ cleanupCount() }}</p>
          <ul>
            @for (log of effectLogs(); track $index) {
              <li>{{ log }}</li>
            }
          </ul>
        </div>
      </section>

      <section>
        <h2>4. Linked Signals (Bidirectional Updates)</h2>
        <p>Create signals that stay in sync using effects</p>
        <div class="demo-box">
          <label>
            Celsius: 
            <input type="number" [value]="celsius()" 
                   (input)="celsius.set(+$any($event.target).value)" />
          </label>
          <label>
            Fahrenheit: 
            <input type="number" [value]="fahrenheit()" 
                   (input)="fahrenheit.set(+$any($event.target).value)" />
          </label>
          <p class="hint">These stay in sync bidirectionally!</p>
        </div>
      </section>

      <section>
        <h2>5. Signal + RxJS Interop Patterns</h2>
        <p>Advanced patterns for combining signals with observables</p>
        <div class="demo-box">
          <button (click)="triggerAsyncOperation()">Trigger Async Op</button>
          <p>Loading: {{ asyncState().loading }}</p>
          <p>Data: {{ asyncState().data }}</p>
          <p>Error: {{ asyncState().error }}</p>
          <p class="hint">Using toSignal with initialValue and manualCleanup</p>
        </div>
      </section>

      <section>
        <h2>6. Signal Injection Context</h2>
        <p>Create computed/effects outside injection context</p>
        <div class="demo-box">
          <button (click)="createDynamicSignal()">Create Dynamic Signal</button>
          <p>Dynamic signals created: {{ dynamicSignals().length }}</p>
          <ul>
            @for (sig of dynamicSignals(); track $index) {
              <li>Signal {{ $index }}: {{ sig() }}</li>
            }
          </ul>
        </div>
      </section>

      <section>
        <h2>7. Signal Graph & Dependencies</h2>
        <p>Understanding signal dependency graph</p>
        <div class="demo-box">
          <button (click)="incrementSourceA()">Update A: {{ sourceA() }}</button>
          <button (click)="incrementSourceB()">Update B: {{ sourceB() }}</button>
          <p>Derived AB: {{ derivedAB() }}</p>
          <p>Derived ABC: {{ derivedABC() }}</p>
          <p>Effect trigger count: {{ graphEffectCount() }}</p>
          <pre class="small">{{ signalGraph() }}</pre>
        </div>
      </section>

      <section>
        <h2>8. Signal-based State Management</h2>
        <p>Custom state management pattern with signals</p>
        <div class="demo-box">
          <button (click)="store.increment()">Increment</button>
          <button (click)="store.decrement()">Decrement</button>
          <button (click)="store.reset()">Reset</button>
          <p>Count: {{ store.count() }}</p>
          <p>Is Even: {{ store.isEven() }}</p>
          <p>History: {{ store.history().join(', ') }}</p>
        </div>
      </section>

      <section>
        <h2>9. Computed Signal Memoization</h2>
        <p>Computed signals cache results and only recalculate when dependencies change</p>
        <div class="demo-box">
          <button (click)="incrementExpensiveInput()">Update Input: {{ expensiveInput() }}</button>
          <p>Expensive calculation runs: {{ expensiveCalcCount() }}</p>
          <p>Result: {{ expensiveComputed() }}</p>
          <p class="hint">Try reading expensiveComputed() multiple times - it only calculates once!</p>
        </div>
      </section>

      <section>
        <h2>10. WritableSignal.update() vs .set()</h2>
        <p>Understanding the difference and use cases</p>
        <div class="demo-box">
          <button (click)="updateArrayImmutable()">Update (immutable)</button>
          <button (click)="mutateArray()">Set (mutated)</button>
          <button (click)="arraySignal.set([])">Reset</button>
          <p>Array: {{ arraySignal() }}</p>
          <p>Render count: {{ arrayRenderCount() }}</p>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .signals-demo {
      padding: 2rem;
      max-width: 1200px;
      margin: 0 auto;
      font-family: system-ui, -apple-system, sans-serif;
    }

    section {
      margin: 2rem 0;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 1.5rem;
      background: #fafafa;
    }

    h1 {
      color: #dd0031;
    }

    h2 {
      color: #333;
      font-size: 1.3rem;
      margin-top: 0;
    }

    .demo-box {
      background: white;
      padding: 1rem;
      border-radius: 4px;
      margin-top: 1rem;
    }

    button {
      background: #dd0031;
      color: white;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 4px;
      cursor: pointer;
      margin: 0.25rem;
      font-size: 0.9rem;
    }

    button:hover {
      background: #c50028;
    }

    input {
      padding: 0.5rem;
      margin: 0 0.5rem;
      border: 1px solid #ccc;
      border-radius: 4px;
      width: 100px;
    }

    label {
      display: block;
      margin: 0.5rem 0;
    }

    pre {
      background: #f4f4f4;
      padding: 1rem;
      border-radius: 4px;
      overflow-x: auto;
    }

    pre.small {
      font-size: 0.8rem;
    }

    .hint {
      color: #666;
      font-style: italic;
      font-size: 0.9rem;
      margin-top: 0.5rem;
    }

    ul {
      max-height: 150px;
      overflow-y: auto;
    }
  `]
})
export class SignalAdvancedComponent {
  // Inject Angular services needed for advanced patterns
  private injector = inject(Injector);
  private destroyRef = inject(DestroyRef);
  private cdr = inject(ChangeDetectorRef);

  // ============================================================================
  // 1. CUSTOM EQUALITY FUNCTIONS
  // ============================================================================
  // Problem: By default, signals use Object.is() for equality checking.
  // For objects/arrays, this is REFERENCE equality, not deep equality.
  // This means setting a signal to a "new" object always triggers updates,
  // even if the content is identical.
  //
  // Solution: Provide a custom equality function that checks the actual content.
  //
  // When to use:
  // - You're updating signals with complex objects frequently
  // - You want to prevent unnecessary re-renders
  // - You control what "different" means for your data
  //
  // For beginners: Think of this like telling Angular "only update the UI
  // if the data REALLY changed, not just because it's a new object."
  // ============================================================================
  
  // Signal WITHOUT custom equality - triggers on every .set() call
  userNoCustom = signal({ name: 'John', age: 30, meta: { id: 1 } });
  computeCountNoCustom = signal(0);
  
  // Signal WITH custom equality - only triggers when content actually changes
  userWithCustomEquality = signal(
    { name: 'John', age: 30, meta: { id: 1 } },
    { 
      // This function determines if two values are "equal"
      equal: this.deepEqual 
    }
  );
  computeCountWithCustom = signal(0);

  constructor() {
    // Track how many times each signal triggers updates
    // This demonstrates the performance difference
    
    effect(() => {
      this.userNoCustom(); // Read the signal to create dependency
      this.computeCountNoCustom.update(c => c + 1);
    });

    effect(() => {
      this.userWithCustomEquality(); // Read the signal to create dependency
      this.computeCountWithCustom.update(c => c + 1);
    });
  }

  /**
   * Deep equality checker using JSON serialization.
   * Note: This is simple but not perfect (doesn't handle functions, dates, etc.)
   * For production, consider using libraries like lodash's isEqual.
   */
  private deepEqual(a: any, b: any): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
  }

  /**
   * Updates both signals with the SAME data.
   * userNoCustom will trigger (new object reference)
   * userWithCustomEquality will NOT trigger (content is the same)
   */
  updateUser() {
    this.userNoCustom.set({ name: 'John', age: 30, meta: { id: 1 } });
    this.userWithCustomEquality.set({ name: 'John', age: 30, meta: { id: 1 } });
  }

  /**
   * Updates with actually different data.
   * Both signals will trigger (content changed)
   */
  updateUserDeepChange() {
    this.userNoCustom.update(u => ({ ...u, meta: { id: u.meta.id + 1 } }));
    this.userWithCustomEquality.update(u => ({ ...u, meta: { id: u.meta.id + 1 } }));
  }

  // ============================================================================
  // 2. UNTRACKED READS - Breaking Reactivity Chains
  // ============================================================================
  // Problem: Sometimes you need to READ a signal's value without creating
  // a reactive dependency. If you don't use untracked(), every signal you
  // read inside a computed/effect becomes a dependency.
  //
  // Solution: Wrap reads in untracked(() => signal()) to read without tracking.
  //
  // When to use:
  // - Reading configuration that rarely changes
  // - Preventing infinite loops
  // - Performance optimization (fewer dependencies = fewer updates)
  // - One-time reads inside effects
  //
  // For beginners: untracked() is like saying "I need to check this value
  // right now, but don't watch it for changes."
  // ============================================================================
  // ============================================================================
  // 2. UNTRACKED READS - Breaking Reactivity Chains
  // ============================================================================
  // Problem: Sometimes you need to READ a signal's value without creating
  // a reactive dependency. If you don't use untracked(), every signal you
  // read inside a computed/effect becomes a dependency.
  //
  // Solution: Wrap reads in untracked(() => signal()) to read without tracking.
  //
  // When to use:
  // - Reading configuration that rarely changes
  // - Preventing infinite loops
  // - Performance optimization (fewer dependencies = fewer updates)
  // - One-time reads inside effects
  //
  // For beginners: untracked() is like saying "I need to check this value
  // right now, but don't watch it for changes."
  // ============================================================================
  
  counter = signal(0);
  hiddenCounter = signal(0);

  // This computed TRACKS both counters - updates when EITHER changes
  trackedMessage = computed(() => {
    return `Counter: ${this.counter()}, Hidden: ${this.hiddenCounter()}`;
  });

  // This computed only TRACKS counter - hiddenCounter is read but not tracked
  // It will ONLY update when counter() changes, not when hiddenCounter() changes!
  untrackedMessage = computed(() => {
    const count = this.counter(); // Tracked - creates dependency
    const hidden = untracked(() => this.hiddenCounter()); // NOT tracked!
    return `Counter: ${count}, Hidden: ${hidden}`;
  });

  incrementCounter() {
    this.counter.update(c => c + 1);
  }

  incrementHidden() {
    this.hiddenCounter.update(c => c + 1);
  }

  // ============================================================================
  // 3. EFFECT CLEANUP & LIFECYCLE MANAGEMENT
  // ============================================================================
  // Problem: Effects that create subscriptions, timers, or listeners can
  // cause memory leaks if not cleaned up properly.
  //
  // Solution: Use the onCleanup callback provided to effects.
  // It runs before the effect re-executes and when the component is destroyed.
  //
  // When to use:
  // - Creating setInterval/setTimeout
  // - Subscribing to observables
  // - Adding event listeners
  // - Opening connections (WebSocket, etc.)
  //
  // For beginners: onCleanup is like a "finally" block or a destructor.
  // It ensures you always clean up resources you created.
  // ============================================================================
  
  timerActive = signal(false);
  effectExecutionCount = signal(0);
  cleanupCount = signal(0);
  effectLogs = signal<string[]>([]);

  // This effect demonstrates proper cleanup
  private timerEffect = effect((onCleanup) => {
    // Only run the timer when active
    if (this.timerActive()) {
      this.effectExecutionCount.update(c => c + 1);
      this.addLog(`Effect started at ${new Date().toLocaleTimeString()}`);

      // Create a timer - this is a resource that needs cleanup!
      const intervalId = setInterval(() => {
        this.addLog(`Timer tick: ${new Date().toLocaleTimeString()}`);
      }, 1000);

      // CRITICAL: Register cleanup function
      // This runs when:
      // - The effect re-executes (timerActive changes)
      // - The component is destroyed
      onCleanup(() => {
        clearInterval(intervalId); // Stop the timer
        this.cleanupCount.update(c => c + 1);
        this.addLog(`Cleanup at ${new Date().toLocaleTimeString()}`);
      });
    }
  });

  toggleTimer() {
    this.timerActive.update(v => !v);
  }

  private addLog(message: string) {
    // Keep only the last 10 log messages
    this.effectLogs.update(logs => [...logs.slice(-10), message]);
  }

  // ============================================================================
  // 4. LINKED SIGNALS (BIDIRECTIONAL SYNCHRONIZATION)
  // ============================================================================
  // Problem: Sometimes you need two signals to stay in sync bidirectionally.
  // Example: Celsius and Fahrenheit - changing either should update the other.
  //
  // Solution: Use effects with untracked() to prevent infinite loops.
  // Read the target signal untracked to avoid circular dependencies.
  //
  // When to use:
  // - Unit conversions (temperature, currency, measurements)
  // - Synchronized inputs (slider + text field)
  // - Mirror states in different formats
  //
  // For beginners: We use untracked() to break the circular dependency.
  // Each effect watches one signal but reads the other without tracking.
  // ============================================================================
  
  celsius = signal(0);
  fahrenheit = signal(32);

  // Track which effect is currently running to prevent ping-pong
  private updatingFromEffect = false;

  // Effect 1: When Celsius changes, update Fahrenheit
  // We use untracked() to read fahrenheit without creating a dependency on it
  private celsiusToFahrenheitEffect = effect(() => {
    const c = this.celsius(); // Tracked - this effect reruns when celsius changes
    const newF = Math.round(c * 9/5 + 32);
    
    // Only update if the value actually changed (avoid unnecessary updates)
    // Read fahrenheit untracked - we don't want to depend on it!
    const currentF = untracked(() => this.fahrenheit());
    if (currentF !== newF && !this.updatingFromEffect) {
      this.updatingFromEffect = true;
      this.fahrenheit.set(newF);
      this.updatingFromEffect = false;
    }
  });

  // Effect 2: When Fahrenheit changes, update Celsius
  // We use untracked() to read celsius without creating a dependency on it
  private fahrenheitToCelsiusEffect = effect(() => {
    const f = this.fahrenheit(); // Tracked - this effect reruns when fahrenheit changes
    const newC = Math.round((f - 32) * 5/9);
    
    // Only update if the value actually changed
    // Read celsius untracked - we don't want to depend on it!
    const currentC = untracked(() => this.celsius());
    if (currentC !== newC && !this.updatingFromEffect) {
      this.updatingFromEffect = true;
      this.celsius.set(newC);
      this.updatingFromEffect = false;
    }
  });

  // ============================================================================
  // 5. SIGNAL + RXJS INTEROP PATTERNS
  // ============================================================================
  // Problem: You have existing RxJS code but want to use signals.
  // Or you need features RxJS provides (operators, complex async flows).
  //
  // Solution: Use toSignal() and toObservable() to convert between them.
  //
  // When to use:
  // - Migrating from RxJS to signals gradually
  // - Using RxJS operators with signal data
  // - Integrating with libraries that use observables
  //
  // For beginners: Signals and RxJS can work together!
  // Convert between them as needed.
  // ============================================================================
  
  private asyncSubject = new Subject<number>();
  
  // Signal holding the async state (loading, data, error)
  asyncState = signal<{loading: boolean, data: number | null, error: any}>({
    loading: false,
    data: null,
    error: null
  });

  // Effect that processes the RxJS stream and updates the signal
  // FIXED: Now properly cleans up subscriptions
  private asyncEffect = effect((onCleanup) => {
    const subscription = this.asyncSubject.pipe(
      tap(() => this.asyncState.update(s => ({ ...s, loading: true }))),
      map(x => x * 2), // RxJS operator
      tap({
        next: (data) => this.asyncState.set({ loading: false, data, error: null }),
        error: (error) => this.asyncState.set({ loading: false, data: null, error })
      })
    ).subscribe();

    // CRITICAL: Clean up the subscription to prevent memory leaks
    onCleanup(() => {
      subscription.unsubscribe();
    });
  });

  triggerAsyncOperation() {
    this.asyncSubject.next(Math.floor(Math.random() * 100));
  }

  // ============================================================================
  // 6. SIGNAL INJECTION CONTEXT
  // ============================================================================
  // Problem: Signals, computed, and effects need an "injection context"
  // (usually provided by the constructor). Creating them outside the
  // constructor (e.g., in a method) will fail.
  //
  // Solution: Use runInInjectionContext() to provide the context manually.
  //
  // When to use:
  // - Dynamically creating signals in response to user actions
  // - Factory functions that create reactive structures
  // - Advanced state management patterns
  //
  // For beginners: Think of injection context like "permission to create
  // reactive things." Normally you have it in the constructor, but sometimes
  // you need to explicitly provide it.
  // ============================================================================
  
  dynamicSignals = signal<Signal<number>[]>([]);

  createDynamicSignal() {
    // This MUST be wrapped in runInInjectionContext to work
    // Otherwise Angular will throw an error about missing injection context
    runInInjectionContext(this.injector, () => {
      const baseValue = this.dynamicSignals().length;
      // Create a computed signal that depends on an existing signal
      const newSignal = computed(() => baseValue + this.counter());
      // Add it to our collection
      this.dynamicSignals.update(sigs => [...sigs, newSignal]);
    });
  }

  // ============================================================================
  // 7. SIGNAL GRAPH & DEPENDENCIES
  // ============================================================================
  // Problem: Understanding how signals depend on each other can be tricky.
  // The "diamond problem" is when multiple paths lead to the same computed.
  //
  // Solution: Angular automatically optimizes the dependency graph.
  // Each computed only recalculates once per change, even with multiple paths.
  //
  // When to use this knowledge:
  // - Debugging unexpected updates
  // - Optimizing complex reactive systems
  // - Understanding performance characteristics
  //
  // For beginners: Imagine water flowing through pipes. Even if water comes
  // from two sources that merge, the final tap only fills once per flow.
  // ============================================================================
  
  sourceA = signal(0);
  sourceB = signal(0);
  
  // derivedAB depends on BOTH sourceA and sourceB (diamond problem!)
  derivedAB = computed(() => this.sourceA() + this.sourceB());
  
  // derivedABC depends on derivedAB
  derivedABC = computed(() => this.derivedAB() * 2);
  
  graphEffectCount = signal(0);

  // Computed signal that updates dynamically
  signalGraph = computed(() => `
Signal Dependency Graph:
    sourceA (${this.sourceA()}) ──┐
                                   ├──> derivedAB (${this.derivedAB()}) ──> derivedABC (${this.derivedABC()})
    sourceB (${this.sourceB()}) ──┘
  `);

  // This effect tracks derivedABC, which depends on both sources
  // When you update BOTH sources, the effect still only runs ONCE (batching!)
  private graphEffect = effect(() => {
    this.derivedABC();
    this.graphEffectCount.update(c => c + 1);
  });

  incrementSourceA() {
    this.sourceA.update(v => v + 1);
  }

  incrementSourceB() {
    this.sourceB.update(v => v + 1);
  }

  // ============================================================================
  // 8. SIGNAL-BASED STATE MANAGEMENT
  // ============================================================================
  // Problem: State management libraries (NgRx, Akita) can be heavy.
  // For simpler apps, signals provide a lightweight alternative.
  //
  // Solution: Create a store with signals for state and computed for selectors.
  // Actions are just methods that update signals.
  //
  // When to use:
  // - Small to medium apps that don't need NgRx
  // - Component-local state that needs reactivity
  // - Prototyping before adding a full state management solution
  //
  // For beginners: This is like Redux/NgRx but simpler.
  // State = signals, Selectors = computed, Actions = methods
  // ============================================================================
  
  store = this.createStore();

  private createStore() {
    // State: a signal holding the current count
    const state = signal(0);
    
    // History: track all values over time
    const history = signal<number[]>([0]);

    return {
      // === SELECTORS (computed - derived state) ===
      
      // Read-only view of the count
      count: state.asReadonly(),
      
      // Computed: is the count even?
      isEven: computed(() => state() % 2 === 0),
      
      // Read-only view of history
      history: history.asReadonly(),

      // === ACTIONS (methods that update state) ===
      
      increment: () => {
        state.update(c => c + 1);
        history.update(h => [...h, state()]);
      },
      
      decrement: () => {
        state.update(c => c - 1);
        history.update(h => [...h, state()]);
      },
      
      reset: () => {
        state.set(0);
        history.set([0]);
      }
    };
  }

  // ============================================================================
  // 9. COMPUTED SIGNAL MEMOIZATION
  // ============================================================================
  // Problem: Expensive calculations can slow down your app if they
  // run too often.
  //
  // Solution: Computed signals automatically cache (memoize) their results.
  // They only recalculate when dependencies change, not on every read.
  //
  // When to use:
  // - Expensive calculations (filtering large arrays, complex math)
  // - Derived state that's read multiple times per change detection cycle
  // - Transformations that should be cached
  //
  // For beginners: computed() is smart - it remembers its last answer
  // and only recalculates when needed. Reading it 100 times is as fast
  // as reading it once (after the first calculation).
  // ============================================================================
  
  expensiveInput = signal(0);
  expensiveCalcCount = signal(0);

  expensiveComputed = computed(() => {
    // Simulate expensive calculation (in real apps: filtering, parsing, etc.)
    // NOTE: We can't increment expensiveCalcCount here because you cannot
    // write to signals inside a computed! That's why we use an effect below.
    let result = 0;
    for (let i = 0; i < 1000000; i++) {
      result += this.expensiveInput() * i;
    }
    return result;
  });

  // Track how many times the computed recalculates
  // This effect runs whenever expensiveComputed recalculates
  // (which happens when expensiveInput changes)
  private trackExpensiveCalcEffect = effect(() => {
    // Reading the computed creates a dependency
    // The computed only recalculates when expensiveInput changes
    this.expensiveComputed();
    // This effect runs once per recalculation
    this.expensiveCalcCount.update(c => c + 1);
  });

  incrementExpensiveInput() {
    this.expensiveInput.update(v => v + 1);
  }

  // Try this in the UI:
  // 1. Click the button once - expensiveCalcCount increases by 1
  // 2. The template reads expensiveComputed() multiple times
  // 3. But expensiveCalcCount doesn't increase again - it's cached!
  // The counter tracks effect runs, which correspond to computed recalculations.

  // ============================================================================
  // 10. UPDATE() VS SET() - IMMUTABILITY MATTERS
  // ============================================================================
  // Problem: For arrays and objects, mutation doesn't trigger updates
  // because the reference stays the same.
  //
  // Solution: Always create new references for objects/arrays.
  // Use update() with spread operators or array methods that return new arrays.
  //
  // When to use:
  // - Working with arrays: use .map(), .filter(), [...arr]
  // - Working with objects: use spread {...obj} or Object.assign
  // - Never: array.push(), obj.prop = val (mutations)
  //
  // For beginners: Signals check "is this a different object?"
  // If you mutate (change internals but keep same reference), signals
  // don't notice. Always make a NEW array or object.
  // ============================================================================
  
  arraySignal = signal<number[]>([]);
  arrayRenderCount = signal(0);

  // Track how many times the array signal triggers updates
  private arrayEffect = effect(() => {
    this.arraySignal(); // Read to create dependency
    this.arrayRenderCount.update(c => c + 1);
  });

  /**
   * CORRECT: Creates a new array reference
   * The spread operator [...arr] creates a new array
   * Signal detects the new reference and triggers updates
   */
  updateArrayImmutable() {
    this.arraySignal.update(arr => [...arr, arr.length]);
  }

  /**
   * INCORRECT: Mutates the array but keeps same reference
   * arr.push() modifies the array in-place
   * .set() with the same reference doesn't trigger!
   * This is a common mistake.
   */
  mutateArray() {
    const arr = this.arraySignal(); // Get current array
    arr.push(arr.length);           // Mutate it (BAD!)
    this.arraySignal.set(arr);      // Set same reference (won't trigger!)
    // Result: arrayRenderCount doesn't increase!
  }
  
  // Key takeaway: ALWAYS use immutable patterns with signals
  // ✅ GOOD: [...arr, item], arr.filter(...), arr.map(...)
  // ❌ BAD:  arr.push(item), arr[0] = val, arr.splice(...)
}

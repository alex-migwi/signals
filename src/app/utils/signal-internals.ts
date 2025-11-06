// ============================================================================
// ANGULAR SIGNALS - DEEP DIVE INTO INTERNALS & PERFORMANCE
// ============================================================================
// This file explores the "under the hood" behavior of signals that isn't
// covered in most tutorials or documentation. Understanding these concepts
// will make you a signal power user!
//
// Topics covered:
// 1. Signal equality and reference checking (Object.is)
// 2. The Diamond Problem and how Angular solves it
// 3. Untracked reads for performance optimization
// 4. Effect scheduling and automatic batching
// 5. Effect cleanup patterns
// 6. Signal derivation chains and laziness
// 7. Arrays/objects and immutability requirements
// 8. Memory management and preventing leaks
// 9. Signals vs Zone.js change detection
// 10. Advanced patterns: signal middleware and debugging
//
// For beginners: This is "advanced" material. If you're just starting,
// read this AFTER you understand basic signal usage. These concepts help
// you debug performance issues and understand why signals behave as they do.
// ============================================================================

import { signal, computed, effect, Signal, WritableSignal, untracked, Injector } from '@angular/core';

// ============================================================================
// CONCEPT 1: SIGNAL EQUALITY AND REFERENCE CHECKING
// ============================================================================
// The most common "gotcha" with signals: equality checking
//
// Key insight: By default, signals use Object.is() for equality.
// For primitives (numbers, strings, booleans), this works as expected.
// For objects and arrays, this is REFERENCE equality, not deep equality.
//
// What this means:
// - If you create a new object/array with the same content, it's "different"
// - Signal will trigger updates even if the data didn't "really" change
// - This is intentional (performance), but you need to understand it
//
// Solutions:
// - Reuse references when possible (check before creating new objects)
// - Use functional updates with update() method
// - Provide custom equality functions for complex types
//
// For beginners: Think of it like this - signals check "is this the same box?"
// not "does this box contain the same stuff?"
// ============================================================================

/**
 * Demonstrates common equality pitfalls and solutions
 * Run this to see how reference equality can cause unexpected updates
 */
export function demonstrateEqualityPitfalls(injector: Injector) {
  console.log('\n=== Equality Pitfalls Demo ===\n');
  
  // ============================================================================
  // PART 1: The Problem - Reference Equality vs Deep Equality
  // ============================================================================
  console.log('PART 1: Understanding the Problem');
  console.log('----------------------------------');
  
  // ❌ ANTI-PATTERN: Creating new objects always triggers updates
  const user = signal({ name: 'John', age: 30 });
  
  let updateCount = 0;
  effect(() => {
    const currentUser = user(); // Create dependency
    updateCount++;
    console.log(`  [Effect] #${updateCount}: User is`, currentUser);
  }, { injector });
  
  // NOTE: Effects run asynchronously (in a microtask), so we use setTimeout
  // to ensure our explanation logs appear AFTER the effect has run
  setTimeout(() => {
    console.log('Initial effect run complete. Update count:', updateCount); // 1
    
    // This creates a NEW object reference, even though values are IDENTICAL
    console.log('\nSetting signal to { name: "John", age: 30 } (same values, new object)...');
    user.set({ name: 'John', age: 30 }); 
    
    setTimeout(() => {
      console.log('Update count after setting identical values:', updateCount); // 2
      console.log('❌ Problem: Effect ran again even though data is identical!');
      console.log('   Reason: New object reference, even with same content\n');
      
      // Demonstrate with Object.is (what signals use internally)
      const obj1 = { name: 'John', age: 30 };
      const obj2 = { name: 'John', age: 30 };
      const obj3 = obj1;
      
      console.log('Understanding Object.is (what signals use):');
      console.log('  Object.is(obj1, obj2):', Object.is(obj1, obj2)); // false (different references)
      console.log('  Object.is(obj1, obj3):', Object.is(obj1, obj3)); // true (same reference)
      console.log('  Content identical but references differ = signals see them as different!\n');
      
      // Continue to Part 2
      runPart2();
    }, 0);
  }, 0);
  
  // ============================================================================
  // PART 2: Solution 1 - Check Before Updating
  // ============================================================================
  function runPart2() {
    console.log('PART 2: Solution 1 - Manual Equality Check');
    console.log('-------------------------------------------');
    
    const userOptimized = signal({ name: 'Alice', age: 25 });
    let optimizedUpdateCount = 0;
    
    effect(() => {
      userOptimized();
      optimizedUpdateCount++;
      console.log(`  [Effect] Optimized effect #${optimizedUpdateCount}`);
    }, { injector });
    
    // Helper function that checks before creating new object
    function updateUserSmart(name: string, age: number) {
      const current = userOptimized();
      // Only create new object if values actually changed
      if (current.name === name && current.age === age) {
        console.log('  Values unchanged - skipping update');
        return; // Don't trigger update!
      }
      console.log('  Values changed - updating signal');
      userOptimized.set({ name, age });
    }
    
    setTimeout(() => {
      console.log('\nCalling updateUserSmart("Alice", 25) - same values:');
      updateUserSmart('Alice', 25);
      
      setTimeout(() => {
        console.log('  Final count:', optimizedUpdateCount); // Still 1!
        
        console.log('\nCalling updateUserSmart("Bob", 30) - different values:');
        updateUserSmart('Bob', 30);
        
        setTimeout(() => {
          console.log('  Final count:', optimizedUpdateCount); // Now 2
          console.log('✅ Success: Effect only ran when values actually changed!\n');
          runPart3();
        }, 0);
      }, 0);
    }, 0);
  }

  // ============================================================================
  // PART 3: Solution 2 - Use update() with Conditional Return
  // ============================================================================
  function runPart3() {
    console.log('PART 3: Solution 2 - Conditional Return in update()');
    console.log('----------------------------------------------------');
    
    const userBetter = signal({ name: 'Charlie', age: 35 });
    let betterUpdateCount = 0;
    
    effect(() => {
      userBetter();
      betterUpdateCount++;
      console.log(`  [Effect] Better effect #${betterUpdateCount}`);
    }, { injector });
    
    // Use update() with conditional logic - more elegant
    function updateUserName(name: string) {
      userBetter.update(current => {
        // Return SAME reference if no change (prevents trigger)
        if (current.name === name) {
          console.log('  Name unchanged - returning same reference');
          return current; // Key: same reference = no update!
        }
        console.log('  Name changed - returning new object');
        return { ...current, name }; // New reference = triggers update
      });
    }
    
    setTimeout(() => {
      console.log('\nCalling updateUserName("Charlie") - same name:');
      updateUserName('Charlie');
      
      setTimeout(() => {
        console.log('  Final count:', betterUpdateCount); // Still 1!
        
        console.log('\nCalling updateUserName("Diana") - different name:');
        updateUserName('Diana');
        
        setTimeout(() => {
          console.log('  Final count:', betterUpdateCount); // Now 2
          console.log('✅ Success: Returning same reference prevents unnecessary updates!\n');
          runPart4();
        }, 0);
      }, 0);
    }, 0);
  }

  // ============================================================================
  // PART 4: Solution 3 - Custom Equality Function
  // ============================================================================
  function runPart4() {
    console.log('PART 4: Solution 3 - Custom Equality Function');
    console.log('----------------------------------------------');
    
    // Custom equality function checks actual content, not reference
    const userWithCustomEquality = signal(
      { name: 'Eve', age: 40 },
      { 
        // This function determines if two values are "equal"
        // If it returns true, signal WON'T trigger updates
        equal: (a, b) => {
          const isEqual = a.name === b.name && a.age === b.age;
          console.log(`  [Equality Check] ${isEqual ? 'EQUAL' : 'DIFFERENT'} - ${JSON.stringify(a)} vs ${JSON.stringify(b)}`);
          return isEqual;
        }
      }
    );
    
    let customUpdateCount = 0;
    effect(() => {
      userWithCustomEquality();
      customUpdateCount++;
      console.log(`  [Effect] Custom equality effect #${customUpdateCount}`);
    }, { injector });
    
    setTimeout(() => {
      console.log('\nSetting signal to { name: "Eve", age: 40 } (same values, new object):');
      userWithCustomEquality.set({ name: 'Eve', age: 40 });
      
      setTimeout(() => {
        console.log('  Final count:', customUpdateCount); // Still 1!
        console.log('✅ Custom equality said "equal" - no update triggered!');
        
        console.log('\nSetting signal to { name: "Frank", age: 45 } (different values):');
        userWithCustomEquality.set({ name: 'Frank', age: 45 });
        
        setTimeout(() => {
          console.log('  Final count:', customUpdateCount); // Now 2
          console.log('✅ Custom equality said "different" - update triggered!\n');
          runPart5();
        }, 0);
      }, 0);
    }, 0);
  }

  // ============================================================================
  // PART 5: Real-World Example - Form State
  // ============================================================================
  function runPart5() {
    console.log('PART 5: Real-World Example - Form State Management');
    console.log('----------------------------------------------------');
    
    interface FormState {
      email: string;
      username: string;
      isDirty: boolean;
    }
    
    const formState = signal<FormState>(
      { email: '', username: '', isDirty: false },
      {
        equal: (a, b) => 
          a.email === b.email && 
          a.username === b.username && 
          a.isDirty === b.isDirty
      }
    );
    
    let formEffectCount = 0;
    effect(() => {
      const state = formState();
      formEffectCount++;
      console.log(`  [Effect] Form effect #${formEffectCount}: Email="${state.email}", Username="${state.username}"`);
    }, { injector });
    
    setTimeout(() => {
      // Simulate user typing
      console.log('\nUser types in email field:');
      formState.set({ email: 'user@example.com', username: '', isDirty: true });
      
      setTimeout(() => {
        console.log('  Effect count:', formEffectCount); // 2
        
        console.log('\nForm validation runs, creates new object with SAME values:');
        const current = formState();
        formState.set({ ...current }); // New object, same values
        
        setTimeout(() => {
          console.log('  Effect count:', formEffectCount); // Still 2!
          console.log('✅ Custom equality prevents re-render on validation checks!\n');
          
          printSummary();
        }, 0);
      }, 0);
    }, 0);
  }
  
  // ============================================================================
  // Summary
  // ============================================================================
  function printSummary() {
    console.log('='.repeat(60));
    console.log('KEY LESSONS:');
    console.log('='.repeat(60));
    console.log('1. Default: signals use Object.is() (reference equality)');
    console.log('2. New object = new reference = update (even if content is same)');
    console.log('3. Solution A: Check values before creating new objects');
    console.log('4. Solution B: Return same reference in update() when unchanged');
    console.log('5. Solution C: Custom equality function for deep comparison');
    console.log('6. For primitives (number, string, boolean): no issue!');
    console.log('7. For objects/arrays: choose the right solution for your use case');
    console.log('8. NOTE: Effects run asynchronously (microtask queue)');
    console.log('='.repeat(60) + '\n');
  }
}

// ============================================================================
// CONCEPT 2: THE DIAMOND PROBLEM AND COMPUTED SIGNAL OPTIMIZATION
// ============================================================================
// The "Diamond Problem" in reactive programming:
// When a computed value depends on multiple sources that share a common ancestor
//
// Visualization:
//        source
//       /      \
//      A        B     (both depend on source)
//       \      /
//        result        (depends on both A and B)
//
// The problem: When source changes, should result recalculate twice?
// (Once for A's change, once for B's change?)
//
// Angular's solution: NO! Computed signals are smart about dependencies.
// They only recalculate ONCE per change, even with diamond dependencies.
//
// This is called "glitch-free" execution - you never see inconsistent states.
//
// For beginners: This means signals are efficient even with complex
// dependency graphs. You don't need to worry about redundant calculations!
// ============================================================================

/**
 * Demonstrates how Angular solves the diamond problem
 * Watch the console to see each signal only calculates once per update
 */
export function demonstrateDiamondProblem(injector: Injector) {
  console.log('\n=== Diamond Problem Demo ===\n');
  
  // Counters to track how many times each signal calculates
  let aCalcs = 0;
  let bCalcs = 0;
  let resultCalcs = 0;

  // Source signal - the "top" of the diamond
  const source = signal(1);
  
  // Branch A - depends on source
  const computedA = computed(() => {
    aCalcs++;
    console.log('  [Computed] A calculating (source * 2)');
    return source() * 2;
  });
  
  // Branch B - also depends on source
  const computedB = computed(() => {
    bCalcs++;
    console.log('  [Computed] B calculating (source * 3)');
    return source() * 3;
  });
  
  // Result - depends on BOTH A and B (diamond!)
  // Question: When source changes, does this calculate once or twice?
  const result = computed(() => {
    resultCalcs++;
    console.log('  [Computed] Result calculating (A + B)');
    return computedA() + computedB();
  });

  // Create effect to trigger computation
  // Effects run asynchronously (in microtask queue)
  effect(() => {
    const value = result();
    console.log('  [Effect] Result is:', value);
  }, { injector });

  // Wait for effect to complete before checking
  setTimeout(() => {
    console.log('Initial calculations:', { aCalcs, bCalcs, resultCalcs });
    console.log('✅ Each computed ran once on initialization\n');
    
    // Update source - this affects both A and B
    console.log('--- Updating source from 1 to 2 ---');
    source.set(2);
    
    setTimeout(() => {
      console.log('After update:', { aCalcs, bCalcs, resultCalcs });
      console.log('✅ Answer: Each still only ran ONCE more!');
      console.log('   Even though result depends on both A and B, it only calculated once');
      console.log('   Angular ensures: No redundant calculations, even with diamonds!');
      console.log('   This is called "glitch-free" execution.\n');
    }, 0);
  }, 0);
}

// ============================================================================
// CONCEPT 3: UNTRACKED - PERFORMANCE OPTIMIZATION & LOOP PREVENTION
// ============================================================================
// What is untracked()?
// - A function that lets you READ signals without creating dependencies
// - Wraps a function and prevents any signal reads inside from being tracked
//
// Why do we need it?
// 1. Performance: Not everything needs to be reactive
// 2. Loop prevention: Avoid infinite update cycles
// 3. Conditional reactivity: Choose what triggers updates
//
// Common use cases:
// - Reading config that rarely changes
// - Accessing constants or reference data
// - Preventing infinite loops in effects
// - Performance optimization in hot paths
//
// For beginners: untracked() is like saying "I need to check this value
// right now, but don't tell me when it changes." It breaks the reactive chain.
// ============================================================================

/**
 * Demonstrates practical use cases for untracked()
 * These patterns are important for building performant applications
 */
export function demonstrateUntrackedUseCases(injector: Injector) {
  console.log('\n=== Untracked Use Cases Demo ===\n');
  
  // USE CASE 1: Reading configuration that rarely changes
  // Problem: Config changes once per app load, but you don't want
  // your effects/computeds to re-run every time
  
  const appConfig = signal({ theme: 'dark', language: 'en', apiUrl: 'http://api.com' });
  const userPreferences = signal({ fontSize: 14, notifications: true });

  // ❌ BAD: Effect reruns whenever appConfig OR userPreferences changes
  let badEffectRuns = 0;
  effect(() => {
    badEffectRuns++;
    const prefs = userPreferences(); // Creates dependency
    const config = appConfig();       // Creates dependency (unnecessary!)
    console.log(`  [Bad Effect] Run #${badEffectRuns}: Applying preferences in ${config.language}`);
  }, { injector });

  // ✅ GOOD: Only track userPreferences, read config without tracking
  let goodEffectRuns = 0;
  effect(() => {
    goodEffectRuns++;
    const prefs = userPreferences(); // Creates dependency
    // Read config WITHOUT creating dependency
    const language = untracked(() => appConfig().language);
    console.log(`  [Good Effect] Run #${goodEffectRuns}: Applying preferences in ${language}`);
    // This effect only reruns when userPreferences changes!
  }, { injector });

  // Wait for initial effects to run
  setTimeout(() => {
    console.log('\nInitial runs - bad:', badEffectRuns, 'good:', goodEffectRuns);
    
    // Test it:
    console.log('\n--- Changing appConfig theme ---');
    appConfig.set({ ...appConfig(), theme: 'light' });
    
    setTimeout(() => {
      console.log('After config change - bad runs:', badEffectRuns, 'good runs:', goodEffectRuns);
      console.log('✅ Bad effect ran again, good effect didn\'t!\n');
      
      runUseCase2();
    }, 0);
  }, 0);
  
  // USE CASE 2: Preventing infinite loops
  function runUseCase2() {
    console.log('USE CASE 2: Preventing Infinite Loops');
    console.log('--------------------------------------');
    
    // Problem: If an effect both reads and writes the same signal,
    // you get an infinite loop (read triggers effect, effect writes, which triggers...)
    
    const counter = signal(0);
    const trigger = signal(0);
    
    // ❌ This would cause infinite loop (DON'T RUN THIS!)
    // effect(() => {
    //   const val = counter();      // Read creates dependency
    //   counter.set(val + 1);       // Write triggers effect again - INFINITE!
    // });

    // ✅ SOLUTION: Read the value untracked
    // This effect runs when 'trigger' changes, but doesn't create dependency on counter
    let loopPreventionRuns = 0;
    effect(() => {
      trigger(); // Create dependency on trigger
      loopPreventionRuns++;
      const currentValue = untracked(() => counter()); // Read counter without dependency
      counter.set(currentValue + 1); // Safe! Won't trigger this effect
      console.log(`  [Loop Prevention Effect] Run #${loopPreventionRuns}, counter:`, counter());
    }, { injector });
    
    setTimeout(() => {
      console.log('\nAfter effect creation, runs:', loopPreventionRuns);
      
      console.log('\n--- Triggering effect by updating trigger signal ---');
      trigger.set(1);
      
      setTimeout(() => {
        console.log('After trigger update, runs:', loopPreventionRuns);
        console.log('✅ Effect ran once more, no infinite loop!');
        console.log('   Counter was incremented safely using untracked.\n');
        
        runUseCase3();
      }, 0);
    }, 0);
  }
  
  // USE CASE 3: Conditional dependencies
  function runUseCase3() {
    console.log('USE CASE 3: Conditional Dependencies');
    console.log('-------------------------------------');
    
    // Sometimes you want a signal to be a dependency only in certain conditions
    
    const debugMode = signal(false);
    const dataSignal = signal('important data');
    
    let computedCalcs = 0;
    const processedData = computed(() => {
      computedCalcs++;
      // Always depends on dataSignal
      const data = dataSignal();
      
      // Only depends on debugMode if we're actually going to use it
      if (untracked(() => debugMode())) {
        // If debugMode is true, we read it tracked
        const debug = debugMode();
        console.log(`  [Computed] Calc #${computedCalcs} - Debug mode:`, debug, 'Data:', data);
      } else {
        console.log(`  [Computed] Calc #${computedCalcs} - Data:`, data);
      }
      
      return data;
    });
    
    // Trigger computation with effect
    effect(() => {
      processedData();
    }, { injector });
    
    setTimeout(() => {
      console.log('\nInitial calculation count:', computedCalcs);
      
      console.log('\n--- Changing debugMode (currently false and untracked) ---');
      debugMode.set(true);
      
      setTimeout(() => {
        console.log('After debugMode change, calc count:', computedCalcs);
        console.log('✅ Computed did NOT recalculate (debugMode was untracked)');
        
        console.log('\n--- Changing dataSignal ---');
        dataSignal.set('updated data');
        
        setTimeout(() => {
          console.log('After dataSignal change, calc count:', computedCalcs);
          console.log('✅ Computed DID recalculate (dataSignal is tracked)\n');
          
          console.log('Key lesson: untracked() gives you fine control over reactivity!');
          console.log('Use it for: config, loop prevention, conditional dependencies\n');
        }, 0);
      }, 0);
    }, 0);
  }
}

// ============================================================================
// CONCEPT 4: EFFECT SCHEDULING & AUTOMATIC BATCHING
// ============================================================================
// One of the most powerful (and hidden) features of signals: automatic batching
//
// What is batching?
// - When you update multiple signals in the same synchronous block of code,
//   effects that depend on them only run ONCE (not once per update)
// - Angular collects all the updates and processes them together
// - This prevents "intermediate" states and improves performance dramatically
//
// Why does this matter?
// - No wasted renders/calculations
// - Consistent state (never see firstName updated but lastName not yet)
// - You don't have to think about it - it just works!
//
// Comparison to other systems:
// - React: You need to wrap updates in setState() or use batching APIs
// - RxJS: You need operators like debounceTime() or manual batching
// - Signals: Batching is automatic and always on!
//
// For beginners: This is why signals feel "fast" - they're smart about
// when to actually do work. Multiple changes = one effect execution.
// ============================================================================

/**
 * Demonstrates automatic effect batching
 * Watch how many times the effect runs vs how many updates we make
 */
export function demonstrateEffectBatching(injector: Injector) {
  console.log('\n=== Effect Batching Demo ===\n');
  
  const firstName = signal('John');
  const lastName = signal('Doe');
  const age = signal(30);
  
  let effectRuns = 0;
  let effectExecutions: string[] = [];

  // This effect depends on ALL THREE signals
  effect(() => {
    effectRuns++;
    const fullState = `${firstName()} ${lastName()}, age ${age()}`;
    effectExecutions.push(fullState);
    console.log(`  [Effect] Run #${effectRuns}: ${fullState}`);
  }, { injector });

  setTimeout(() => {
    console.log('After effect creation - runs:', effectRuns); // 1 (initial run)

    // Scenario 1: Multiple updates in the same synchronous block
    console.log('\n--- Updating all three signals synchronously ---');
    firstName.set('Jane');
    lastName.set('Smith');
    age.set(25);
    
    setTimeout(() => {
      console.log('After batch update - runs:', effectRuns); // 2 (not 4!)
      console.log('✅ KEY INSIGHT: Effect ran only ONCE for all three changes!');
      console.log('   This is automatic batching - no wasted work.\n');
      
      // Scenario 2: Updates at different times
      console.log('--- Updating signals separately (async) ---');
      console.log('Setting firstName to "Bob"...');
      firstName.set('Bob');
      
      setTimeout(() => {
        console.log('After firstName update - runs:', effectRuns); // 3
        console.log('Setting lastName to "Johnson" in next tick...');
        lastName.set('Johnson'); // In a different turn
        
        setTimeout(() => {
          console.log('After lastName update - runs:', effectRuns); // 4
          console.log('✅ Two separate update cycles = two effect runs\n');
          console.log('All executions:', effectExecutions);
          console.log('\nKey lesson: Synchronous updates batch automatically!');
          console.log('This is why signals are so performant - less wasted work.\n');
        }, 0);
      }, 0);
    }, 0);
  }, 0);
}

// ============================================================================
// CONCEPT 5: EFFECT CLEANUP - PREVENTING MEMORY LEAKS
// ============================================================================
// Critical concept: Effects can create resources that need cleanup
//
// What needs cleanup?
// - Timers (setTimeout, setInterval)
// - Subscriptions (RxJS observables, event emitters)
// - Event listeners (addEventListener)
// - Network connections (WebSocket, SSE)
// - Any resource you "opened" that needs to be "closed"
//
// How cleanup works:
// - Effects receive an onCleanup() callback as their first parameter
// - Call onCleanup() and pass it a function to run on cleanup
// - Cleanup runs: before the effect re-executes, and when component destroys
//
// Why this matters:
// - Without cleanup: memory leaks, zombie listeners, orphaned subscriptions
// - With cleanup: resources are properly freed, no leaks!
//
// For beginners: Think of onCleanup like a "finally" block or a destructor.
// It's where you undo what you did in the effect.
// ============================================================================

/**
 * Demonstrates effect cleanup patterns
 * These are CRITICAL for building production-ready applications
 */
export function demonstrateEffectCleanupPatterns(injector: Injector) {
  console.log('\n=== Effect Cleanup Patterns Demo ===\n');
  
  // PATTERN 1: Cleanup async operations
  console.log('PATTERN 1: Async Operation Cleanup');
  console.log('-----------------------------------');
  
  const isLoggedIn = signal(false);
  const userData = signal<any>(null);

  effect((onCleanup) => {
    if (isLoggedIn()) {
      let cancelled = false;
      
      // Simulate async data fetch
      console.log('  Starting data fetch...');
      const timeoutId = setTimeout(() => {
        if (!cancelled) {
          userData.set({ name: 'User', id: 123 });
          console.log('  ✅ Data loaded');
        } else {
          console.log('  ⚠️ Fetch was cancelled (cleanup ran)');
        }
      }, 100);

      // Cleanup: cancel the fetch if effect re-runs or component destroys
      onCleanup(() => {
        cancelled = true;
        clearTimeout(timeoutId);
        userData.set(null); // Clear data on logout
        console.log('  [Cleanup] Cancelling fetch and clearing data');
      });
    }
  }, { injector });

  // PATTERN 2: Timer cleanup
  console.log('\nPATTERN 2: Timer Cleanup');
  console.log('------------------------');
  
  const timerActive = signal(false);
  let tickCount = 0;
  
  effect((onCleanup) => {
    if (timerActive()) {
      tickCount = 0;
      console.log('  Starting timer...');
      const intervalId = setInterval(() => {
        tickCount++;
        console.log(`  ⏱️ Timer tick #${tickCount}`);
      }, 500);
      
      // CRITICAL: Clear the interval!
      onCleanup(() => {
        clearInterval(intervalId);
        console.log('  [Cleanup] Timer stopped');
      });
    }
  }, { injector });
  
  // PATTERN 3: Event listener cleanup
  console.log('\nPATTERN 3: Event Listener Cleanup');
  console.log('----------------------------------');
  
  const trackClicks = signal(false);
  
  effect((onCleanup) => {
    if (trackClicks()) {
      const handleClick = () => console.log('  👆 Click detected!');
      console.log('  Adding click listener...');
      document.addEventListener('click', handleClick);
      
      onCleanup(() => {
        document.removeEventListener('click', handleClick);
        console.log('  [Cleanup] Click listener removed');
      });
    }
  }, { injector });
  
  // Demonstrate cleanup in action
  setTimeout(() => {
    console.log('\n--- Activating timer ---');
    timerActive.set(true);
    
    setTimeout(() => {
      console.log('\n--- Deactivating timer (triggers cleanup) ---');
      timerActive.set(false);
      
      setTimeout(() => {
        console.log('\nKey lesson: ALWAYS clean up resources in effects!');
        console.log('Rule of thumb: If you create it, clean it up.');
        console.log('Common cleanups: timers, subscriptions, event listeners, connections\n');
      }, 100);
    }, 1500);
  }, 0);
}

// ============================================================================
// CONCEPT 6: DERIVATION CHAINS & LAZY COMPUTATION
// ============================================================================
// A powerful feature: Computed signals are LAZY
//
// What does lazy mean?
// - A computed signal doesn't calculate its value until someone reads it
// - If no one reads it, it never calculates (zero performance cost!)
// - Once calculated, the result is cached until dependencies change
//
// Why is this powerful?
// - You can create complex derivation chains without performance penalty
// - Only the computeds that are actually used will calculate
// - Automatic optimization without manual effort
//
// Example scenario:
// - You have 10 computed signals deriving from a source
// - Your component only displays 3 of them
// - Only those 3 calculate! The other 7 never run.
//
// For beginners: Computed signals are like recipes in a cookbook.
// The recipe exists (defined), but you don't actually cook (calculate)
// until someone wants to eat (read). And once cooked, it stays fresh
// (cached) until ingredients change.
// ============================================================================

/**
 * Demonstrates lazy computation and derivation chains
 * Watch console to see WHEN calculations happen
 */
export function demonstrateDerivationChains() {
  console.log('=== Derivation Chains & Laziness Demo ===');
  
  // Create a chain of computeds: each depends on the previous
  const base = signal(1);
  
  let step1Calcs = 0;
  const step1 = computed(() => {
    step1Calcs++;
    console.log('Step 1 calculating');
    return base() * 2;
  });
  
  let step2Calcs = 0;
  const step2 = computed(() => {
    step2Calcs++;
    console.log('Step 2 calculating');
    return step1() * 2;
  });
  
  let step3Calcs = 0;
  const step3 = computed(() => {
    step3Calcs++;
    console.log('Step 3 calculating');
    return step2() * 2;
  });
  
  let step4Calcs = 0;
  const step4 = computed(() => {
    step4Calcs++;
    console.log('Step 4 calculating');
    return step3() * 2;
  });
  
  let step5Calcs = 0;
  const step5 = computed(() => {
    step5Calcs++;
    console.log('Step 5 calculating');
    return step4() * 2;
  });

  // At this point, ALL signals are defined, but NONE have calculated yet!
  console.log('Signals created. Calculation counts:', {
    step1: step1Calcs, step2: step2Calcs, step3: step3Calcs, 
    step4: step4Calcs, step5: step5Calcs
  });
  // All zeros! Nothing calculated yet - they're lazy.

  // NOW we read step5 - watch what happens
  console.log('--- Reading step5() for first time ---');
  const result = step5(); // This triggers the whole chain to calculate
  console.log('Final value:', result);
  console.log('After first read:', {
    step1: step1Calcs, step2: step2Calcs, step3: step3Calcs,
    step4: step4Calcs, step5: step5Calcs
  });
  // All = 1. The chain calculated top to bottom.

  // Read again - watch what happens (or doesn't)
  console.log('--- Reading step5() again ---');
  const result2 = step5();
  console.log('After second read:', {
    step1: step1Calcs, step2: step2Calcs, step3: step3Calcs,
    step4: step4Calcs, step5: step5Calcs
  });
  // Still all = 1! Cached, no recalculation.

  // Update base - now they're "dirty" but don't calculate yet
  console.log('--- Updating base signal ---');
  base.set(2);
  console.log('After update (before read):', {
    step1: step1Calcs, step2: step2Calcs, step3: step3Calcs,
    step4: step4Calcs, step5: step5Calcs
  });
  // Still all = 1. They're marked dirty but haven't recalculated.

  // Read again - now they recalculate
  console.log('--- Reading step5() after update ---');
  const result3 = step5();
  console.log('After read:', {
    step1: step1Calcs, step2: step2Calcs, step3: step3Calcs,
    step4: step4Calcs, step5: step5Calcs
  });
  // All = 2. They recalculated because dependencies changed.
  
  console.log('Key lesson: Computeds are lazy (only calculate when read)');
  console.log('and memoized (cache results until dependencies change)');
}

// ============================================================================
// CONCEPT 7: SIGNAL ARRAYS AND IMMUTABILITY REQUIREMENT
// ============================================================================
// THE MOST COMMON BUG with signals: array/object mutation
//
// The problem:
// - Arrays and objects are reference types
// - Mutating them doesn't change the reference
// - Signals check references, not contents
// - Result: Mutations don't trigger updates!
//
// Examples of mutations that DON'T work:
// - arr.push(item) - adds to array in-place
// - arr[0] = newVal - modifies array in-place
// - obj.prop = val - modifies object in-place
// - arr.sort() - sorts in-place
//
// The solution: ALWAYS create new references
// - Use spread: [...arr, item]
// - Use array methods that return new arrays: .map(), .filter(), .concat()
// - Use Object spread: {...obj, prop: val}
//
// Why Angular chose this:
// - Performance: Reference checks are fast (one comparison)
// - Deep equality checks are slow (must compare all properties)
// - Immutability encourages better code patterns
//
// For beginners: Think "copy and modify" not "modify in place."
// If you're coming from React, this is the same pattern!
// ============================================================================

/**
 * Demonstrates array immutability patterns and common mistakes
 * This is required reading - these bugs are VERY common!
 */
export function demonstrateSignalArrays(injector: Injector) {
  console.log('\n=== Signal Arrays & Immutability Demo ===\n');
  
  const items = signal<string[]>([]);
  
  let updateCount = 0;
  effect(() => {
    const currentItems = items();
    updateCount++;
    console.log(`  [Effect] #${updateCount}, items:`, currentItems);
  }, { injector });

  setTimeout(() => {
    console.log('Initial update count:', updateCount, '\n'); // 1

    // ❌ ANTI-PATTERN 1: Mutation doesn't trigger
    console.log('--- Trying mutation (WRONG) ---');
    items().push('item1'); // Mutates the array
    items.set(items());    // Sets same reference
    
    setTimeout(() => {
      console.log('After mutation, update count:', updateCount); // Still 1! Didn't trigger!
      console.log('❌ Items array has content:', items(), 'but effect didn\'t run!');
      console.log('   Reason: Same reference, even though content changed\n');
      
      // Reset for clean demo
      items.set([]);
      
      setTimeout(() => {
        runCorrectPatterns();
      }, 0);
    }, 0);
  }, 0);
  
  function runCorrectPatterns() {
    // ✅ CORRECT PATTERN 1: Create new array with spread
    console.log('--- Using spread operator (CORRECT) ---');
    items.set([...items(), 'item1']); // New array reference
    
    setTimeout(() => {
      console.log('After spread, update count:', updateCount);
      console.log('✅ Effect ran! New reference triggered update\n');

      // ✅ CORRECT PATTERN 2: Use update() method
      console.log('--- Using update() (CORRECT) ---');
      items.update(arr => [...arr, 'item2']); // New array reference
      
      setTimeout(() => {
        console.log('After update(), update count:', updateCount);
        console.log('✅ Effect ran!\n');

        // ✅ CORRECT PATTERN 3: Array methods that return new arrays
        console.log('--- Using .concat() (CORRECT) ---');
        items.set(items().concat('item3')); // concat returns new array
        
        setTimeout(() => {
          console.log('After concat, update count:', updateCount);
          console.log('✅ Effect ran!\n');
          
          runRemovalPatterns();
        }, 0);
      }, 0);
    }, 0);
  }
  
  function runRemovalPatterns() {
    // ✅ CORRECT PATTERN 4: For removals, use filter
    console.log('--- Removing with filter (CORRECT) ---');
    console.log('Removing "item1"...');
    items.update(arr => arr.filter(i => i !== 'item1'));
    
    setTimeout(() => {
      console.log('After filter, update count:', updateCount);
      console.log('✅ Effect ran!\n');

      // ✅ CORRECT PATTERN 5: For modifications, map
      console.log('--- Modifying with map (CORRECT) ---');
      console.log('Converting all items to uppercase...');
      items.update(arr => arr.map(s => s.toUpperCase()));
      
      setTimeout(() => {
        console.log('After map, update count:', updateCount);
        console.log('✅ Effect ran!\n');
        
        console.log('Final items:', items());
        console.log('\nKey lesson: ALWAYS create new arrays/objects, NEVER mutate!');
        console.log('Remember: spread [...arr], .map(), .filter(), .concat() are your friends\n');
      }, 0);
    }, 0);
  }
}

// ============================================================================
// CONCEPT 8: MEMORY MANAGEMENT & PREVENTING LEAKS
// ============================================================================
// Signals are lightweight, but you can still create memory leaks if careless
//
// Common memory leak scenarios:
// 1. Computed signals keep references to large data
// 2. Effects that don't clean up subscriptions
// 3. Circular dependencies (rare, but possible)
// 4. Storing large objects in signals unnecessarily
//
// How to prevent leaks:
// 1. Always use onCleanup in effects
// 2. Don't store unnecessary data in signals
// 3. Consider using WeakMap/WeakSet for caches
// 4. Dispose of signals when components destroy (Angular handles this)
//
// Angular's automatic cleanup:
// - When a component destroys, its effects are automatically cleaned up
// - But YOU must clean up resources created inside effects!
//
// For beginners: Think about the lifecycle. If you create something
// (subscription, timer, listener), you must destroy it. Don't rely on
// garbage collection alone.
// ============================================================================

/**
 * Demonstrates memory management patterns and common pitfalls
 * Understanding this prevents production bugs!
 */
export function demonstrateMemoryManagement(injector: Injector) {
  console.log('\n=== Memory Management Demo ===\n');
  
  console.log('ISSUE 1: Computed signals keep references');
  console.log('------------------------------------------');
  // ⚠️ ISSUE 1: Computed signals keep references
  // This prevents garbage collection of large data
  const largeData = signal(new Array(1000000).fill(0));
  
  const derived = computed(() => largeData().length);
  // Problem: As long as 'derived' exists, largeData can't be garbage collected!
  // Even if we never use largeData again, it stays in memory.
  
  console.log('  Derived keeps reference to largeData (1M elements)');
  console.log('  ✅ Solution: Only create computed signals you actually need\n');

  console.log('ISSUE 2: Effects without cleanup leak resources');
  console.log('------------------------------------------------');
  
  // Mock subscription object
  interface Subscription {
    unsubscribe: () => void;
    isUnsubscribed: boolean;
  }
  
  let subscriptionId = 0;
  const mockSubscribe = (value: any): Subscription => {
    const id = ++subscriptionId;
    console.log(`  📡 Subscription #${id} created`);
    return {
      isUnsubscribed: false,
      unsubscribe() {
        if (!this.isUnsubscribed) {
          this.isUnsubscribed = true;
          console.log(`  ✅ Subscription #${id} cleaned up`);
        }
      }
    };
  };
  
  // BAD: Creating subscriptions without cleanup
  const trigger1 = signal(0);
  let leakedSubs: Subscription[] = [];
  
  effect(() => {
    trigger1();
    // Each time effect runs, we add a subscription but never remove old ones!
    const sub = mockSubscribe('data');
    leakedSubs.push(sub);
    console.log(`  ❌ Leaked subscriptions: ${leakedSubs.length}`);
  }, { injector });
  
  setTimeout(() => {
    console.log('\n--- Triggering bad effect again ---');
    trigger1.set(1);
    
    setTimeout(() => {
      console.log('  Problem: Old subscription was never cleaned up!\n');
      
      // ✅ GOOD: Use onCleanup
      console.log('SOLUTION: Always use onCleanup');
      console.log('-------------------------------');
      
      const trigger2 = signal(0);
      
      effect((onCleanup) => {
        trigger2();
        const sub = mockSubscribe('data');
        
        // Cleanup runs before next execution and on destroy
        onCleanup(() => {
          sub.unsubscribe();
        });
      }, { injector });
      
      setTimeout(() => {
        console.log('\n--- Triggering good effect again ---');
        trigger2.set(1);
        
        setTimeout(() => {
          console.log('  ✅ Old subscription was cleaned up before new one!\n');
          
          demonstrateObjectStorage();
        }, 0);
      }, 0);
    }, 0);
  }, 0);
  
  function demonstrateObjectStorage() {
    console.log('ISSUE 3: Storing entire objects when you only need part');
    console.log('--------------------------------------------------------');
    
    interface User {
      id: number;
      name: string;
      avatar: string; // Large data URL
      history: any[]; // Huge array
    }
    
    const user = signal<User | null>({
      id: 1,
      name: 'John',
      avatar: 'data:image/png;base64,...(imagine 1MB here)',
      history: new Array(10000).fill({})
    });
    
    // BAD: Derived signal keeps reference to entire user object
    const userName = computed(() => user()?.name);
    console.log('  ❌ userName computed keeps reference to entire user object');
    console.log('     (including large avatar and history array)\n');
    
    // BETTER: Extract only what you need
    const userNameOnly = signal<string | null>(null);
    effect(() => {
      const u = user();
      userNameOnly.set(u?.name || null);
      // Now user can be garbage collected if we stop using it
    }, { injector });
    
    setTimeout(() => {
      console.log('  ✅ Better: Extract just the name into separate signal');
      console.log('     Now user object can be garbage collected\n');
      
      printSummary();
    }, 0);
  }
  
  function printSummary() {
    console.log('Key lessons:');
    console.log('1. Always clean up resources in effects (timers, subscriptions, listeners)');
    console.log('2. Don\'t store more data than you need in signals');
    console.log('3. Be aware of what computed signals keep references to');
    console.log('4. Angular cleans up effects, but YOU clean up what effects create\n');
  }
}

// ============================================================================
// CONCEPT 9: SIGNALS VS ZONE.JS CHANGE DETECTION
// ============================================================================
// Understanding how signals fit into Angular's change detection
//
// The old way (Zone.js):
// - Zone.js patches async APIs (setTimeout, promises, events)
// - When async code runs, Zone triggers global change detection
// - Angular checks ENTIRE component tree for changes
// - Slow for large apps (checking everything is expensive)
//
// The new way (Signals):
// - Signals know exactly what depends on them
// - Only affected components are checked (targeted detection)
// - Much faster - no need to check everything
// - Works WITH Zone.js now, but enables zoneless future
//
// The future (Zoneless Angular):
// - Remove Zone.js entirely
// - Signals provide all reactivity
// - Even better performance
// - Simpler mental model
//
// For beginners: Signals are Angular's path to better performance.
// They make change detection smarter and more efficient.
// ============================================================================

/**
 * Explains how signals integrate with Angular's change detection
 * This is conceptual - run it to see the explanation
 */
export function understandingSignalsAndZones() {
  console.log('=== Signals vs Zone.js Change Detection ===');
  
  console.log('\nThe Old Way (Zone.js):');
  console.log('1. User clicks button');
  console.log('2. Zone.js detects the event');
  console.log('3. Angular checks ENTIRE component tree');
  console.log('4. Slow for large apps');
  
  console.log('\nThe New Way (Signals + Zone.js):');
  console.log('1. User updates a signal');
  console.log('2. Signal knows which components use it');
  console.log('3. Angular checks ONLY those components');
  console.log('4. Much faster - targeted updates');
  
  console.log('\nThe Future (Zoneless):');
  console.log('1. Remove Zone.js entirely');
  console.log('2. Signals provide all reactivity');
  console.log('3. No more "magic" change detection');
  console.log('4. Explicit, predictable, fast');
  
  console.log('\nKey insights:');
  console.log('- Signals create a dependency graph');
  console.log('- Angular uses the graph for targeted detection');
  console.log('- You get better performance automatically');
  console.log('- Learning signals now prepares you for zoneless Angular');
  
  console.log('\nPractical benefit:');
  console.log('In a 1000-component app:');
  console.log('- Zone.js: Check all 1000 components');
  console.log('- Signals: Check only the 5 that actually changed');
  console.log('Result: Massive performance improvement!');
}

// ============================================================================
// CONCEPT 10: ADVANCED PATTERNS - SIGNAL MIDDLEWARE
// ============================================================================
// Building extensible patterns on top of signals
//
// What is middleware?
// - Functions that intercept and modify signal updates
// - Run between when you call .set() and when the value actually updates
// - Can transform, validate, log, or reject updates
//
// Use cases:
// - Logging all signal changes (debugging)
// - Validation (reject invalid values)
// - Transformation (normalize data before storing)
// - Side effects (trigger analytics on changes)
// - Undo/redo (capture all changes)
//
// Pattern: Wrap the signal with a proxy or custom interface
//
// For beginners: This is an advanced pattern. You probably don't need it
// for most apps, but it's powerful for building frameworks or complex systems.
// ============================================================================

/**
 * Creates a signal with middleware functions that process updates
 * This is an example of building abstractions on top of signals
 * 
 * @param initialValue - Starting value
 * @param middleware - Array of functions to process updates
 * @returns WritableSignal with middleware applied
 */
export function createSignalWithMiddleware<T>(
  initialValue: T,
  middleware: Array<(value: T, prev: T) => T>
): WritableSignal<T> {
  // Create the underlying signal
  const innerSignal = signal(initialValue);

  // Create a wrapper function that preserves callability
  const wrapper = (() => innerSignal()) as WritableSignal<T>;
  
  // Copy over the signal properties
  wrapper.set = (value: T) => {
    let processedValue = value;
    const prev = innerSignal();
    
    // Run each middleware function in order
    for (const fn of middleware) {
      processedValue = fn(processedValue, prev);
    }
    
    // Set the processed value
    innerSignal.set(processedValue);
  };
  
  wrapper.update = (updateFn: (value: T) => T) => {
    wrapper.set(updateFn(innerSignal()));
  };
  
  // Copy the Symbol properties for signal identity
  Object.setPrototypeOf(wrapper, Object.getPrototypeOf(innerSignal));
  
  return wrapper;
}

/**
 * Middleware: Logs all signal updates
 * Useful for debugging
 */
export function loggingMiddleware<T>(value: T, prev: T): T {
  console.log('Signal update:', { 
    previous: prev, 
    new: value,
    timestamp: new Date().toISOString()
  });
  return value;
}

/**
 * Middleware factory: Creates a validation middleware
 * Rejects updates that don't pass validation
 * 
 * @param validator - Function that returns true if value is valid
 * @returns Middleware function
 */
export function validationMiddleware<T>(
  validator: (value: T) => boolean
): (value: T, prev: T) => T {
  return (value, prev) => {
    if (validator(value)) {
      return value; // Valid - allow update
    }
    console.warn('Validation failed, keeping previous value:', prev);
    return prev; // Invalid - keep old value
  };
}

/**
 * Demonstrates middleware in action
 * Shows how to build extensible signal patterns
 */
export function demonstrateMiddleware() {
  console.log('=== Signal Middleware Demo ===');
  
  // Create a counter with logging and validation
  const count = createSignalWithMiddleware(0, [
    loggingMiddleware,
    validationMiddleware(n => n >= 0) // Only allow non-negative numbers
  ]);

  console.log('--- Setting to 5 (valid) ---');
  count.set(5);  // Logs and sets to 5
  console.log('Current value:', count()); // 5

  console.log('--- Setting to -1 (invalid) ---');
  count.set(-1); // Logs but keeps 5 (validation fails)
  console.log('Current value:', count()); // Still 5
  
  console.log('--- Setting to 10 (valid) ---');
  count.set(10); // Logs and sets to 10
  console.log('Current value:', count()); // 10
  
  console.log('Key lesson: Middleware lets you build powerful abstractions!');
  console.log('You can create reusable logic for logging, validation, etc.');
}

// ============================================================================
// KEY TAKEAWAYS - ESSENTIAL CONCEPTS TO REMEMBER
// ============================================================================
// After reading this file, these are the most important things to remember:
//
// 1. **Equality is Reference-Based**
//    - Default: Object.is() checks references, not contents
//    - For objects/arrays: new object = update, even if content is same
//    - Solution: Custom equality functions or reuse references
//
// 2. **Diamond Problem is Solved**
//    - Computed signals are smart about dependencies
//    - Multiple paths to same computed = one calculation
//    - You don't need to worry about redundant work
//
// 3. **Untracked is Powerful**
//    - Read signals without creating dependencies
//    - Use for: config, performance, loop prevention
//    - untracked(() => signal()) breaks reactive chain
//
// 4. **Effects are Batched**
//    - Multiple synchronous updates = one effect execution
//    - Automatic - you don't need to do anything
//    - This is why signals are fast
//
// 5. **Cleanup is Crucial**
//    - Always use onCleanup for resources (timers, subscriptions)
//    - Runs before re-execution and on destroy
//    - Prevents memory leaks
//
// 6. **Computed are Lazy**
//    - Don't calculate until someone reads them
//    - Then cache result until dependencies change
//    - Free performance optimization
//
// 7. **Immutability Required**
//    - For arrays/objects, ALWAYS create new references
//    - Mutations don't trigger updates
//    - Use spread, .map(), .filter(), not .push() or mutations
//
// 8. **Memory Management Matters**
//    - Computed signals keep references alive
//    - Effects need cleanup
//    - Don't store more data than needed
//
// 9. **Zone.js Integration**
//    - Signals work with Zone.js for targeted detection
//    - Future: zoneless Angular with signals-only reactivity
//    - Better performance than full tree traversal
//
// 10. **Extensibility**
//     - Build patterns on top of signals (middleware, etc.)
//     - Signals are primitives - compose them into abstractions
//     - Create your own helper functions and patterns
//
// PERFORMANCE TIPS:
// ✅ Use computed() for derived state (memoized automatically)
// ✅ Use untracked() to break unnecessary dependencies
// ✅ Trust automatic batching (multiple updates = one effect run)
// ✅ Use custom equality for complex objects
// ✅ Keep derivation chains reasonable (they're lazy, so usually fine)
// ✅ Always cleanup effects (prevent leaks)
// ✅ Use immutable patterns for arrays/objects
//
// DEBUGGING TIPS:
// 🔍 Add console.log inside computed/effect to see when they run
// 🔍 Count execution times (see examples above)
// 🔍 Use createDebugSignal (below) for automatic logging
// 🔍 Check for reference equality issues (common bug)
// 🔍 Verify cleanup is running (log in onCleanup)
//
// For beginners: Don't try to memorize everything. Come back to this
// file when you encounter issues. The patterns will make sense with practice!
// ============================================================================

// ============================================================================
// BONUS: SIGNAL DEBUGGING TOOLS
// ============================================================================
// Building tools to help debug signal behavior
//
// Why you need this:
// - Signals are reactive - sometimes it's hard to see when/why they update
// - Debugging tools make the invisible visible
// - Especially useful when learning or diagnosing issues
//
// What this provides:
// - Automatic logging of all signal operations (read, set, update)
// - Helps you understand the reactive flow
// - Can be enabled/disabled per signal
//
// How to use:
// - Replace signal(...) with createDebugSignal(name, ...)
// - Watch console for all operations
// - Remove in production (or gate with environment flag)
//
// For beginners: This is a "peek under the hood" tool. Use it when
// you're confused about why a signal is or isn't updating. The logs
// will show you exactly what's happening.
// ============================================================================

/**
 * Creates a signal with automatic logging for debugging
 * Every read, set, and update operation is logged to console
 * 
 * @param name - Friendly name for logging (e.g., "user-count")
 * @param initialValue - Starting value
 * @returns WritableSignal that logs all operations
 * 
 * Example:
 * ```typescript
 * const count = createDebugSignal('counter', 0);
 * count.set(5);        // Logs: [counter] set: 5
 * console.log(count()); // Logs: [counter] read: 5
 * count.update(n => n + 1); // Logs: [counter] update called
 * ```
 */
export function createDebugSignal<T>(name: string, initialValue: T): WritableSignal<T> {
  const sig = signal(initialValue);
  
  // Wrap the signal with a Proxy to intercept all operations
  return new Proxy(sig as any, {
    // Intercept function calls (reading the signal)
    apply(target, thisArg, args) {
      const value = target.apply(thisArg, args);
      console.log(`🔍 [${name}] read:`, value);
      return value;
    },
    
    // Intercept property access (set, update methods)
    get(target, prop) {
      if (prop === 'set') {
        return (value: T) => {
          console.log(`✏️ [${name}] set:`, value);
          return target.set(value);
        };
      }
      
      if (prop === 'update') {
        return (fn: (v: T) => T) => {
          console.log(`🔄 [${name}] update called`);
          const oldValue = target();
          const result = target.update(fn);
          console.log(`🔄 [${name}] update: ${oldValue} → ${target()}`);
          return result;
        };
      }
      
      // For other properties, return as-is
      return (target as any)[prop];
    }
  }) as WritableSignal<T>;
}

/**
 * Example usage of debug signals
 * Run this to see how the logging works
 */
export function demonstrateDebugSignal() {
  console.log('=== Debug Signal Demo ===');
  
  // Create a debug signal
  const counter = createDebugSignal('counter', 0);
  
  console.log('--- Reading signal ---');
  counter(); // Logs the read
  
  console.log('--- Setting value ---');
  counter.set(5); // Logs the set
  
  console.log('--- Updating value ---');
  counter.update(n => n + 1); // Logs the update and before/after
  
  console.log('--- Using in computed ---');
  const doubled = computed(() => {
    console.log('Computing doubled');
    return counter() * 2; // Read is logged
  });
  
  console.log('Reading computed:', doubled()); // Triggers counter read
  
  console.log('\nKey lesson: Debug signals make reactive flow visible!');
  console.log('Use them when debugging why something updates or doesn\'t');
}

// ============================================================================
// FINAL THOUGHTS
// ============================================================================
// Congratulations on reading this far! You now understand signals at a deep level.
//
// Next steps:
// 1. Practice: Build something with signals
// 2. Experiment: Try the patterns in this file
// 3. Debug: Use these tools when things don't work as expected
// 4. Share: Teach others what you learned
//
// Remember: Signals are a fundamental shift in how Angular works.
// The concepts here apply to any reactive system (React hooks, Vue 3, Svelte, etc.)
// Understanding reactivity deeply makes you a better developer, regardless of framework.
//
// Happy coding! 🚀
// ============================================================================

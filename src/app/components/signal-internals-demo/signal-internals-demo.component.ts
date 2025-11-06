// ============================================================================
// SIGNAL INTERNALS DEMO COMPONENT
// ============================================================================
// This component demonstrates the advanced signal concepts from signal-internals.ts
// Each demo function is triggered by a button and logs to the console.
//
// Topics covered:
// 1. Signal equality and reference checking
// 2. The Diamond Problem
// 3. Untracked reads
// 4. Effect scheduling and batching
// 5. Effect cleanup patterns
// 6. Derivation chains
// 7. Array/object immutability
// 8. Memory management
// 9. Signals vs Zone.js
// 10. Signal middleware and debugging
// ============================================================================

import { Component, signal, Injector, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  demonstrateEqualityPitfalls,
  demonstrateDiamondProblem,
  demonstrateUntrackedUseCases,
  demonstrateEffectBatching,
  demonstrateEffectCleanupPatterns,
  demonstrateDerivationChains,
  demonstrateSignalArrays,
  demonstrateMemoryManagement,
  understandingSignalsAndZones,
  demonstrateMiddleware,
  demonstrateDebugSignal
} from '../../utils/signal-internals';

@Component({
  selector: 'app-signal-internals-demo',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="internals-demo">
      <h1>🔬 Signal Internals Deep Dive</h1>
      <p class="intro">
        Explore the "under the hood" behavior of Angular Signals. Click any demo button and check
        your browser console for detailed explanations!
      </p>

      <!-- Status indicator -->
      <div class="status-bar" [class.active]="isDemoRunning()">
        <span *ngIf="!isDemoRunning()">Ready - Select a demo to run</span>
        <span *ngIf="isDemoRunning()">
          ✓ Running: {{ currentDemo() }} - Check console for output
        </span>
      </div>

      <!-- Demo sections -->
      <div class="demo-grid">

        <!-- Info Card -->
        <div class="demo-card info-card">
          <div class="demo-header">
            <h3>ℹ️ How to Use</h3>
          </div>
          <div class="instructions">
            <ol>
              <li>Click any demo button above</li>
              <li>Open your browser's console (F12)</li>
              <li>Read the detailed output and explanations</li>
              <li>Try running multiple demos to compare concepts</li>
              <li>Check the code in <code>signal-internals.ts</code> for implementation details</li>
            </ol>
            <p class="tip">
              💡 <strong>Tip:</strong> These are advanced concepts. If you're new to signals, start
              with the basic patterns first!
            </p>
          </div>
        </div>
        
        <!-- Section 1: Equality & References -->
        <div class="demo-card">
          <div class="demo-header">
            <h3>📋 Equality & References</h3>
            <span class="badge">Concept 1</span>
          </div>
          <p class="description">
            Learn how signals use Object.is() for equality checking and why reference equality
            matters for objects and arrays.
          </p>
          <button
            class="demo-button"
            (click)="runDemo('Equality Pitfalls', demonstrateEqualityPitfalls)"
          >
            Run Equality Demo
          </button>
          <div class="key-points">
            <strong>Key Points:</strong>
            <ul>
              <li>Object.is() is used for equality</li>
              <li>New object reference = new value</li>
              <li>Custom equality functions available</li>
            </ul>
          </div>
        </div>

        <!-- Section 2: Diamond Problem -->
        <div class="demo-card">
          <div class="demo-header">
            <h3>💎 Diamond Problem</h3>
            <span class="badge">Concept 2</span>
          </div>
          <p class="description">
            See how Angular prevents redundant calculations when multiple computed signals share a
            common dependency.
          </p>
          <button
            class="demo-button"
            (click)="runDemo('Diamond Problem', demonstrateDiamondProblem)"
          >
            Run Diamond Demo
          </button>
          <div class="key-points">
            <strong>Key Points:</strong>
            <ul>
              <li>Glitch-free execution guaranteed</li>
              <li>No redundant calculations</li>
              <li>Smart dependency tracking</li>
            </ul>
          </div>
        </div>

        <!-- Section 3: Untracked Reads -->
        <div class="demo-card">
          <div class="demo-header">
            <h3>👻 Untracked Reads</h3>
            <span class="badge">Concept 3</span>
          </div>
          <p class="description">
            Use untracked() to read signals without creating reactive dependencies - great for
            performance and preventing loops.
          </p>
          <button
            class="demo-button"
            (click)="runDemo('Untracked Use Cases', demonstrateUntrackedUseCases)"
          >
            Run Untracked Demo
          </button>
          <div class="key-points">
            <strong>Key Points:</strong>
            <ul>
              <li>Read without dependency</li>
              <li>Prevent infinite loops</li>
              <li>Performance optimization</li>
            </ul>
          </div>
        </div>

        <!-- Section 4: Effect Batching -->
        <div class="demo-card">
          <div class="demo-header">
            <h3>📦 Effect Batching</h3>
            <span class="badge">Concept 4</span>
          </div>
          <p class="description">
            Discover how Angular automatically batches multiple signal updates to run effects only
            once.
          </p>
          <button
            class="demo-button"
            (click)="runDemo('Effect Batching', demonstrateEffectBatching)"
          >
            Run Batching Demo
          </button>
          <div class="key-points">
            <strong>Key Points:</strong>
            <ul>
              <li>Automatic batching</li>
              <li>Multiple updates = one effect</li>
              <li>No intermediate states</li>
            </ul>
          </div>
        </div>

        <!-- Section 5: Effect Cleanup -->
        <div class="demo-card">
          <div class="demo-header">
            <h3>🧹 Effect Cleanup</h3>
            <span class="badge">Concept 5</span>
          </div>
          <p class="description">
            Learn critical patterns for cleaning up resources in effects to prevent memory leaks.
          </p>
          <button
            class="demo-button"
            (click)="runDemo('Effect Cleanup', demonstrateEffectCleanupPatterns)"
          >
            Run Cleanup Demo
          </button>
          <div class="key-points">
            <strong>Key Points:</strong>
            <ul>
              <li>onCleanup callback</li>
              <li>Prevent memory leaks</li>
              <li>Resource management</li>
            </ul>
          </div>
        </div>

        <!-- Section 6: Derivation Chains -->
        <div class="demo-card">
          <div class="demo-header">
            <h3>⛓️ Derivation Chains</h3>
            <span class="badge">Concept 6</span>
          </div>
          <p class="description">
            Understand how computed signals are lazy and only calculate when actually needed.
          </p>
          <button
            class="demo-button"
            (click)="runDemo('Derivation Chains', demonstrateDerivationChains)"
          >
            Run Derivation Demo
          </button>
          <div class="key-points">
            <strong>Key Points:</strong>
            <ul>
              <li>Lazy evaluation</li>
              <li>Only calculate when read</li>
              <li>Efficient dependency graphs</li>
            </ul>
          </div>
        </div>

        <!-- Section 7: Array Management -->
        <div class="demo-card">
          <div class="demo-header">
            <h3>📊 Array/Object Immutability</h3>
            <span class="badge">Concept 7</span>
          </div>
          <p class="description">
            Master the patterns for working with arrays and objects in signals while maintaining
            immutability.
          </p>
          <button class="demo-button" (click)="runDemo('Signal Arrays', demonstrateSignalArrays)">
            Run Arrays Demo
          </button>
          <div class="key-points">
            <strong>Key Points:</strong>
            <ul>
              <li>Immutability required</li>
              <li>Spread operator patterns</li>
              <li>Performance considerations</li>
            </ul>
          </div>
        </div>

        <!-- Section 8: Memory Management -->
        <div class="demo-card">
          <div class="demo-header">
            <h3>💾 Memory Management</h3>
            <span class="badge">Concept 8</span>
          </div>
          <p class="description">
            Learn how to properly manage signal lifecycles and prevent memory leaks in your
            applications.
          </p>
          <button
            class="demo-button"
            (click)="runDemo('Memory Management', demonstrateMemoryManagement)"
          >
            Run Memory Demo
          </button>
          <div class="key-points">
            <strong>Key Points:</strong>
            <ul>
              <li>DestroyRef integration</li>
              <li>Automatic cleanup</li>
              <li>Effect lifecycle</li>
            </ul>
          </div>
        </div>

        <!-- Section 9: Signals vs Zones -->
        <div class="demo-card">
          <div class="demo-header">
            <h3>🎯 Signals vs Zone.js</h3>
            <span class="badge">Concept 9</span>
          </div>
          <p class="description">
            Understand the fundamental difference between signals and Zone.js change detection.
          </p>
          <button
            class="demo-button"
            (click)="runDemo('Signals & Zones', understandingSignalsAndZones)"
          >
            Run Zones Demo
          </button>
          <div class="key-points">
            <strong>Key Points:</strong>
            <ul>
              <li>Pull vs Push</li>
              <li>Precise updates</li>
              <li>Better performance</li>
            </ul>
          </div>
        </div>

        <!-- Section 10: Middleware -->
        <div class="demo-card">
          <div class="demo-header">
            <h3>🔧 Signal Middleware</h3>
            <span class="badge">Concept 10a</span>
          </div>
          <p class="description">
            Build custom middleware for signals to add logging, validation, and other cross-cutting
            concerns.
          </p>
          <button class="demo-button" (click)="runDemo('Signal Middleware', demonstrateMiddleware)">
            Run Middleware Demo
          </button>
          <div class="key-points">
            <strong>Key Points:</strong>
            <ul>
              <li>Intercept updates</li>
              <li>Add validation</li>
              <li>Enhanced debugging</li>
            </ul>
          </div>
        </div>

        <!-- Section 11: Debug Signals -->
        <div class="demo-card">
          <div class="demo-header">
            <h3>🐛 Debug Signals</h3>
            <span class="badge">Concept 10b</span>
          </div>
          <p class="description">
            Use specialized debug signals to trace updates and understand your application's
            reactive flow.
          </p>
          <button class="demo-button" (click)="runDemo('Debug Signals', demonstrateDebugSignal)">
            Run Debug Demo
          </button>
          <div class="key-points">
            <strong>Key Points:</strong>
            <ul>
              <li>Update history tracking</li>
              <li>Source information</li>
              <li>Debugging utilities</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Demo counter -->
      <div class="footer">
        <p>Demos run this session: {{ demoRunCount() }}</p>
        <button class="reset-button" (click)="resetCounter()">Reset Counter</button>
      </div>
    </div>
  `,
  styles: [
    `
      .internals-demo {
        max-width: 1400px;
        margin: 0 auto;
        padding: 2rem;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }

      h1 {
        font-size: 2.5rem;
        color: #2c3e50;
        margin-bottom: 0.5rem;
        text-align: center;
      }

      .intro {
        text-align: center;
        color: #666;
        font-size: 1.1rem;
        margin-bottom: 2rem;
        max-width: 800px;
        margin-left: auto;
        margin-right: auto;
      }

      .status-bar {
        background: #f8f9fa;
        border: 2px solid #dee2e6;
        border-radius: 8px;
        padding: 1rem;
        margin-bottom: 2rem;
        text-align: center;
        font-weight: 500;
        transition: all 0.3s ease;
      }

      .status-bar.active {
        background: #d4edda;
        border-color: #28a745;
        color: #155724;
      }

      .demo-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
        gap: 1.5rem;
        margin-bottom: 2rem;
      }

      .demo-card {
        background: white;
        border: 2px solid #e1e8ed;
        border-radius: 12px;
        padding: 1.5rem;
        transition: all 0.3s ease;
        display: flex;
        flex-direction: column;
      }

      .demo-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
        border-color: #007bff;
      }

      .info-card {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
      }

      .info-card h3 {
        color: white;
      }

      .demo-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
      }

      .demo-header h3 {
        margin: 0;
        font-size: 1.25rem;
        color: #2c3e50;
      }

      .badge {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 0.25rem 0.75rem;
        border-radius: 20px;
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
      }

      .description {
        color: #666;
        line-height: 1.6;
        margin-bottom: 1rem;
        flex-grow: 1;
        font-size: 0.95rem;
      }

      .demo-button {
        width: 100%;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        padding: 0.875rem 1.5rem;
        border-radius: 8px;
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        margin-bottom: 1rem;
      }

      .demo-button:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
      }

      .demo-button:active {
        transform: translateY(0);
      }

      .key-points {
        background: #f8f9fa;
        border-radius: 6px;
        padding: 1rem;
        font-size: 0.85rem;
      }

      .key-points strong {
        color: #2c3e50;
        display: block;
        margin-bottom: 0.5rem;
      }

      .key-points ul {
        margin: 0;
        padding-left: 1.25rem;
      }

      .key-points li {
        color: #666;
        margin-bottom: 0.25rem;
      }

      .instructions {
        line-height: 1.8;
      }

      .instructions ol {
        padding-left: 1.5rem;
      }

      .instructions li {
        margin-bottom: 0.5rem;
      }

      .instructions code {
        background: rgba(255, 255, 255, 0.2);
        padding: 0.2rem 0.4rem;
        border-radius: 4px;
        font-family: 'Courier New', monospace;
      }

      .tip {
        background: rgba(255, 255, 255, 0.2);
        border-radius: 6px;
        padding: 1rem;
        margin-top: 1rem;
      }

      .footer {
        text-align: center;
        padding: 2rem;
        background: #f8f9fa;
        border-radius: 8px;
        margin-top: 2rem;
      }

      .footer p {
        margin: 0 0 1rem 0;
        font-size: 1.1rem;
        color: #666;
      }

      .reset-button {
        background: #6c757d;
        color: white;
        border: none;
        padding: 0.5rem 1.5rem;
        border-radius: 6px;
        font-size: 0.9rem;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .reset-button:hover {
        background: #5a6268;
        transform: translateY(-2px);
      }

      @media (max-width: 768px) {
        .demo-grid {
          grid-template-columns: 1fr;
        }

        h1 {
          font-size: 2rem;
        }

        .internals-demo {
          padding: 1rem;
        }
      }
    `,
  ],
})
export class SignalInternalsDemoComponent {
  // Inject Injector to pass to demo functions that need it
  private injector = inject(Injector);

  // Track demo state
  isDemoRunning = signal(false);
  currentDemo = signal('');
  demoRunCount = signal(0);

  // Expose demo functions for template use (wrapping the ones that need injector)
  demonstrateEqualityPitfalls = () => demonstrateEqualityPitfalls(this.injector);
  demonstrateDiamondProblem = () => demonstrateDiamondProblem(this.injector);
  demonstrateUntrackedUseCases = () => demonstrateUntrackedUseCases(this.injector);
  demonstrateEffectBatching = () => demonstrateEffectBatching(this.injector);
  demonstrateEffectCleanupPatterns = () => demonstrateEffectCleanupPatterns(this.injector);
  demonstrateDerivationChains = demonstrateDerivationChains;
  demonstrateSignalArrays = () => demonstrateSignalArrays(this.injector);
  demonstrateMemoryManagement = () => demonstrateMemoryManagement(this.injector);
  understandingSignalsAndZones = understandingSignalsAndZones;
  demonstrateMiddleware = demonstrateMiddleware;
  demonstrateDebugSignal = demonstrateDebugSignal;

  /**
   * Run a demo function and update the UI state
   */
  runDemo(name: string, demoFn: () => void): void {
    console.clear();
    console.log('%c========================================', 'color: #667eea; font-weight: bold');
    console.log(`%c🔬 Running: ${name}`, 'color: #667eea; font-size: 16px; font-weight: bold');
    console.log('%c========================================', 'color: #667eea; font-weight: bold');
    console.log('');

    this.currentDemo.set(name);
    this.isDemoRunning.set(true);
    this.demoRunCount.update((count) => count + 1);

    // Run the demo
    try {
      demoFn();

      // Mark as complete after a short delay
      setTimeout(() => {
        console.log('');
        console.log('%c✓ Demo Complete!', 'color: #28a745; font-weight: bold; font-size: 14px');
        console.log('%cCheck the output above for detailed explanations.', 'color: #666');
        this.isDemoRunning.set(false);
      }, 100);
    } catch (error) {
      console.error('Demo error:', error);
      this.isDemoRunning.set(false);
    }
  }

  /**
   * Reset the demo counter
   */
  resetCounter(): void {
    this.demoRunCount.set(0);
    console.log('%c✓ Counter reset!', 'color: #28a745; font-weight: bold');
  }
}

// ============================================================================
// SIGNAL PATTERNS DEMO COMPONENT
// ============================================================================
// This component demonstrates 9 practical, real-world patterns using Angular Signals.
// Each pattern solves a common problem in web applications:
// 1. Form validation without reactive forms
// 2. Async data loading with loading/error states
// 3. Debounced search input
// 4. Text editor with undo/redo
// 5. Data persistence to localStorage
// 6. Tracking changes between values
// 7. Managing unique collections (tags)
// 8. Angular's built-in linkedSignal (writable + auto-computed)
// 9. Composing signals in a reactive pipeline
//
// For beginners: This shows how signals can replace more complex patterns
// (like RxJS observables, NgRx store, or Angular Forms) for many use cases.
// ============================================================================

import { Component, signal, computed, effect, Injector, inject, linkedSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  createFormField,
  emailValidator,
  requiredValidator,
  minLengthValidator,
  createResource,
  createDebouncedSignal,
  createHistorySignal,
  createPersistentStore,
  computedWithPrevious,
  createSignalSet,
  arrayEqual
} from '../../utils/signal-patterns';

/**
 * Task interface for the sortable list demo
 */
interface Task {
  id: number;
  name: string;
  priority: number;
}

/**
 * Demo component showcasing advanced signal patterns.
 * 
 * Each section demonstrates a self-contained pattern that you can copy
 * and adapt for your own applications. The patterns are independent
 * and can be used individually.
 */
@Component({
  selector: 'app-signal-patterns-demo',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="patterns-demo">
      <h1>Advanced Signal Patterns - Practical Examples</h1>

      <!-- PATTERN 1: Reactive Forms -->
      <section>
        <h2>1. Signal-Based Reactive Forms</h2>
        <div class="demo-box">
          <div class="form-group">
            <label>Email:</label>
            <input 
              type="text" 
              [value]="emailField.value()"
              (input)="emailField.value.set($any($event.target).value)"
              (blur)="emailField.touched.set(true)"
              [class.invalid]="emailField.touched() && !emailField.valid()" />
            
            @if (emailField.touched() && emailField.errors().length > 0) {
              <div class="errors">
                @for (error of emailField.errors(); track error) {
                  <span class="error">{{ error }}</span>
                }
              </div>
            }
            
            <div class="field-status">
              <span>Valid: {{ emailField.valid() ? '✓' : '✗' }}</span>
              <span>Touched: {{ emailField.touched() ? '✓' : '✗' }}</span>
              <span>Dirty: {{ emailField.dirty() ? '✓' : '✗' }}</span>
            </div>
          </div>

          <div class="form-group">
            <label>Password (min 8 chars):</label>
            <input 
              type="password" 
              [value]="passwordField.value()"
              (input)="passwordField.value.set($any($event.target).value)"
              (blur)="passwordField.touched.set(true)"
              [class.invalid]="passwordField.touched() && !passwordField.valid()" />
            
            @if (passwordField.touched() && passwordField.errors().length > 0) {
              <div class="errors">
                @for (error of passwordField.errors(); track error) {
                  <span class="error">{{ error }}</span>
                }
              </div>
            }
          </div>

          <p class="status">Form Valid: {{ formValid() ? '✓ Ready to submit' : '✗ Fix errors' }}</p>
        </div>
      </section>

      <!-- PATTERN 2: Resource/Async State -->
      <section>
        <h2>2. Resource Signal Pattern</h2>
        <div class="demo-box">
          <button (click)="userResource.refresh()">Load User Data</button>
          
          @if (userResource.loading()) {
            <p class="loading">Loading...</p>
          }
          
          @if (userResource.error()) {
            <p class="error">Error: {{ userResource.error()?.message }}</p>
          }
          
          @if (userResource.data()) {
            <div class="data-display">
              <pre>{{ userResource.data() | json }}</pre>
            </div>
          }
        </div>
      </section>

      <!-- PATTERN 3: Debounced Input -->
      <section>
        <h2>3. Debounced Signal (Search)</h2>
        <div class="demo-box">
          <label>Search (debounced 500ms):</label>
          <input 
            type="text" 
            [value]="searchDebounced.input()"
            (input)="searchDebounced.input.set($any($event.target).value)"
            placeholder="Type to search..." />
          
          <p>Input value (immediate): "{{ searchDebounced.input() }}"</p>
          <p>Debounced value (delayed): "{{ searchDebounced.output() }}"</p>
          <p class="hint">The debounced value only updates 500ms after you stop typing</p>
          
          <div class="search-results">
            <h4>Search Results:</h4>
            @for (result of searchResults(); track result) {
              <div class="result-item">{{ result }}</div>
            }
          </div>
        </div>
      </section>

      <!-- PATTERN 4: History/Undo-Redo -->
      <section>
        <h2>4. Signal History (Undo/Redo)</h2>
        <div class="demo-box">
          <div class="editor-controls">
            <button (click)="textHistory.undo()" [disabled]="!textHistory.canUndo()">
              ⬅ Undo
            </button>
            <button (click)="textHistory.redo()" [disabled]="!textHistory.canRedo()">
              Redo ➡
            </button>
            <span class="history-info">
              History: {{ textHistory.history().length }} states
            </span>
          </div>
          
          <textarea 
            [value]="textHistory.value()"
            (input)="textHistory.setValue($any($event.target).value)"
            rows="5"
            placeholder="Type something... (undo/redo enabled)"></textarea>
          
          <p>Current text: "{{ textHistory.value() }}"</p>
        </div>
      </section>

      <!-- PATTERN 5: Persistent Store -->
      <section>
        <h2>5. Persistent Store (localStorage)</h2>
        <div class="demo-box">
          <div class="counter-controls">
            <button (click)="incrementPersistent()">+</button>
            <span class="counter-value">{{ persistentStore.state().count }}</span>
            <button (click)="decrementPersistent()">-</button>
            <button (click)="persistentStore.reset()">Reset</button>
          </div>
          
          <p class="hint">
            Refresh the page - the count persists! (Stored in localStorage)
          </p>
          <p>Last updated: {{ persistentStore.state().lastUpdated | date:'medium' }}</p>
        </div>
      </section>

      <!-- PATTERN 6: Computed with Previous -->
      <section>
        <h2>6. Computed with Previous Value</h2>
        <div class="demo-box">
          <button (click)="incrementNumber()">
            Random Increment
          </button>
          <p>Current: {{ numberInput() }}</p>
          <p>Change: {{ deltaSignal() }}</p>
          <p>Trend: {{ trendSignal() }}</p>
        </div>
      </section>

      <!-- PATTERN 7: Signal Set -->
      <section>
        <h2>7. Signal Set (Collections)</h2>
        <div class="demo-box">
          <div class="tag-input">
            <input 
              type="text" 
              [(ngModel)]="newTag"
              (keyup.enter)="addTag()"
              placeholder="Add a tag..." />
            <button (click)="addTag()">Add Tag</button>
          </div>
          
          <div class="tags">
            @for (tag of tagSet.items(); track tag) {
              <span class="tag">
                {{ tag }}
                <button (click)="tagSet.remove(tag)">×</button>
              </span>
            }
          </div>
          
          <p>Total tags: {{ tagSet.size() }}</p>
          <button (click)="tagSet.clear()">Clear All</button>
        </div>
      </section>

      <!-- PATTERN 8: Linked Signals -->
      <section>
        <h2>8. Linked Signals (Built-in Angular v20+)</h2>
        <p>Writable signal with automatic computation that can be manually overridden</p>
        
        <!-- Example 1: Toggle with auto-sync -->
        <div class="demo-box">
          <h3>Example 1: Notifications with Manual Override</h3>
          <div class="linked-demo">
            <label>
              User Status:
              <select [value]="userStatus()" (change)="userStatus.set($any($event.target).value)">
                <option value="online">Online</option>
                <option value="away">Away</option>
                <option value="offline">Offline</option>
              </select>
            </label>

            <div class="notification-status">
              <strong>Notifications:</strong>
              @if (notificationsEnabled()) {
                <span class="enabled">✓ Enabled</span>
              } @else {
                <span class="disabled">✗ Disabled</span>
              }
              <button (click)="toggleNotifications()">
                {{ notificationsEnabled() ? 'Disable' : 'Enable' }} Manually
              </button>
            </div>

            <p class="hint">
              Notifications auto-enable when online, but you can manually override!
              Change status and watch it re-sync.
            </p>
          </div>
        </div>

        <!-- Example 2: Sortable List -->
        <div class="demo-box">
          <h3>Example 2: Auto-Sorted List with Manual Reorder</h3>
          <div class="sortable-demo">
            <div class="input-row">
              <input 
                type="text" 
                [(ngModel)]="newTaskName"
                placeholder="Task name..." />
              <input 
                type="number" 
                [(ngModel)]="newTaskPriority"
                placeholder="Priority (1-5)" 
                min="1" 
                max="5" />
              <button (click)="addTask()">Add Task</button>
              <button (click)="shuffleTasks()">Shuffle Source</button>
            </div>

            <div class="lists-container">
              <div class="list-column">
                <h4>Source Items (Unsorted)</h4>
                <div class="task-list">
                  @for (task of tasks(); track task.id) {
                    <div class="task-item">
                      <span class="priority">P{{ task.priority }}</span>
                      <span>{{ task.name }}</span>
                    </div>
                  }
                </div>
              </div>

              <div class="list-column">
                <h4>Sorted Items (Auto + Manual)</h4>
                <div class="task-list">
                  @for (task of sortedTasks(); track task.id; let idx = $index) {
                    <div class="task-item">
                      <span class="priority">P{{ task.priority }}</span>
                      <span>{{ task.name }}</span>
                      <div class="task-controls">
                        <button (click)="moveTaskUp(idx)" [disabled]="idx === 0">↑</button>
                        <button (click)="moveTaskDown(idx)" [disabled]="idx === sortedTasks().length - 1">↓</button>
                      </div>
                    </div>
                  }
                </div>
              </div>
            </div>

            <p class="hint">
              Add tasks - they auto-sort by priority. Use ↑↓ to manually reorder.
              Shuffle source - sorted list re-syncs automatically!
            </p>
          </div>
        </div>
      </section>

      <!-- PATTERN 9: Signal Composition -->
      <section>
        <h2>9. Signal Composition & Reactive Pipeline</h2>
        <div class="demo-box">
          <p class="hint">
            This demonstrates how signals compose: 
            Input → Debounce → Transform → Filter → Display
          </p>
          
          <input 
            type="text" 
            [value]="pipelineInput.input()"
            (input)="pipelineInput.input.set($any($event.target).value)"
            placeholder="Type numbers..." />
          
          <div class="pipeline">
            <div class="step">
              <strong>1. Input:</strong> {{ pipelineInput.input() }}
            </div>
            <div class="step">
              <strong>2. Debounced:</strong> {{ pipelineInput.output() }}
            </div>
            <div class="step">
              <strong>3. Parsed Numbers:</strong> {{ parsedNumbers() }}
            </div>
            <div class="step">
              <strong>4. Valid Numbers:</strong> {{ validNumbers() }}
            </div>
            <div class="step">
              <strong>5. Sum:</strong> {{ numberSum() }}
            </div>
          </div>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .patterns-demo {
      padding: 2rem;
      max-width: 1000px;
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
      font-size: 1.2rem;
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

    button:hover:not(:disabled) {
      background: #c50028;
    }

    button:disabled {
      background: #ccc;
      cursor: not-allowed;
    }

    input, textarea {
      padding: 0.5rem;
      border: 1px solid #ccc;
      border-radius: 4px;
      font-size: 1rem;
      width: 100%;
      box-sizing: border-box;
    }

    input.invalid {
      border-color: #dd0031;
    }

    .form-group {
      margin: 1rem 0;
    }

    .form-group label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 500;
    }

    .errors {
      margin-top: 0.5rem;
    }

    .error {
      color: #dd0031;
      font-size: 0.85rem;
      display: block;
      margin: 0.25rem 0;
    }

    .field-status {
      margin-top: 0.5rem;
      font-size: 0.85rem;
      color: #666;
    }

    .field-status span {
      margin-right: 1rem;
    }

    .status {
      font-weight: 600;
      padding: 0.5rem;
      border-radius: 4px;
      margin-top: 1rem;
    }

    .loading {
      color: #007acc;
      font-style: italic;
    }

    .data-display {
      background: #f4f4f4;
      padding: 1rem;
      border-radius: 4px;
      margin-top: 1rem;
    }

    .search-results {
      margin-top: 1rem;
    }

    .result-item {
      padding: 0.5rem;
      border: 1px solid #e0e0e0;
      margin: 0.25rem 0;
      border-radius: 4px;
    }

    .editor-controls {
      display: flex;
      gap: 0.5rem;
      align-items: center;
      margin-bottom: 1rem;
    }

    .history-info {
      font-size: 0.9rem;
      color: #666;
      margin-left: auto;
    }

    .counter-controls {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin: 1rem 0;
    }

    .counter-value {
      font-size: 2rem;
      font-weight: bold;
      min-width: 50px;
      text-align: center;
    }

    .tag-input {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }

    .tags {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin: 1rem 0;
    }

    .tag {
      background: #007acc;
      color: white;
      padding: 0.25rem 0.75rem;
      border-radius: 16px;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
    }

    .tag button {
      background: transparent;
      color: white;
      padding: 0;
      margin: 0;
      width: 20px;
      height: 20px;
      font-size: 1.2rem;
      line-height: 1;
    }

    .pipeline {
      margin-top: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .step {
      padding: 0.75rem;
      background: #f4f4f4;
      border-left: 3px solid #007acc;
      border-radius: 4px;
    }

    .hint {
      color: #666;
      font-style: italic;
      font-size: 0.9rem;
      margin: 0.5rem 0;
    }

    .converter {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin: 1rem 0;
      padding: 1rem;
      background: #f9f9f9;
      border-radius: 4px;
    }

    .converter-input {
      flex: 1;
    }

    .converter-input label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-weight: 500;
    }

    .converter-input input {
      width: 100px;
      margin: 0 0.5rem;
    }

    .converter-arrow {
      font-size: 1.5rem;
      color: #007acc;
      font-weight: bold;
    }

    .linked-demo {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .linked-demo label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-weight: 500;
    }

    .linked-demo select {
      padding: 0.5rem;
      border: 1px solid #ccc;
      border-radius: 4px;
      font-size: 1rem;
      cursor: pointer;
    }

    .notification-status {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem;
      background: #f9f9f9;
      border-radius: 4px;
    }

    .notification-status .enabled {
      color: #28a745;
      font-weight: 600;
    }

    .notification-status .disabled {
      color: #dc3545;
      font-weight: 600;
    }

    .sortable-demo {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .input-row {
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }

    .input-row input[type="text"] {
      flex: 2;
    }

    .input-row input[type="number"] {
      flex: 1;
    }

    .lists-container {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      margin-top: 1rem;
    }

    .list-column {
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      padding: 1rem;
      background: #fafafa;
    }

    .list-column h4 {
      margin-top: 0;
      margin-bottom: 1rem;
      color: #333;
      font-size: 1rem;
    }

    .task-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .task-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem;
      background: white;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
    }

    .priority {
      background: #007acc;
      color: white;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.8rem;
      font-weight: 600;
      min-width: 2rem;
      text-align: center;
    }

    .task-controls {
      margin-left: auto;
      display: flex;
      gap: 0.25rem;
    }

    .task-controls button {
      padding: 0.25rem 0.5rem;
      font-size: 0.9rem;
      min-width: 2rem;
    }

    h3 {
      color: #555;
      font-size: 1.1rem;
      margin: 1.5rem 0 0.5rem 0;
    }

    h3:first-child {
      margin-top: 0;
    }

    pre {
      margin: 0;
      overflow-x: auto;
    }
  `]
})
export class SignalPatternsDemoComponent {
  // Inject the Injector to pass to pattern functions
  private injector = inject(Injector);
  
  // ============================================================================
  // PATTERN 1: Signal-Based Reactive Forms
  // ============================================================================
  // Why: Angular's Reactive Forms can be heavy for simple validation.
  // Signals provide a lighter alternative with automatic reactivity.
  //
  // How it works:
  // - createFormField() creates a signal-based field with validators
  // - Each field tracks: value, touched, dirty, errors, valid
  // - Changes propagate automatically through computed signals
  // - No need for FormGroup, FormControl, or RxJS subscriptions
  //
  // For beginners: This is like having reactive forms but simpler.
  // The field "knows" when it's valid without you manually checking.
  // ============================================================================
  
  // Create an email field with validators
  emailField = createFormField('', [requiredValidator, emailValidator], this.injector);
  
  // Create a password field with minimum length validation
  passwordField = createFormField('', [
    requiredValidator,
    minLengthValidator(8)
  ], this.injector);
  
  // Computed signal that's true when BOTH fields are valid
  // This automatically updates whenever either field changes!
  formValid = computed(() => 
    this.emailField.valid() && this.passwordField.valid()
  );

  // ============================================================================
  // PATTERN 2: Resource Pattern for Async Data
  // ============================================================================
  // Why: Loading data from APIs involves managing loading/error/data states.
  // This pattern encapsulates that complexity.
  //
  // How it works:
  // - createResource() takes a function that returns a Promise
  // - Automatically tracks: loading, data, error
  // - Call refresh() to reload the data
  // - Effects run automatically to update signals
  //
  // For beginners: This replaces writing "isLoading = true" manually
  // and handles errors automatically. It's like async/await but reactive.
  // ============================================================================
  
  userResource = createResource(async () => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Return mock data (in real apps, this would be an HTTP call)
    return {
      id: Math.floor(Math.random() * 1000),
      name: 'John Doe',
      email: 'john@example.com',
      timestamp: new Date().toISOString()
    };
  }, this.injector);

  // ============================================================================
  // PATTERN 3: Debounced Signal for Search
  // ============================================================================
  // Why: When users type in search boxes, you don't want to search on
  // every keystroke. Debouncing waits until they stop typing.
  //
  // How it works:
  // - input signal updates immediately (for UI feedback)
  // - output signal only updates after 500ms of no changes
  // - Uses effects with cleanup to cancel pending updates
  //
  // For beginners: Think of this as "wait for the user to finish typing
  // before doing the expensive search operation."
  // ============================================================================
  
  searchDebounced = createDebouncedSignal('', 500, this.injector);
  
  // Computed signal that filters results based on debounced input
  // Only recalculates when the user stops typing for 500ms
  searchResults = computed(() => {
    const query = this.searchDebounced.output().toLowerCase();
    if (!query) return [];
    
    // Mock data - in real apps, this might be an API call
    const items = [
      'Apple', 'Banana', 'Cherry', 'Date', 'Elderberry',
      'Fig', 'Grape', 'Honeydew', 'Kiwi', 'Lemon'
    ];
    
    // Filter items that contain the search query
    return items.filter(item => 
      item.toLowerCase().includes(query)
    );
  });

  // ============================================================================
  // PATTERN 4: History Signal (Undo/Redo)
  // ============================================================================
  // Why: Text editors, drawing apps, and forms often need undo/redo.
  // This pattern provides a reusable solution.
  //
  // How it works:
  // - Maintains an array of historical values
  // - Tracks current position in history
  // - setValue() adds to history, undo() moves back, redo() moves forward
  // - canUndo() and canRedo() computed signals enable/disable buttons
  //
  // For beginners: This is like your browser's back/forward buttons,
  // but for any value you want to track.
  // ============================================================================
  
  textHistory = createHistorySignal('Hello World');

  // ============================================================================
  // PATTERN 5: Persistent Store (localStorage)
  // ============================================================================
  // Why: Users expect data to persist across page refreshes.
  // This pattern automatically syncs signals with localStorage.
  //
  // How it works:
  // - State is saved to localStorage on every change (via effect)
  // - On initialization, loads from localStorage if available
  // - Falls back to initial value if nothing is stored
  // - Works with any JSON-serializable data
  //
  // For beginners: This makes data "stick" even when you refresh the page.
  // For beginners: Try incrementing the counter, refreshing, and seeing it remember!
  // ============================================================================
  
  persistentStore = createPersistentStore<{count: number, lastUpdated: string}>(
    'demo-counter', // localStorage key
    { count: 0, lastUpdated: new Date().toISOString() }, // default value
    this.injector
  );

  // Helper methods to update the persistent counter
  incrementPersistent() {
    this.persistentStore.update(state => ({
      count: state.count + 1,
      lastUpdated: new Date().toISOString()
    }));
  }

  decrementPersistent() {
    this.persistentStore.update(state => ({
      count: state.count - 1,
      lastUpdated: new Date().toISOString()
    }));
  }

  // ============================================================================
  // PATTERN 6: Computed with Previous Value
  // ============================================================================
  // Why: Sometimes you need to compare current vs previous values
  // (e.g., "did it increase or decrease?")
  //
  // How it works:
  // - computedWithPrevious keeps track of the previous value
  // - Your function receives both current and previous
  // - Calculate deltas, trends, or any comparison
  //
  // For beginners: This lets you answer questions like "how much did
  // this change since last time?" automatically.
  // ============================================================================
  
  numberInput = signal(10);
  
  // Calculate the difference from the previous value
  deltaSignal = computedWithPrevious(
    (current, previous) => {
      if (previous === undefined) return 0; // First time, no previous value
      return current - previous;
    },
    this.numberInput
  );

  // Show a trend indicator based on the delta
  trendSignal = computed(() => {
    const delta = this.deltaSignal();
    if (delta > 0) return '📈 Increasing';
    if (delta < 0) return '📉 Decreasing';
    return '➡️ Unchanged';
  });

  // Helper to update the number with a random increment
  incrementNumber() {
    this.numberInput.update(n => n + Math.floor(Math.random() * 10) + 1);
  }

  // ============================================================================
  // PATTERN 7: Signal Set (Unique Collections)
  // ============================================================================
  // Why: Managing lists of unique items (tags, selected items) is common.
  // This pattern provides a reactive Set-like interface.
  //
  // How it works:
  // - add() adds unique items (ignores duplicates)
  // - remove() removes by value
  // - toggle() adds if missing, removes if present
  // - All operations are reactive and immutable
  //
  // For beginners: This is like JavaScript's Set, but reactive.
  // The UI updates automatically when you add/remove items.
  // ============================================================================
  
  tagSet = createSignalSet<string>();
  newTag = ''; // Bound to input field via [(ngModel)]

  addTag() {
    if (this.newTag.trim()) {
      this.tagSet.add(this.newTag.trim());
      this.newTag = ''; // Clear input after adding
    }
  }

  // ============================================================================
  // PATTERN 8: Angular's Built-in linkedSignal (v20+)
  // ============================================================================
  // Why: Need a signal that auto-computes BUT can be manually overridden.
  // Different from computed (read-only) and regular signals (no auto-update).
  //
  // How it works:
  // - linkedSignal creates a writable signal with a computation
  // - Automatically re-computes when source signals change
  // - Can be manually set/updated like a regular signal
  // - Re-syncs with computation when sources change (even after manual override)
  //
  // For beginners: linkedSignal = computed + writable!
  // It follows a rule automatically but lets you break the rule temporarily.
  // ============================================================================

  // Example 1: Notifications toggle
  // Source signal: user's online status
  userStatus = signal<'online' | 'away' | 'offline'>('online');

  // Linked signal: auto-enables when online, but can be manually toggled
  // This is Angular's built-in linkedSignal API (v20+)
  notificationsEnabled = linkedSignal(() => this.userStatus() === 'online');

  toggleNotifications() {
    // This is the key difference from computed!
    // linkedSignal is writable - you can manually override it
    this.notificationsEnabled.set(!this.notificationsEnabled());
    // Note: When userStatus changes, notificationsEnabled will re-compute
  }

  // Example 2: Auto-sorted list with manual reorder
  private nextTaskId = 1;
  newTaskName = '';
  newTaskPriority = 3;

  // Source signal: unsorted tasks
  tasks = signal<Task[]>([
    { id: this.nextTaskId++, name: 'Review PR', priority: 2 },
    { id: this.nextTaskId++, name: 'Fix bug', priority: 1 },
    { id: this.nextTaskId++, name: 'Write docs', priority: 3 },
  ]);

  // Linked signal: auto-sorts by priority, but user can manually reorder
  sortedTasks = linkedSignal(
    () => [...this.tasks()].sort((a, b) => a.priority - b.priority),
    { equal: arrayEqual }
  );

  addTask() {
    if (this.newTaskName.trim()) {
      this.tasks.update(t => [...t, {
        id: this.nextTaskId++,
        name: this.newTaskName,
        priority: this.newTaskPriority
      }]);
      this.newTaskName = '';
      this.newTaskPriority = 3;
    }
  }

  shuffleTasks() {
    // Shuffle the source array - sorted will re-sync!
    this.tasks.update(t => {
      const shuffled = [...t];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    });
  }

  moveTaskUp(index: number) {
    if (index > 0) {
      // Manual reorder - this overrides the auto-sort
      const tasks = [...this.sortedTasks()];
      [tasks[index - 1], tasks[index]] = [tasks[index], tasks[index - 1]];
      this.sortedTasks.set(tasks);
    }
  }

  moveTaskDown(index: number) {
    if (index < this.sortedTasks().length - 1) {
      // Manual reorder - this overrides the auto-sort
      const tasks = [...this.sortedTasks()];
      [tasks[index], tasks[index + 1]] = [tasks[index + 1], tasks[index]];
      this.sortedTasks.set(tasks);
    }
  }

  // ============================================================================
  // PATTERN 9: Signal Composition & Reactive Pipeline
  // ============================================================================
  // Why: Complex logic often involves multiple transformation steps.
  // Signals compose naturally into data processing pipelines.
  //
  // How it works:
  // - Each step is a computed signal depending on the previous
  // - Input → Debounce → Parse → Filter → Calculate
  // - Changes propagate through the pipeline automatically
  // - Each step only recalculates when its dependencies change
  //
  // For beginners: Think of this like a factory assembly line.
  // Each station (computed) does one thing, passes to the next.
  // If nothing changes, no work is done (memoization).
  // ============================================================================
  
  pipelineInput = createDebouncedSignal('', 300, this.injector);
  
  // Step 1: Parse input into individual strings
  parsedNumbers = computed(() => {
    return this.pipelineInput.output()
      .split(',')
      .map(s => s.trim());
  });

  // Step 2: Convert strings to numbers, filter out invalid ones
  validNumbers = computed(() => {
    return this.parsedNumbers()
      .map(s => parseFloat(s))
      .filter(n => !isNaN(n));
  });

  // Step 3: Calculate the sum of all valid numbers
  numberSum = computed(() => {
    return this.validNumbers().reduce((sum, n) => sum + n, 0);
  });
}

// ============================================================================
// MARKDOWN VIEWER COMPONENT
// ============================================================================
// This component loads and displays markdown files with syntax highlighting
// and a nice reading experience.
// ============================================================================

import { Component, signal, OnInit, SecurityContext } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { marked } from 'marked';

@Component({
  selector: 'app-markdown-viewer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="markdown-viewer">
      <div class="viewer-header">
        <h1>📚 Signal Deep Dive Documentation</h1>
        <div class="file-selector">
          <label>Select Document:</label>
          <select (change)="loadMarkdown($event)" [value]="currentFile()">
            <option value="SIGNALS-DEEP-DIVE.md">Signals Deep Dive</option>
            <option value="README.md">README</option>
          </select>
        </div>
      </div>

      <div class="loading-state" *ngIf="isLoading()">
        <div class="spinner"></div>
        <p>Loading documentation...</p>
      </div>

      <div class="error-state" *ngIf="error()">
        <h3>⚠️ Error Loading Document</h3>
        <p>{{ error() }}</p>
        <button (click)="retryLoad()" class="retry-button">Retry</button>
      </div>

      <div class="markdown-content" *ngIf="!isLoading() && !error()">
        <!-- Table of Contents -->
        <div class="toc" *ngIf="tableOfContents().length > 0">
          <h3>📑 Table of Contents</h3>
          <ul>
            <li *ngFor="let item of tableOfContents()">
              <a [href]="'#' + item.id" [style.padding-left]="(item.level - 1) * 15 + 'px'">
                {{ item.text }}
              </a>
            </li>
          </ul>
        </div>

        <!-- Markdown Content -->
        <article [innerHTML]="htmlContent()"></article>

        <!-- Reading Progress Bar -->
        <div class="progress-bar" [style.width]="readingProgress() + '%'"></div>
      </div>

      <!-- Footer -->
      <div class="viewer-footer" *ngIf="!isLoading() && !error()">
        <p>
          💡 <strong>Tip:</strong> Open your browser's console while running the demos to see detailed output.
        </p>
        <div class="stats">
          <span>📄 {{ wordCount() }} words</span>
          <span>⏱️ ~{{ readingTime() }} min read</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .markdown-viewer {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f8f9fa;
      min-height: 100vh;
    }

    .viewer-header {
      background: white;
      border-radius: 12px;
      padding: 2rem;
      margin-bottom: 2rem;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .viewer-header h1 {
      margin: 0;
      color: #2c3e50;
      font-size: 2rem;
    }

    .file-selector {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .file-selector label {
      font-weight: 600;
      color: #666;
    }

    .file-selector select {
      padding: 0.5rem 1rem;
      border: 2px solid #e1e8ed;
      border-radius: 6px;
      font-size: 1rem;
      cursor: pointer;
      background: white;
      transition: border-color 0.2s;
    }

    .file-selector select:hover {
      border-color: #667eea;
    }

    .file-selector select:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .loading-state,
    .error-state {
      background: white;
      border-radius: 12px;
      padding: 3rem;
      text-align: center;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .spinner {
      border: 4px solid #f3f3f3;
      border-top: 4px solid #667eea;
      border-radius: 50%;
      width: 50px;
      height: 50px;
      animation: spin 1s linear infinite;
      margin: 0 auto 1rem;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .error-state h3 {
      color: #dc3545;
      margin-bottom: 1rem;
    }

    .retry-button {
      margin-top: 1rem;
      padding: 0.5rem 1.5rem;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 1rem;
    }

    .retry-button:hover {
      background: #5568d3;
    }

    .markdown-content {
      background: white;
      border-radius: 12px;
      padding: 3rem;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      position: relative;
      overflow: hidden;
    }

    .toc {
      background: #f8f9fa;
      border-left: 4px solid #667eea;
      padding: 1.5rem;
      margin-bottom: 2rem;
      border-radius: 8px;
    }

    .toc h3 {
      margin: 0 0 1rem 0;
      color: #2c3e50;
      font-size: 1.25rem;
    }

    .toc ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .toc li {
      margin-bottom: 0.5rem;
    }

    .toc a {
      color: #667eea;
      text-decoration: none;
      display: block;
      padding: 0.25rem 0;
      transition: all 0.2s;
      border-radius: 4px;
    }

    .toc a:hover {
      background: rgba(102, 126, 234, 0.1);
      padding-left: 0.5rem;
    }

    .progress-bar {
      position: absolute;
      bottom: 0;
      left: 0;
      height: 4px;
      background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
      transition: width 0.3s ease;
    }

    /* Markdown Styling */
    article {
      line-height: 1.8;
      color: #333;
    }

    article :global(h1),
    article :global(h2),
    article :global(h3),
    article :global(h4),
    article :global(h5),
    article :global(h6) {
      color: #2c3e50;
      margin-top: 2rem;
      margin-bottom: 1rem;
      font-weight: 600;
      line-height: 1.3;
    }

    article :global(h1) { font-size: 2.5rem; border-bottom: 3px solid #667eea; padding-bottom: 0.5rem; }
    article :global(h2) { font-size: 2rem; border-bottom: 2px solid #e1e8ed; padding-bottom: 0.5rem; }
    article :global(h3) { font-size: 1.5rem; }
    article :global(h4) { font-size: 1.25rem; }

    article :global(p) {
      margin-bottom: 1rem;
      font-size: 1.05rem;
    }

    article :global(ul),
    article :global(ol) {
      margin-bottom: 1rem;
      padding-left: 2rem;
    }

    article :global(li) {
      margin-bottom: 0.5rem;
    }

    article :global(code) {
      background: #f4f4f4;
      padding: 0.2rem 0.4rem;
      border-radius: 4px;
      font-family: 'Courier New', monospace;
      font-size: 0.9em;
      color: #e83e8c;
    }

    article :global(pre) {
      background: #2d2d2d;
      color: #f8f8f2;
      padding: 1.5rem;
      border-radius: 8px;
      overflow-x: auto;
      margin: 1.5rem 0;
      line-height: 1.5;
    }

    article :global(pre code) {
      background: none;
      padding: 0;
      color: inherit;
      font-size: 0.95rem;
    }

    article :global(blockquote) {
      border-left: 4px solid #667eea;
      padding-left: 1.5rem;
      margin: 1.5rem 0;
      color: #666;
      font-style: italic;
      background: #f8f9fa;
      padding: 1rem 1.5rem;
      border-radius: 4px;
    }

    article :global(table) {
      width: 100%;
      border-collapse: collapse;
      margin: 1.5rem 0;
    }

    article :global(th),
    article :global(td) {
      border: 1px solid #e1e8ed;
      padding: 0.75rem;
      text-align: left;
    }

    article :global(th) {
      background: #f8f9fa;
      font-weight: 600;
    }

    article :global(a) {
      color: #667eea;
      text-decoration: none;
      border-bottom: 1px solid transparent;
      transition: border-color 0.2s;
    }

    article :global(a:hover) {
      border-bottom-color: #667eea;
    }

    article :global(hr) {
      border: none;
      border-top: 2px solid #e1e8ed;
      margin: 2rem 0;
    }

    article :global(img) {
      max-width: 100%;
      height: auto;
      border-radius: 8px;
      margin: 1rem 0;
    }

    .viewer-footer {
      background: white;
      border-radius: 12px;
      padding: 2rem;
      margin-top: 2rem;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      text-align: center;
    }

    .viewer-footer p {
      margin-bottom: 1rem;
      color: #666;
    }

    .stats {
      display: flex;
      justify-content: center;
      gap: 2rem;
      color: #999;
      font-size: 0.9rem;
    }

    @media (max-width: 768px) {
      .markdown-viewer {
        padding: 1rem;
      }

      .viewer-header {
        flex-direction: column;
        align-items: flex-start;
      }

      .viewer-header h1 {
        font-size: 1.5rem;
      }

      .markdown-content {
        padding: 1.5rem;
      }

      article :global(h1) { font-size: 1.75rem; }
      article :global(h2) { font-size: 1.5rem; }
      article :global(h3) { font-size: 1.25rem; }
    }
  `]
})
export class MarkdownViewerComponent implements OnInit {
  // State signals
  currentFile = signal('SIGNALS-DEEP-DIVE.md');
  isLoading = signal(true);
  error = signal<string | null>(null);
  htmlContent = signal<SafeHtml>('');
  tableOfContents = signal<Array<{ level: number; text: string; id: string }>>([]);
  wordCount = signal(0);
  readingTime = signal(0);
  readingProgress = signal(0);

  constructor(
    private http: HttpClient,
    private sanitizer: DomSanitizer
  ) {
    // Configure marked options
    marked.setOptions({
      gfm: true,
      breaks: true
    });

    // Setup scroll listener for reading progress
    if (typeof window !== 'undefined') {
      window.addEventListener('scroll', () => {
        this.updateReadingProgress();
      });
    }
  }

  ngOnInit(): void {
    this.loadMarkdownFile(this.currentFile());
  }

  /**
   * Load markdown file from event
   */
  loadMarkdown(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const filename = select.value;
    this.currentFile.set(filename);
    this.loadMarkdownFile(filename);
  }

  /**
   * Retry loading the current file
   */
  retryLoad(): void {
    this.loadMarkdownFile(this.currentFile());
  }

  /**
   * Load and parse markdown file
   */
  private loadMarkdownFile(filename: string): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.http.get(`/${filename}`, { responseType: 'text' })
      .subscribe({
        next: (markdown) => {
          this.processMarkdown(markdown);
          this.isLoading.set(false);
        },
        error: (err) => {
          console.error('Error loading markdown:', err);
          this.error.set(`Failed to load ${filename}. Make sure the file exists in the public folder.`);
          this.isLoading.set(false);
        }
      });
  }

  /**
   * Process markdown content
   */
  private processMarkdown(markdown: string): void {
    // Extract table of contents
    const toc = this.extractTableOfContents(markdown);
    this.tableOfContents.set(toc);

    // Calculate reading stats
    const words = markdown.split(/\s+/).length;
    this.wordCount.set(words);
    this.readingTime.set(Math.ceil(words / 200)); // Average reading speed

    // Convert markdown to HTML
    const rawHtml = marked.parse(markdown) as string;
    
    // Sanitize and set HTML content
    const sanitized = this.sanitizer.sanitize(SecurityContext.HTML, rawHtml);
    this.htmlContent.set(this.sanitizer.bypassSecurityTrustHtml(sanitized || ''));
  }

  /**
   * Extract table of contents from markdown
   */
  private extractTableOfContents(markdown: string): Array<{ level: number; text: string; id: string }> {
    const headingRegex = /^(#{1,6})\s+(.+)$/gm;
    const toc: Array<{ level: number; text: string; id: string }> = [];
    let match;

    while ((match = headingRegex.exec(markdown)) !== null) {
      const level = match[1].length;
      const text = match[2].trim();
      const id = text.toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-');
      
      toc.push({ level, text, id });
    }

    return toc;
  }

  /**
   * Update reading progress based on scroll position
   */
  private updateReadingProgress(): void {
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    const scrollTop = window.scrollY;
    const progress = (scrollTop / (documentHeight - windowHeight)) * 100;
    this.readingProgress.set(Math.min(100, Math.max(0, progress)));
  }
}

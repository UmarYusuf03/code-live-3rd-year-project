import { Component, ElementRef, inject, viewChild, AfterViewInit, OnDestroy } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WorkspaceService } from "../../services/workspace.service";
import { SignalRService } from "../../services/signalr.service";

@Component({
  selector: "app-terminal",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="terminal-shell">
      <div class="terminal-bar">
        <span class="title">Terminal Output</span>
        <button class="sm" (click)="clear()">Clear</button>
      </div>
      <div class="terminal-body" #termContainer></div>
    </div>
  `,
  styles: [`
    :host { display: flex; flex-direction: column; height: 100%; width: 100%; background: #0d1117; }
    .terminal-shell { display: flex; flex-direction: column; height: 100%; }
    .terminal-bar { display: flex; justify-content: space-between; align-items: center; padding: 6px 12px; background: #161b22; border-bottom: 1px solid #30363d; font-size: 12px; color: #8b949e; }
    .terminal-body { flex: 1; padding: 4px; overflow: hidden; }
  `]
})
export class TerminalComponent implements AfterViewInit, OnDestroy {
  readonly termContainer = viewChild<ElementRef<HTMLDivElement>>("termContainer");
  private term?: Terminal;
  private fit?: FitAddon;
  clear(): void { this.term?.clear(); }
  ngAfterViewInit(): void {}
  ngOnDestroy(): void { this.term?.dispose(); }
}

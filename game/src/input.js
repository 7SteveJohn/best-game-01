// Emberlight — mouse and keyboard.
//
// Clicking is the whole game: pick a tower from the shop (or press 1/2/3),
// click a plot to build it, click a tower to see it and upgrade or sell
// it. Space starts the next wave, P pauses, F doubles the speed, M
// mutes, Esc puts the hammer down.
import { BOARD } from './config.js';

export class Input {
  constructor(canvas, handlers) {
    this.canvas = canvas;
    this.handlers = handlers;
    this.hover = null; // { col, row } under the mouse, or null
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseLeave = this.onMouseLeave.bind(this);
    this.onClick = this.onClick.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
    canvas.addEventListener('mousemove', this.onMouseMove);
    canvas.addEventListener('mouseleave', this.onMouseLeave);
    canvas.addEventListener('click', this.onClick);
    window.addEventListener('keydown', this.onKeyDown);
  }

  // Canvas pixels -> grid cell, or null when the pointer is off the board.
  cellFromEvent(event) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;
    const col = Math.floor(x / BOARD.cell);
    const row = Math.floor(y / BOARD.cell);
    if (col < 0 || col >= BOARD.cols || row < 0 || row >= BOARD.rows) return null;
    return { col, row };
  }

  onMouseMove(event) {
    this.hover = this.cellFromEvent(event);
    this.handlers.onHover(this.hover);
  }

  onMouseLeave() {
    this.hover = null;
    this.handlers.onHover(null);
  }

  onClick(event) {
    const cell = this.cellFromEvent(event);
    if (!cell) return;
    this.handlers.onCellClick(cell.col, cell.row);
  }

  onKeyDown(event) {
    // Ignore keys typed into a button or input.
    if (event.target && (event.target.tagName === 'INPUT' || event.target.tagName === 'BUTTON')) {
      if (event.key !== ' ') return;
    }
    const key = event.key.toLowerCase();
    if (key === '1' || key === '2' || key === '3') {
      this.handlers.onPickType(['brazier', 'lantern', 'spire'][Number(key) - 1]);
    } else if (key === ' ') {
      event.preventDefault();
      this.handlers.onStartWave();
    } else if (key === 'p') {
      this.handlers.onTogglePause();
    } else if (key === 'f') {
      this.handlers.onToggleSpeed();
    } else if (key === 'm') {
      this.handlers.onToggleMute();
    } else if (key === 'escape') {
      this.handlers.onCancel();
    } else if (key === 'r') {
      this.handlers.onRestartKey();
    }
  }

  detach() {
    this.canvas.removeEventListener('mousemove', this.onMouseMove);
    this.canvas.removeEventListener('mouseleave', this.onMouseLeave);
    this.canvas.removeEventListener('click', this.onClick);
    window.removeEventListener('keydown', this.onKeyDown);
  }
}

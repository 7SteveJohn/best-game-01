// Emberlight v5 — mouse and keyboard.
//
// The mouse is the whole game: move it and the beam follows, hold the
// button down to gather the dark into the light, let go over a furnace
// to burn what you caught — or let go anywhere else and watch it slip
// free. Space starts the next watch, P pauses, F doubles the speed, M
// mutes, R restarts on the end screen.
import { BOARD } from './config.js';

export class Input {
  constructor(canvas, handlers) {
    this.canvas = canvas;
    this.handlers = handlers;
    this.hover = null; // { x, y } in canvas pixels under the mouse, or null
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseLeave = this.onMouseLeave.bind(this);
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
    canvas.addEventListener('mousemove', this.onMouseMove);
    canvas.addEventListener('mouseleave', this.onMouseLeave);
    canvas.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
    window.addEventListener('keydown', this.onKeyDown);
  }

  // Canvas pixels for a mouse event, or null when the pointer is off
  // the board.
  pointFromEvent(event) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;
    if (x < 0 || x >= BOARD.width || y < 0 || y >= BOARD.height) return null;
    return { x, y };
  }

  onMouseMove(event) {
    this.hover = this.pointFromEvent(event);
    this.handlers.onAim(this.hover);
  }

  onMouseLeave() {
    this.hover = null;
  }

  onMouseDown(event) {
    if (event.button !== 0) return;
    this.handlers.onGatherStart();
  }

  onMouseUp(event) {
    if (event.button !== 0) return;
    this.handlers.onGatherEnd();
  }

  onKeyDown(event) {
    // Ignore keys typed into a button or input.
    if (event.target && (event.target.tagName === 'INPUT' || event.target.tagName === 'BUTTON')) {
      if (event.key !== ' ') return;
    }
    const key = event.key.toLowerCase();
    if (key === ' ') {
      event.preventDefault();
      this.handlers.onStartWatch();
    } else if (key === 'p') {
      this.handlers.onTogglePause();
    } else if (key === 'f') {
      this.handlers.onToggleSpeed();
    } else if (key === 'm') {
      this.handlers.onToggleMute();
    } else if (key === 'r') {
      this.handlers.onRestartKey();
    }
  }

  detach() {
    this.canvas.removeEventListener('mousemove', this.onMouseMove);
    this.canvas.removeEventListener('mouseleave', this.onMouseLeave);
    this.canvas.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mouseup', this.onMouseUp);
    window.removeEventListener('keydown', this.onKeyDown);
  }
}

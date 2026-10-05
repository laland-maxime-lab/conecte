import { InputEvent } from './types';

// Electron IPC Bridge interface (when running in Electron desktop app)
declare global {
  interface Window {
    electronAPI?: {
      sendNativeInput: (event: InputEvent) => Promise<boolean>;
      isElectron: boolean;
      platform: string;
    };
  }
}

export type InputSendCallback = (event: InputEvent) => void;

export class RemoteInputController {
  private targetElement: HTMLElement | null = null;
  private sendCallback: InputSendCallback | null = null;
  private isEnabled = true;
  private isMouseDown = false;

  constructor(sendCallback?: InputSendCallback) {
    if (sendCallback) {
      this.sendCallback = sendCallback;
    }
  }

  setSendCallback(cb: InputSendCallback) {
    this.sendCallback = cb;
  }

  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
  }

  attachToElement(el: HTMLElement) {
    this.detach();
    this.targetElement = el;

    el.addEventListener('mousemove', this.handleMouseMove);
    el.addEventListener('mousedown', this.handleMouseDown);
    el.addEventListener('mouseup', this.handleMouseUp);
    el.addEventListener('contextmenu', this.handleContextMenu);
    el.addEventListener('wheel', this.handleWheel, { passive: false });
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
  }

  detach() {
    if (!this.targetElement) return;
    this.targetElement.removeEventListener('mousemove', this.handleMouseMove);
    this.targetElement.removeEventListener('mousedown', this.handleMouseDown);
    this.targetElement.removeEventListener('mouseup', this.handleMouseUp);
    this.targetElement.removeEventListener('contextmenu', this.handleContextMenu);
    this.targetElement.removeEventListener('wheel', this.handleWheel);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    this.targetElement = null;
  }

  private getNormalizedCoordinates(e: MouseEvent): { x: number; y: number } | null {
    if (!this.targetElement) return null;
    const rect = this.targetElement.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;

    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    return { x, y };
  }

  private handleMouseMove = (e: MouseEvent) => {
    if (!this.isEnabled || !this.sendCallback) return;
    const coords = this.getNormalizedCoordinates(e);
    if (!coords) return;

    this.sendCallback({
      type: 'mouse-move',
      x: coords.x,
      y: coords.y,
    });
  };

  private handleMouseDown = (e: MouseEvent) => {
    if (!this.isEnabled || !this.sendCallback) return;
    const coords = this.getNormalizedCoordinates(e);
    if (!coords) return;
    this.isMouseDown = true;

    const buttonMap: Record<number, 'left' | 'middle' | 'right'> = {
      0: 'left',
      1: 'middle',
      2: 'right',
    };

    this.sendCallback({
      type: 'mouse-down',
      button: buttonMap[e.button] || 'left',
      x: coords.x,
      y: coords.y,
    });
  };

  private handleMouseUp = (e: MouseEvent) => {
    if (!this.isEnabled || !this.sendCallback) return;
    const coords = this.getNormalizedCoordinates(e);
    if (!coords) return;
    this.isMouseDown = false;

    const buttonMap: Record<number, 'left' | 'middle' | 'right'> = {
      0: 'left',
      1: 'middle',
      2: 'right',
    };

    this.sendCallback({
      type: 'mouse-up',
      button: buttonMap[e.button] || 'left',
      x: coords.x,
      y: coords.y,
    });
  };

  private handleContextMenu = (e: MouseEvent) => {
    // Intercept native browser right-click to forward as remote right-click!
    if (this.isEnabled) {
      e.preventDefault();
    }
  };

  private handleWheel = (e: WheelEvent) => {
    if (!this.isEnabled || !this.sendCallback) return;
    e.preventDefault();
    const coords = this.getNormalizedCoordinates(e);
    if (!coords) return;

    this.sendCallback({
      type: 'mouse-wheel',
      deltaX: e.deltaX,
      deltaY: e.deltaY,
      x: coords.x,
      y: coords.y,
    });
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    if (!this.isEnabled || !this.sendCallback) return;

    // Prevent default browser shortcuts when focus is in the remote view
    if (
      ['Tab', 'Alt', 'F5', 'F11'].includes(e.key) ||
      (e.ctrlKey && ['w', 't', 'r', 'n'].includes(e.key.toLowerCase()))
    ) {
      e.preventDefault();
    }

    this.sendCallback({
      type: 'key-down',
      key: e.key,
      code: e.code,
      altKey: e.altKey,
      ctrlKey: e.ctrlKey,
      shiftKey: e.shiftKey,
      metaKey: e.metaKey,
    });
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    if (!this.isEnabled || !this.sendCallback) return;

    this.sendCallback({
      type: 'key-up',
      key: e.key,
      code: e.code,
      altKey: e.altKey,
      ctrlKey: e.ctrlKey,
      shiftKey: e.shiftKey,
      metaKey: e.metaKey,
    });
  };

  sendShortcut(action: 'ctrl-alt-del' | 'win-d' | 'alt-tab' | 'esc' | 'enter') {
    if (!this.sendCallback) return;
    this.sendCallback({
      type: 'special-shortcut',
      action,
    });
  }
}

/**
 * Host Receiver: Handles incoming input events on the machine being controlled.
 * If in Electron on Windows, dispatches native OS mouse/keyboard.
 * If in Web, dispatches to virtual cursor visualization and DOM simulation.
 */
export class RemoteInputReceiver {
  private onVirtualCursorMove?: (x: number, y: number) => void;
  private onKeyActivity?: (keyDesc: string) => void;

  constructor(options?: {
    onVirtualCursorMove?: (x: number, y: number) => void;
    onKeyActivity?: (keyDesc: string) => void;
  }) {
    this.onVirtualCursorMove = options?.onVirtualCursorMove;
    this.onKeyActivity = options?.onKeyActivity;
  }

  handleRemoteEvent(event: InputEvent) {
    // 1. If running under Electron with native OS bridge
    if (window.electronAPI?.sendNativeInput) {
      window.electronAPI.sendNativeInput(event).catch(console.error);
    }

    // 2. Visual / UI feedback for Host
    switch (event.type) {
      case 'mouse-move':
      case 'mouse-down':
      case 'mouse-up':
      case 'mouse-click':
      case 'mouse-wheel':
        if (this.onVirtualCursorMove) {
          this.onVirtualCursorMove(event.x, event.y);
        }
        break;

      case 'key-down': {
        const modifiers = [
          event.ctrlKey ? 'Ctrl' : '',
          event.altKey ? 'Alt' : '',
          event.shiftKey ? 'Maj' : '',
          event.metaKey ? 'Win' : '',
        ].filter(Boolean);

        const desc = [...modifiers, event.key].join(' + ');
        if (this.onKeyActivity) {
          this.onKeyActivity(desc);
        }
        break;
      }

      case 'special-shortcut':
        if (this.onKeyActivity) {
          const names: Record<string, string> = {
            'ctrl-alt-del': 'Ctrl + Alt + Suppr',
            'win-d': 'Win + D (Bureau)',
            'alt-tab': 'Alt + Tab',
            'esc': 'Échap',
            'enter': 'Entrée',
          };
          this.onKeyActivity(names[event.action] || event.action);
        }
        break;
    }
  }
}

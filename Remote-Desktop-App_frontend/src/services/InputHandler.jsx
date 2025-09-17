import SocketService from './SocketService';

class InputHandler {
    constructor() {
        this.socketService = SocketService.getInstance();
    }

    sendMouseMove(x, y) {
        const event = {
            type: 'MOUSE_MOVE',
            x: x,
            y: y,
            timestamp: Date.now()
        };
        this.socketService.sendInputEvent(event);
    }

    sendMouseClick(x, y, button) {
        const event = {
            type: 'MOUSE_CLICK',
            x: x,
            y: y,
            button: button,
            timestamp: Date.now()
        };
        this.socketService.sendInputEvent(event);
    }

    sendMousePress(x, y, button) {
        const event = {
            type: 'MOUSE_PRESS',
            x: x,
            y: y,
            button: button,
            timestamp: Date.now()
        };
        this.socketService.sendInputEvent(event);
    }

    sendMouseRelease(x, y, button) {
        const event = {
            type: 'MOUSE_RELEASE',
            x: x,
            y: y,
            button: button,
            timestamp: Date.now()
        };
        this.socketService.sendInputEvent(event);
    }

    sendMouseWheel(deltaY) {
        const event = {
            type: 'MOUSE_WHEEL',
            deltaY: deltaY,
            timestamp: Date.now()
        };
        this.socketService.sendInputEvent(event);
    }

    sendKeyPress(keyCode) {
        const event = {
            type: 'KEY_PRESS',
            keyCode: keyCode,
            timestamp: Date.now()
        };
        this.socketService.sendInputEvent(event);
    }

    sendKeyRelease(keyCode) {
        const event = {
            type: 'KEY_RELEASE',
            keyCode: keyCode,
            timestamp: Date.now()
        };
        this.socketService.sendInputEvent(event);
    }
}

export default InputHandler;

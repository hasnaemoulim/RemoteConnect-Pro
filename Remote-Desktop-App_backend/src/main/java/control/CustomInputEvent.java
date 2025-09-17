package main.java.control;

import java.io.Serializable;

public class CustomInputEvent implements Serializable {
    private static final long serialVersionUID = 1L;

    public enum EventType {
        MOUSE_MOVE, MOUSE_CLICK, MOUSE_PRESS, MOUSE_RELEASE,
        KEY_PRESS, KEY_RELEASE, KEY_TYPE
    }

    private EventType type;
    private int x, y;
    private int button;
    private int keyCode;
    private long timestamp;

    public CustomInputEvent(EventType type, int x, int y) {
        this.type = type;
        this.x = x;
        this.y = y;
        this.timestamp = System.currentTimeMillis();
    }

    public CustomInputEvent(EventType type, int button) {
        this.type = type;
        this.button = button;
        this.timestamp = System.currentTimeMillis();
    }

    public CustomInputEvent(EventType type, int keyCode, boolean isKey) {
        this.type = type;
        this.keyCode = keyCode;
        this.timestamp = System.currentTimeMillis();
    }

    // Getters
    public EventType getType() { return type; }
    public int getX() { return x; }
    public int getY() { return y; }
    public int getButton() { return button; }
    public int getKeyCode() { return keyCode; }
    public long getTimestamp() { return timestamp; }
}

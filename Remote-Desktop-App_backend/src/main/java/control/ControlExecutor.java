package main.java.control;

import java.awt.*;
import java.awt.event.InputEvent;
import java.awt.event.KeyEvent;

public class ControlExecutor {
    private Robot robot;
    private boolean debugMode = true;

    public ControlExecutor() {
        try {
            this.robot = new Robot();
            robot.setAutoDelay(5);
            robot.setAutoWaitForIdle(false);
            System.out.println("🎮 ControlExecutor initialisé avec debug");
        } catch (AWTException e) {
            throw new RuntimeException("Impossible d'initialiser Robot pour le contrôle", e);
        }
    }

    public void executeInputEvent(String eventJson) {
        try {
            String type = extractJsonValue(eventJson, "type");

            if (debugMode) {
                System.out.println("🎯 Événement reçu: " + type);
            }

            switch (type) {
                case "MOUSE_MOVE":
                    int x = Integer.parseInt(extractJsonValue(eventJson, "x"));
                    int y = Integer.parseInt(extractJsonValue(eventJson, "y"));

                    if (isValidCoordinate(x, y)) {
                        robot.mouseMove(x, y);
                        if (debugMode) {
                            System.out.println("🖱️ Souris déplacée à: " + x + ", " + y);
                        }
                    }
                    break;

                // ✅ MODIFICATION : Simplifier la gestion des clics
                case "MOUSE_CLICK":
                    int clickX = Integer.parseInt(extractJsonValue(eventJson, "x"));
                    int clickY = Integer.parseInt(extractJsonValue(eventJson, "y"));
                    int button = Integer.parseInt(extractJsonValue(eventJson, "button"));

                    if (isValidCoordinate(clickX, clickY)) {
                        robot.mouseMove(clickX, clickY);
                        Thread.sleep(10);

                        int mouseButton = getMouseButton(button);
                        robot.mousePress(mouseButton);
                        Thread.sleep(50);
                        robot.mouseRelease(mouseButton);

                        // ✅ SUPPRIMÉ : La simulation de champ qui causait le double-clic
                        // simulateFieldActivation(clickX, clickY);

                        System.out.println("🖱️ CLIC SIMPLE à: " + clickX + ", " + clickY + " (bouton: " + button + ")");
                    }
                    break;
                case "MOUSE_PRESS":
                    int pressX = Integer.parseInt(extractJsonValue(eventJson, "x"));
                    int pressY = Integer.parseInt(extractJsonValue(eventJson, "y"));
                    int pressButton = Integer.parseInt(extractJsonValue(eventJson, "button"));

                    if (isValidCoordinate(pressX, pressY)) {
                        robot.mouseMove(pressX, pressY);
                        robot.mousePress(getMouseButton(pressButton));
                        System.out.println("🖱️ Pression souris à: " + pressX + ", " + pressY);
                    }
                    break;

                case "MOUSE_RELEASE":
                    int releaseX = Integer.parseInt(extractJsonValue(eventJson, "x"));
                    int releaseY = Integer.parseInt(extractJsonValue(eventJson, "y"));
                    int releaseButton = Integer.parseInt(extractJsonValue(eventJson, "button"));

                    if (isValidCoordinate(releaseX, releaseY)) {
                        robot.mouseMove(releaseX, releaseY);
                        robot.mouseRelease(getMouseButton(releaseButton));
                        System.out.println("🖱️ Relâchement souris à: " + releaseX + ", " + releaseY);
                    }
                    break;

                // ✅ AMÉLIORATION : Gestion clavier avec touches modificatrices
                case "KEY_PRESS":
                    int keyCode = Integer.parseInt(extractJsonValue(eventJson, "keyCode"));
                    String key = extractJsonValue(eventJson, "key");
                    boolean ctrlKey = extractJsonValue(eventJson, "ctrlKey").equals("true");
                    boolean shiftKey = extractJsonValue(eventJson, "shiftKey").equals("true");
                    boolean altKey = extractJsonValue(eventJson, "altKey").equals("true");

                    // ✅ NOUVEAU : Gestion spéciale pour les caractères
                    if (key.length() == 1 && Character.isLetter(key.charAt(0))) {
                        simulateCharacterInput(key.charAt(0));
                    } else {
                        int javaKeyCode = convertToJavaKeyCode(keyCode);

                        // Appuyer sur les modificateurs d'abord
                        if (ctrlKey) robot.keyPress(KeyEvent.VK_CONTROL);
                        if (shiftKey) robot.keyPress(KeyEvent.VK_SHIFT);
                        if (altKey) robot.keyPress(KeyEvent.VK_ALT);

                        // Appuyer sur la touche principale
                        robot.keyPress(javaKeyCode);
                        Thread.sleep(50);
                        robot.keyRelease(javaKeyCode);

                        // Relâcher les modificateurs
                        if (altKey) robot.keyRelease(KeyEvent.VK_ALT);
                        if (shiftKey) robot.keyRelease(KeyEvent.VK_SHIFT);
                        if (ctrlKey) robot.keyRelease(KeyEvent.VK_CONTROL);
                    }

                    System.out.println("⌨️ Touche pressée: " + key + " (" + keyCode + ")" +
                            (ctrlKey ? " +Ctrl" : "") +
                            (shiftKey ? " +Shift" : "") +
                            (altKey ? " +Alt" : ""));
                    break;

                case "KEY_RELEASE":
                    int releaseKeyCode = Integer.parseInt(extractJsonValue(eventJson, "keyCode"));
                    int javaReleaseKeyCode = convertToJavaKeyCode(releaseKeyCode);
                    robot.keyRelease(javaReleaseKeyCode);
                    System.out.println("⌨️ Touche relâchée: " + releaseKeyCode);
                    break;

                case "MOUSE_WHEEL":
                    int deltaY = Integer.parseInt(extractJsonValue(eventJson, "deltaY"));
                    int wheelRotation = deltaY > 0 ? 3 : -3;
                    robot.mouseWheel(wheelRotation);
                    System.out.println("🎡 Molette: " + deltaY + " -> " + wheelRotation);
                    break;

                default:
                    System.out.println("❓ Type d'événement inconnu: " + type);
            }
        } catch (Exception e) {
            System.err.println("❌ Erreur lors de l'exécution de l'événement: " + e.getMessage());
            e.printStackTrace();
        }
    }

    // ✅ NOUVELLE MÉTHODE : Simuler activation de champ
    private void simulateFieldActivation(int x, int y) {
        try {

            Thread.sleep(50);


            System.out.println("🎯 Activation de champ simulée");
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    // ✅ NOUVELLE MÉTHODE : Simuler saisie de caractère
    private void simulateCharacterInput(char c) {
        try {
            if (Character.isLetter(c)) {
                boolean isUpperCase = Character.isUpperCase(c);
                int keyCode = KeyEvent.getExtendedKeyCodeForChar(Character.toUpperCase(c));

                if (keyCode != KeyEvent.VK_UNDEFINED) {
                    if (isUpperCase) {
                        robot.keyPress(KeyEvent.VK_SHIFT);
                    }

                    robot.keyPress(keyCode);
                    Thread.sleep(50);
                    robot.keyRelease(keyCode);

                    if (isUpperCase) {
                        robot.keyRelease(KeyEvent.VK_SHIFT);
                    }

                    System.out.println("📝 Caractère saisi: " + c);
                }
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    private boolean isValidCoordinate(int x, int y) {
        Dimension screenSize = Toolkit.getDefaultToolkit().getScreenSize();
        boolean valid = x >= 0 && x < screenSize.width && y >= 0 && y < screenSize.height;

        if (!valid && debugMode) {
            System.out.println("⚠️ Coordonnées corrigées: " + x + ", " + y +
                    " -> " + Math.min(x, screenSize.width-1) + ", " + Math.min(y, screenSize.height-1));
        }

        return true;
    }

    private String extractJsonValue(String json, String key) {
        String searchKey = "\"" + key + "\":";
        int startIndex = json.indexOf(searchKey);
        if (startIndex == -1) return "0";

        startIndex += searchKey.length();

        while (startIndex < json.length() && Character.isWhitespace(json.charAt(startIndex))) {
            startIndex++;
        }

        int endIndex = startIndex;
        boolean inString = false;

        if (json.charAt(startIndex) == '"') {
            inString = true;
            startIndex++;
            endIndex = startIndex;
            while (endIndex < json.length() && json.charAt(endIndex) != '"') {
                endIndex++;
            }
        } else {
            while (endIndex < json.length() &&
                    json.charAt(endIndex) != ',' &&
                    json.charAt(endIndex) != '}') {
                endIndex++;
            }
        }

        return json.substring(startIndex, endIndex).trim();
    }

    private int getMouseButton(int button) {
        switch (button) {
            case 0: return InputEvent.BUTTON1_DOWN_MASK;
            case 1: return InputEvent.BUTTON2_DOWN_MASK;
            case 2: return InputEvent.BUTTON3_DOWN_MASK;
            default: return InputEvent.BUTTON1_DOWN_MASK;
        }
    }

    // ✅ AMÉLIORATION : Mapping complet des touches
    private int convertToJavaKeyCode(int jsKeyCode) {
        switch (jsKeyCode) {
            // Lettres A-Z
            case 65: return KeyEvent.VK_A;
            case 66: return KeyEvent.VK_B;
            case 67: return KeyEvent.VK_C;
            case 68: return KeyEvent.VK_D;
            case 69: return KeyEvent.VK_E;
            case 70: return KeyEvent.VK_F;
            case 71: return KeyEvent.VK_G;
            case 72: return KeyEvent.VK_H;
            case 73: return KeyEvent.VK_I;
            case 74: return KeyEvent.VK_J;
            case 75: return KeyEvent.VK_K;
            case 76: return KeyEvent.VK_L;
            case 77: return KeyEvent.VK_M;
            case 78: return KeyEvent.VK_N;
            case 79: return KeyEvent.VK_O;
            case 80: return KeyEvent.VK_P;
            case 81: return KeyEvent.VK_Q;
            case 82: return KeyEvent.VK_R;
            case 83: return KeyEvent.VK_S;
            case 84: return KeyEvent.VK_T;
            case 85: return KeyEvent.VK_U;
            case 86: return KeyEvent.VK_V;
            case 87: return KeyEvent.VK_W;
            case 88: return KeyEvent.VK_X;
            case 89: return KeyEvent.VK_Y;
            case 90: return KeyEvent.VK_Z;

            // Chiffres 0-9
            case 48: return KeyEvent.VK_0;
            case 49: return KeyEvent.VK_1;
            case 50: return KeyEvent.VK_2;
            case 51: return KeyEvent.VK_3;
            case 52: return KeyEvent.VK_4;
            case 53: return KeyEvent.VK_5;
            case 54: return KeyEvent.VK_6;
            case 55: return KeyEvent.VK_7;
            case 56: return KeyEvent.VK_8;
            case 57: return KeyEvent.VK_9;

            // Touches spéciales
            case 8: return KeyEvent.VK_BACK_SPACE;
            case 9: return KeyEvent.VK_TAB;
            case 13: return KeyEvent.VK_ENTER;
            case 16: return KeyEvent.VK_SHIFT;
            case 17: return KeyEvent.VK_CONTROL;
            case 18: return KeyEvent.VK_ALT;
            case 20: return KeyEvent.VK_CAPS_LOCK;
            case 27: return KeyEvent.VK_ESCAPE;
            case 32: return KeyEvent.VK_SPACE;
            case 37: return KeyEvent.VK_LEFT;
            case 38: return KeyEvent.VK_UP;
            case 39: return KeyEvent.VK_RIGHT;
            case 40: return KeyEvent.VK_DOWN;
            case 46: return KeyEvent.VK_DELETE;

            // Touches de fonction F1-F12
            case 112: return KeyEvent.VK_F1;
            case 113: return KeyEvent.VK_F2;
            case 114: return KeyEvent.VK_F3;
            case 115: return KeyEvent.VK_F4;
            case 116: return KeyEvent.VK_F5;
            case 117: return KeyEvent.VK_F6;
            case 118: return KeyEvent.VK_F7;
            case 119: return KeyEvent.VK_F8;
            case 120: return KeyEvent.VK_F9;
            case 121: return KeyEvent.VK_F10;
            case 122: return KeyEvent.VK_F11;
            case 123: return KeyEvent.VK_F12;

            // ✅ NOUVEAU : Touches de ponctuation
            case 186: return KeyEvent.VK_SEMICOLON;
            case 187: return KeyEvent.VK_EQUALS;
            case 188: return KeyEvent.VK_COMMA;
            case 189: return KeyEvent.VK_MINUS;
            case 190: return KeyEvent.VK_PERIOD;
            case 191: return KeyEvent.VK_SLASH;
            case 192: return KeyEvent.VK_BACK_QUOTE;
            case 219: return KeyEvent.VK_OPEN_BRACKET;
            case 220: return KeyEvent.VK_BACK_SLASH;
            case 221: return KeyEvent.VK_CLOSE_BRACKET;
            case 222: return KeyEvent.VK_QUOTE;

            default:
                System.out.println("⚠️ Code de touche non mappé: " + jsKeyCode);
                return jsKeyCode;
        }
    }

    public void setDebugMode(boolean debug) {
        this.debugMode = debug;
    }
}
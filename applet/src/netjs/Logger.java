/**
 * Net.JS - Applet
 * Copyright(c) 2011 Oleg Shparber <trollixx@gmail.com>
 * MIT Licensed
 */

package netjs;

import java.applet.Applet;
import java.io.PrintWriter;
import java.io.StringWriter;
import java.io.Writer;
import netscape.javascript.JSObject;

/**
 * Logger singleton.
 * 
 * @author Oleg Shparber
 */
public class Logger {

    private static Logger instance_ = null;
    private JSObject console = null;
    private boolean enabled = true;

    private Logger(Applet applet) {
        JSObject windowObject = JSObject.getWindow(applet);
        console = (JSObject) windowObject.getMember("console");
        
        // FIXME: Stupid check
        if (console.toString().equals("(nil)")) {
            console = null;
        }
    }

    public static void init(Applet applet) {
        instance_ = new Logger(applet);
    }

    public static Logger getInstance() {
        return instance_;
    }

    /**
     * 
     * @param text 
     */
    public void log(String text) {
        if (!enabled || console == null) {
            return;
        }
        
        text = "[applet] " + text;

        console.call("log", new String[]{text});
    }
    
    /**
     * 
     * @param e 
     */
    public void logException(Exception e) {
        logException(e, true);
    }
    
    /**
     * 
     * @param e
     * @param printStackTrace 
     */
    public void logException(Exception e, boolean printStackTrace) {
        log("[exception] " + e.toString());
        log("[exception] " + e.getMessage());
        
        if (printStackTrace) {
            Writer trace = new StringWriter();
            e.printStackTrace(new PrintWriter(trace));
            log("[exception] " + trace.toString());
        }
    }
}

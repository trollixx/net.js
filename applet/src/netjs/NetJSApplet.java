/**
 * Net.JS - Applet
 * Copyright(c) 2011 Oleg Shparber <trollixx@gmail.com>
 * MIT Licensed
 */
package netjs;

import java.io.*;
import java.lang.reflect.Method;
import java.nio.ByteBuffer;
import java.util.ArrayList;
import java.util.Arrays;
import netscape.javascript.*;
import sun.plugin2.liveconnect.BrowserSideObject;
import sun.plugin2.main.client.MessagePassingJSObject;
import sun.plugin2.message.Serializer;

/**
 *
 * @author Oleg Shparber
 */
public class NetJSApplet extends java.applet.Applet {

    private Logger logger;
    private JSObject netObject;
    private ConnectionManager cm;

    @Override
    public void init() {
        super.init();

        Logger.init(this);
        logger = Logger.getInstance();

        JSObject windowObject = JSObject.getWindow(this);
        netObject = (JSObject) windowObject.getMember("net");

        // FIXME: Maybe there's a better way?
        if (!netObject.toString().equals("(nil)")) {
            // TODO: Fire error?
        }

        try {
            cm = new ConnectionManager(this);
        } catch (IOException ioe) {
            logger.logException(ioe);
        }

        new Thread(cm).start();

        netObject.call("_appletLoaded", null);
    }

    @Override
    public void destroy() {
        // TODO: cm.stop();
    }

    /**
     * 
     * @param host
     * @param port
     * @return 
     */
    public int connect(String host, int port) {
        return cm.addConnection(host, port);
    }

    /**
     * 
     * @param id
     * @param data
     * @return 
     */
    public boolean writeString(int id, String data) {
        try {
            return write(id, data.getBytes("UTF-8"));
        } catch (UnsupportedEncodingException uee) {
            jsEmit(id, "error", uee.getMessage());
            return false;
        }
    }

    /**
     * Just now always processes JS numbers as int.
     * 
     * @param id
     * @param data
     * @return 
     */
    public boolean writeNumber(int id, int data) {
        byte[] data_ = new byte[]{
            (byte) (data >>> 24),
            (byte) (data >>> 16),
            (byte) (data >>> 8),
            (byte) data};
        return write(id, data_);
    }

    /**
     * 
     * @param id
     * @param data
     * @return 
     */
    public boolean write(int id, byte[] data) {
        logger.log("write-data");
        return cm.write(id, data);
    }

    public void jsEmit(int id, String event) {
        jsEmit(id, event, (Object[]) null);
    }

    public void jsEmit(int id, String event, String text) {
        jsEmit(id, event, new Object[]{text});
    }

    public void jsEmit(int id, String event, Object[] params) {
        logger.log("> jsEmit: id=" + id + ", event=" + event);

        ArrayList paramList = new ArrayList();

        paramList.add(id);
        paramList.add(event);

        if (params != null) {
            paramList.addAll(Arrays.asList(params));
        }

        netObject.call("_emit", paramList.toArray());
    }
}
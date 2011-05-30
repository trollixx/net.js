/**
 * Net.JS - Applet
 * Copyright(c) 2011 Oleg Shparber <trollixx@gmail.com>
 * MIT Licensed
 */

package netjs;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.SocketAddress;
import java.nio.ByteBuffer;
import java.nio.channels.SelectionKey;
import java.nio.channels.Selector;
import java.nio.channels.SocketChannel;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Stack;

/**
 *
 * @author Oleg Shparber
 */
public class ConnectionManager implements Runnable {

    private Logger logger = null;
    private NetJSApplet applet;
    private Selector selector;
    private int lastId = 0;
    private HashMap<Integer, SocketChannel> channels = new HashMap<Integer, SocketChannel>();
    private Stack<Object[]> newConnectionData = new Stack<Object[]>();

    public ConnectionManager(NetJSApplet applet) throws IOException {
        logger = Logger.getInstance();
        this.applet = applet;
        selector = Selector.open();
    }

    public int addConnection(String host, int port) {
        int id = ++lastId;

        newConnectionData.push(new Object[]{id, host, port});
        selector.wakeup();

        return id;
    }

    private void createConnection(int id, String host, int port) {
        try {
            SocketAddress address = new InetSocketAddress(host, port);
            SocketChannel channel = SocketChannel.open();
            channel.configureBlocking(false);
            channel.connect(address);
            channel.register(selector, SelectionKey.OP_CONNECT, new Integer(id));
        } catch (IOException ioe) {
            logger.logException(ioe);
        } catch (Exception e) {
            logger.logException(e);
        }
    }

    private void processNewConnections() {
        if (newConnectionData.size() > 0) {

            logger.log("New connections found: " + newConnectionData.size());

            while (!newConnectionData.empty()) {
                Object[] data = newConnectionData.pop();
                logger.log("Host: " + (String) data[1]);
                createConnection(((Integer) data[0]).intValue(), (String) data[1], ((Integer) data[2]).intValue());
            }
        }
    }
    
    public boolean write(int id, byte[] data) {
        if (!channels.containsKey(id)) {
            return false;
        }
        
        // TODO: Implement internal queue and handle OP_WRITE
        try {
            channels.get(id).write(ByteBuffer.wrap(data));
        } catch (IOException ioe) {
            logger.logException(ioe);
            return false;
        }
        
        return true;
    }

    @Override
    public void run() {
        ByteBuffer bb = ByteBuffer.allocate(2048);
        
        while (true) {
            try {
                int n = selector.select();
                processNewConnections();
                if (n == 0) {
                    selector.selectNow();
                }

                Iterator<SelectionKey> keyIterator = selector.selectedKeys().iterator();

                while (keyIterator.hasNext()) {
                    SelectionKey key = keyIterator.next();
                    SocketChannel channel = (SocketChannel) key.channel();
                    int id = ((Integer) key.attachment()).intValue();
                    logger.log("ID: " + id);
                    
                    // TODO: if (key.isValid())...
                    if (key.isConnectable()) {
                        logger.log("key.isConnectable()");
                        
                        // XXX: Is this nedded?
                        if (channel.isConnectionPending()) {
                            try {
                                channel.finishConnect();
                            } catch (Exception e) {
                                channel.close();
                                key.cancel();
                                logger.logException(e);
                            }
                            
                            if (channel.isConnected()) {
                                channel.register(selector, SelectionKey.OP_READ, new Integer(id));
                                channels.put(id, channel);
                                applet.jsEmit(id, "connect");
                            }
                        }
                    } else if (key.isReadable()) {
                        logger.log("key.isReadable()");
                        
                        int bn = channel.read(bb);
                        logger.log("Bytes read: " + bn);
                        // FIXME: Implement pure disconnect handler (Socket.Poll?)
                        if (bn == -1 || !channel.socket().isConnected()) {
                            logger.log("socket disconnected");
                            channels.remove(id);
                            channel.close();
                            key.cancel();
                            applet.jsEmit(id, "close");
                        } else {
                            // TODO: Pass byte[] to JS
                            applet.jsEmit(id, "data", new Object[]{new String(bb.array(), 0, bn, "UTF-8")});
                        }
                    } else if (key.isWritable()) {
                        logger.log("key.isWritable()");
                    }

                    keyIterator.remove();
                }

            } catch (IOException ioe) {
                logger.logException(ioe);
            } catch (Exception e) {
                logger.logException(e);
            }
        }
    }
}
from ws4py.websocket import WebSocket

class TwoWayDict(dict):
    def __len__(self):
        return dict.__len__(self) / 2

    def __setitem__(self, key, value):
        dict.__setitem__(self, key, value)
        dict.__setitem__(self, value, key)

class WebSocketRouter(WebSocket):

    usermap = TwoWayDict()
    handlermap = TwoWayDict()
    funcmap = dict()
    serverkey = 'B8u0NOwhDE3M8sczQFyw'

    def register(func, key):
        self.modulemap[key] = func

    def received_message(self, m):
        """m is a TextMessage of comma separated key and msg

        For handler messages, key is the userkey or serverkey
        for registering

        For user messages, key is the handler registered name
        """

        # separate key and message
        key_msg = str(m).split(',',1)

        if len(key_msg) != 2:
            self.send("Invalid message")
            cherrypy.log("Recieved invalid message from %s: %s" %
                         (str(self), str(m)))
            return

        key = key_msg[0]
        msg = key_msg[1]

        if key == WebSocketHandler.serverkey:

            #handler is registering, add them to the handler map
            WebSocketHandler.handlermap[msg] = self

        elif self in WebSocketHandler.handlermap:

            #handler is sending result back to user
            WebSocketHandler.usermap[key].send(msg)

        elif key in WebSocketHandler.funcmap:

            # add to user map if not already there
            if self not in WebSocketHandler.usermap:
                WebSocketHandler.usermap[self] = uuid()

            #send to registered func, including user websocket object
            WebSocketHandler.funcmap[key].recieved_message(self, msg)

        elif key in WebSocketHandler.handlermap:

            # add to user map if not already there
            if self not in WebSocketHandler.usermap:
                WebSocketHandler.usermap[self] = uuid()

            #send user's message to handler, including user's key
            WebSocketHandler.handlermap[key].send("%s,%s" %
                    (WebSocketHandler.usermap[self], msg))

        else:
            cherrypy.log("No handler registered. User %s Message %s" %
                         (str(self), key_msg))

    def closed(self, code, reason="A client left the room without a proper explanation."):
        cherrypy.engine.publish('websocket-broadcast', TextMessage(reason))

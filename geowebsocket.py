from uuid import uuid4

import cherrypy
from ws4py.websocket import WebSocket
from ws4py.messaging import TextMessage

def myDebug(_str): cherrypy.log(_str)
# def myDebug(_str): pass

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

    @staticmethod
    def register(func, key):
        WebSocketRouter.funcmap[key] = func

    def received_message(self, m):
        """m is a TextMessage of comma separated key and msg

        For handler messages, key is the userkey or serverkey
        for registering

        For user messages, key is the handler registered name
        """

        try:

            cherrypy.log(" separate key and message")
            key_msg = str(m).split(',', 1)

            if len(key_msg) != 2:
                self.send("Invalid message")
                cherrypy.log("Recieved invalid message from %s: %s" %
                             (str(self), str(m)))
                return

            key = key_msg[0]
            msg = key_msg[1]

            if key == WebSocketRouter.serverkey:

                myDebug("%s - %s - %s" % ('registering', str(id(self)), msg))

                cherrypy.log("handler is registering, add them to the handler map")
                WebSocketRouter.handlermap[msg] = self

            elif self in WebSocketRouter.handlermap:

                myDebug("handler: %s - %s - %s" % (WebSocketRouter.handlermap[self], key, msg))

                if key in WebSocketRouter.handlermap:

                    cherrypy.log("handler sending result back to another handler")
                    WebSocketRouter.handlermap[key].send("%s,%s" %
                        (WebSocketRouter.handlermap[self], msg))

                elif key in WebSocketRouter.usermap:

                    cherrypy.log("handler is sending result back to user")
                    WebSocketRouter.usermap[key].send("%s,%s" %
                        (WebSocketRouter.handlermap[self], msg))

                else:
                    cherrypy.log("No target '%s' for handler %s response: %s" %
                                 (key, str(WebSocketRouter.handlermap[self]) , msg))

            elif key in WebSocketRouter.funcmap:

                myDebug("func: %s - %s - %s" % (WebSocketRouter.funcmap[key], key, msg))

                cherrypy.log(" add to user map if not already there")
                if self not in WebSocketRouter.usermap:
                    WebSocketRouter.usermap[self] = str(uuid4())

                cherrypy.log("send to registered func, including user websocket object")
                WebSocketRouter.funcmap[key].recieved_message(self, msg)

            elif key in WebSocketRouter.handlermap:

                myDebug("user: %s - %s - %s" % (WebSocketRouter.handlermap[key], key, msg))

                cherrypy.log(" add to user map if not already there")
                if self not in WebSocketRouter.usermap:
                    WebSocketRouter.usermap[self] = str(uuid4())

                cherrypy.log("send user's message to handler, including user's key")
                WebSocketRouter.handlermap[key].send("%s,%s" %
                        (WebSocketRouter.usermap[self], msg))

            else:
                cherrypy.log("No handler registered. User %s Message %s" %
                             (str(self), key_msg))
        except Exception, e:
            cherrypy.log(str(e))

    def closed(self, code, reason="A client left the room without a proper explanation."):
        cherrypy.engine.publish('websocket-broadcast', TextMessage(reason))

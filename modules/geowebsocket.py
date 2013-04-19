import json
import os
import traceback
from uuid import uuid4

import cherrypy
from ws4py.websocket import WebSocket
from ws4py.messaging import TextMessage

from logging import *
from nodes import NodeManager

SERVER_KEY = os.getenv('GEOWEBSOCKETKEY', 'aV64EBFjhYbhkeW0ETPGv43KGvBCYdO2Pq')

class TwoWayDict(dict):
    def __len__(self):
        return dict.__len__(self) / 2

    def __setitem__(self, key, value):
        dict.__setitem__(self, key, value)
        dict.__setitem__(self, value, key)

    def __del__(self, key):
        value = self[key]
        dict.__del__(self, key)
        dict.__del__(self, value)

class WebSocketRouter(WebSocket):

    usermap = TwoWayDict()
    nodemap = TwoWayDict()
    funcmap = dict()

    def opened(self):
        self.nodemanager = NodeManager

    @staticmethod
    def register(func, name):
        """Registers a handler function for a given name

        @param func: static function that takes a websocket and message,
            message is json decoded before passed to this function
        """
        WebSocketRouter.funcmap[name] = func

    def getSender(self):
        """If sender is registered node, returns the registered name
        If sender is user, returns user uuid
        If sender is not yet registered, a new uuid is assigned,
          stored in user map, and returned.
        """

        if self in WebSocketRouter.nodemap:
            return WebSocketRouter.nodemap[self]
        elif self not in WebSocketRouter.usermap:
            WebSocketRouter.usermap[self] = str(uuid4())
        return WebSocketRouter.usermap[self]

    def received_message(self, textMessage):
        """m is a TextMessage of json with the structure
        { target: String, message: Mixed }

        For node messages, target is the user uuid or GEOWEBKEY
        for registering

        For user messages, key is a registered name of node or func
        """

        debug("Recieved: %s" % str(textMessage))
        try:
            data = json.loads(str(textMessage))
        except Exception:
            error("Decoding json %s \n%s" % (str(textMessage),
                                             traceback.format_exc()))
            return

        if 'target' not in data:
            error("No target in message %s " % str(textMessage))
            return;

        if 'message' not in data:
            data['message'] = ''

        target = data['target']
        message = data['message']

        if target == SERVER_KEY:
            debug("%s - %s - %s" % ('registering', str(id(self)), message))

            if message in WebSocketRouter.nodemap:
                error("Attempt to register existing name %s" % message)
                return;

            WebSocketRouter.nodemap[message] = self

            # send register message to all subscribers
#            registerData = {'target':message, 'message': 'registered' }
#            registerJSON = json.dumps(registerData)
#            cherrypy.engine.publish('websocket-broadcast',
#                                    TextMessage(registerJSON))

        elif target in WebSocketRouter.nodemap:
            debug("Sending to node")
            data['target'] = self.getSender()
            WebSocketRouter.nodemap[target].send(JSON.dumps(data))

        elif target in WebSocketRouter.usermap:
            debug("Sending to user")
            data['target'] = self.getSender()
            WebSocketRouter.usermap[target].send(JSON.dumps(data))

        elif target in WebSocketRouter.funcmap:
            try:
                result = WebSocketRouter.funcmap[target](self, message)
                if result is not None:
                    self.send({'target':target, 'message': result})

            except Exception:
                error(" Function: %s\nSender: %s\nMessage: %s\nError: %s" % (
                        target, self.getSender(), message,
                        traceback.format_exc()))
                return
        else:
            error("No Target: %s message: %s sender: %s" % (target, message,
                                                           self.getSender()))
            return

    def closed(self, code, reason="Client disconnected witout reason."):
        if self in WebSocketRouter.usermap:
            del WebSocketRouter.usermap[self]
        elif self in WebSocketRouter.nodemap:
            del WebSocketRouter.nodemap[self]
        else:
            error(" Untracked client disconnected: %s" % reason)

        # cherrypy.engine.publish('websocket-broadcast', TextMessage(reason))

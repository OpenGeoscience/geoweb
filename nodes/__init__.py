# -*- coding: utf-8 -*-
import json
import os
import signal
import unittest
from subprocess import Popen

from ws4py.client.threadedclient import WebSocketClient

SERVER_KEY = os.getenv('GEOWEBSOCKETKEY', 'aV64EBFjhYbhkeW0ETPGv43KGvBCYdO2Pq')
NODE_DIR = os.path.dirname(os.path.abspath(__file__))
TEMP_DIR = os.path.abspath(os.path.join(NODE_DIR, '../temp'))

try:
    NODE_LOG = open(os.path.join(TEMP_DIR, "websocketnode.log"), "a")
    LOGGING_ENABLED = True
except:
    LOGGING_ENABLE = False

class WebSocketNodeBase(WebSocketClient):

    def onMessage(self, message):
        """Subclasses should override this
        """
        raise NotImplementedError

    def webSocketName(self):
        return self.__class__.__name__

    def opened(self):
        registerData = {'target':SERVER_KEY, 'message':self.webSocketName()}
        self.send(json.dumps(registerData))

    def closed(self, code, reason):
        pass

    def received_message(self, textMessage):
        try:
            data = json.loads(str(textMessage))
        except:
            return

        if 'target' not in data:
            return

        self.sender = data['target']
        result = self.onMessage(data.get('message', ''))
        if result is not None:
            data['message'] = result
            self.send(json.dumps(data))

    def signal(self, nodeName, nodeSlot, *args, **kwargs):
        slotData = {'slot': nodeSlot,
                    'args': args,
                    'kwargs': kwargs}
        self.send({'target':nodeName, 'message':slotData})

    def log(self, msg, prefix="LOG: "):
        global LOGGING_ENABLE
        global NODE_LOG
        if LOGGING_ENABLED:
            NODE_LOG.write("%s %s %s\n" % (self.webSocketName(), prefix, msg))
            NODE_LOG.flush()

    def error(self, msg):
        self.log(msg, "ERROR: ")

    def debug(self, msg):
        # pass
        self.log(msg, "DEBUG: ")

# decorator
class NodeSlot(object):

    def __init__(self, f):
        self.f = f
        f.isSlot = True

    def __call__(self, *args, **kwargs):
        return f(self, *args, **kwargs)


class WebSocketNode(WebSocketNodeBase):
    def onMessage(self, message):
        if 'slot' in message:
            if hasattr(self, message['slot']):
                func = getattr(self, message['slot'])
                if func.isSlot:
                    args = message.get('args', [])
                    kwargs = message.get('kwargs', {})
                    return func(self, *args, **kwargs)
        return None


def startNode(klass):
    """Nodes should call as the main program

    e.g.
    if __name__ == '__main__':
        startNode(EchoNode)
    """
    try:
        ws = klass('ws://localhost:8080/ws')
        ws.daemon = False
        ws.connect()
    except:
        ws.close()

##=================== TESTS ======================

class TestNode(WebSocketNode):

    @Node
    def testNode(self, arg1, arg2, arg3=None, arg4=None):
        return (arg1, arg2, arg3, arg4)


class TestNodes(unittest.TestCase):

    def setUp(self):
        self.funcdata = {'slot':'testNode',
                         'args':['arg1', 'arg2'],
                         'kwargs':{'arg4':'arg4'}}
        self.testNode = TestNode()

    def testNodefunc(self):
        self.assertTrue(self.testNode.testNode.isSlot)

    def testNodeArgs(self):
        result = self.testNode.onMessage(self.funcdata)
        self.assertEqual(result[0], 'arg1')
        self.assertEqual(result[1], 'arg2')
        self.assertEqual(result[2], None)
        self.assertEqual(result[3], 'arg4')

if __name__ == '__main__':
    unittest.main()

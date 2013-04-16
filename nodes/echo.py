# -*- coding: utf-8 -*-
from ws4py.client.threadedclient import WebSocketClient
from modules.geowebsocket import WebSocketRouter

class functions(object):

    @staticmethod
    def echo(*args, **kwargs):
        return (args, kwargs)

    @staticmethod
    def region(latIndexs, lonIndexs, i, userkey):
        return funcData

class StreamingWorkerClient(WebSocketClient):

    def opened(self):
        print "Worker started"
        self.userdata = {}
        self.send(WebSocketRouter.serverkey + ',worker')

    def closed(self, code, reason):
        print(("Closed down", code, reason))

    def received_message(self, m):
        user_msg = str(m).split(',',1)

        func_args =json.loads(user_msg[1])
        func = getattr(functions, func_args['func'])
        result = func(*func_args['args'], **func_args['kwargs'])
        self.send("%s,%s" % (user_msg[0], json.dumps(result)))

if __name__ == '__main__':
    try:
        ws = StreamingWorkerClient('ws://localhost:8080/ws')
        ws.daemon = False
        ws.connect()
    except:
        ws.close()

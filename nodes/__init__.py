# -*- coding: utf-8 -*-
import json
import os

from ws4py.client.threadedclient import WebSocketClient

SERVER_KEY = os.getenv('GEOWEBSOCKETKEY', 'aV64EBFjhYbhkeW0ETPGv43KGvBCYdO2Pq')

class WebSocketNode(WebSocketClient):

    def opened(self):
        registerData = {'target':SERVER_KEY, 'message':self.getName()}
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

        result = self.onMessage(data.get('message', ''))
        if result is not None:
            data['message'] = result
            self.send(json.dumps(data))

    def onMessage(self, message):
        raise NotImplementedError

# decorat
class WebSocketRPC(WebSocketNode):
    def onMessage(self, message):
        pass  # TODO:

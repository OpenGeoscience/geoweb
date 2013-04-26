# -*- coding: utf-8 -*-
from __init__ import WebSocketNode, NodeSlot, startNode

class EchoNode(WebSocketNode):

    def nodeFileName(self):
        return 'echo'

    @NodeSlot
    def echo(*args, **kwargs):
        return (args, kwargs)

if __name__ == '__main__':
    startNode(EchoNode)

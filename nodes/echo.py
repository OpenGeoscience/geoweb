# -*- coding: utf-8 -*-
from nodes import WebSocketNode, NodeSlot, startNode

class EchoNode(WebSocketNode):

    @NodeSlot
    def echo(*args, **kwargs):
        return (args, kwargs)

if __name__ == '__main__':
    startNode(EchoNode)

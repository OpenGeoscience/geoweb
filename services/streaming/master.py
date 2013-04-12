# -*- coding: utf-8 -*-
import argparse
import inspect
import json
import os
import random
import sys
import time
from array import array

import cdms2
import numpy
#from mpi4py import MPI
from ws4py.client.threadedclient import WebSocketClient

from geoweb import current_dir as webroot
from geowebsocket import WebSocketRouter

class functions(object):

    @staticmethod
    def start(websocket, userkey):

        if hasattr(websocket, 'processing') and websocket.processing:
            return

        websocket.processing = True

        data_file = '~/src/uvcdat/data/sample_data/clt.nc'

        print 'read data file'
        f = cdms2.open(data_file)
        clt = f['clt']

        print 'split data into regions'
        #need some hueristics to determine size of bins
        #just split into 10x10 regions for test
        latCoords = clt.getLatitude().getValue()
        lonCoords = clt.getLongitude().getValue()
        regionIndexes, xcount, ycount = get2DBins(latCoords, lonCoords, 10, 10)
        latBounds = [(latCoords[i1],latCoords[i2]) for (i1,i2,j1,j2) in regionIndexes]
        lonBounds = [(lonCoords[j1],lonCoords[j2]) for (i1,i2,j1,j2) in regionIndexes]
        latIndexs = [(i1,i2) for (i1,i2,j1,j2) in regionIndexes]
        lonIndexs = [(j1,j2) for (i1,i2,j1,j2) in regionIndexes]


        print 'get cpus'
        try:
            numcpus = determineNumberOfCPUs()
        except:
            numcpus = 8

        websocket.userdata[userkey] = {'i': 2,
                                       'xcount': xcount,
                                       'ycount': ycount,
                                       'latIndexs': latIndexs,
                                       'lonIndexs': lonIndexs}

        print "send first RPC call"
        funcData = {'func': 'region',
                    'args': [latIndexs[0],lonIndexs[0],0],
                    'kwargs': {'userkey':userkey}}
        websocket.send('%s,%s' % ('streamworker', json.dumps(funcData)))

        print "send second, so one is always on queue"
        funcData['args'] = [latIndexs[1],lonIndexs[1],1]
        websocket.send('%s,%s' % ('streamworker', json.dumps(funcData)))

    @staticmethod
    def region(websocket, clientkey, data, i, userkey):

        print "start next region processing"
        websocket.userdata[userkey] = {'i': 2,
                                       'xcount': xcount,
                                       'ycount': ycount,
                                       'latIndexs': latIndexs,
                                       'lonIndexs': lonIndexs}

        print "send next RPC call"
        i = websocket.userdata[userkey]['i']
        latIndexs = websocket.userdata[userkey]['latIndexs']
        lonIndexs = websocket.userdata[userkey]['lonIndexs']

        funcData = {'func': 'region',
                    'args': [latIndexs[0],lonIndexs[0],0],
                    'kwargs': {'userkey':userkey}}
        websocket.send('%s,%s' % ('streamworker', json.dumps(funcData)))

        print "send image data to user"
        xcount = websocket.userdata[userkey]['xcount']
        ycount = websocket.userdata[userkey]['ycount']
        w=150-1; #size of image
        h=100-1; #gets rid of 1px border
        y = int(i/ycount)
        x = i % ycount
        response = {'x':x*w, 'y':(xcount-y)*h, 'img':data}
        websocket.send('%s,%s' % (userkey, json.dumps(response)))

    @staticmethod
    def stop(websocket, userkey):
        websocket.send('%s,%s' % ('streamworker',
                                  json.dumps({'func':'stop','args':[],
                                              'kwargs':{}})))

class StreamingMasterClient(WebSocketClient):

    def opened(self):
        print "Master started"
        self.userdata = {}
        self.send(WebSocketRouter.serverkey + ',streammaster')

    def closed(self, code, reason):
        print(("Closed down", code, reason))

    def received_message(self, m):
        print "#message from user/client %s" % str(m)
        key_msg = str(m).split(',',1)

        func_args =json.loads(key_msg[1])
        func = getattr(functions, func_args['func'])
        func(self, key_msg[0], *func_args['args'], **func_args['kwargs'])

if __name__ == '__main__':
    try:
        ws = StreamingMasterClient('ws://localhost:8080/ws')
        ws.daemon = False
        ws.connect()
    except:
        ws.close()


def get2DBins(x,y,binSizeX,binSizeY):
    """Splits 2D region into bins

    Arguments
    x -> list of x coordinates
    y -> list of y coordinates
    binSizeX -> number of x coordinates in each bin
    binSizeY -> number of y coordinates in each bin

    returns: list of tuples, each containing the bounds indexes for bins
        in the format [(x1,x2,y1,y2),...]
    """

    result = []
    xlength = len(x)
    ylength = len(y)

    i=0
    xcount = 0
    for i1 in range(0,xlength,binSizeX):
        i2 = i1+binSizeX
        if i2 >= xlength:
            i2 = xlength-1
        xcount+=1
        ycount = 0
        for j1 in range(0,ylength,binSizeY):
            j2 = j1+binSizeY
            if j2 >= ylength:
                j2 = ylength-1
            result.append((i1,i2,j1,j2))
            ycount+=1
    return result, xcount, ycount

##
# From http://stackoverflow.com/a/1006301/1114724
import os,re,subprocess
def  determineNumberOfCPUs():
    """ Number of virtual or physical CPUs on this system, i.e.
    user/real as output by time(1) when called with an optimally scaling
    userspace-only program"""

    # Python 2.6+
    try:
        import multiprocessing
        return multiprocessing.cpu_count()
    except (ImportError,NotImplementedError):
        pass

    # http://code.google.com/p/psutil/
    try:
        import psutil
        return psutil.NUM_CPUS
    except (ImportError, AttributeError):
        pass

    # POSIX
    try:
        res = int(os.sysconf('SC_NPROCESSORS_ONLN'))

        if res > 0:
            return res
    except (AttributeError,ValueError):
        pass

    # Windows
    try:
        res = int(os.environ['NUMBER_OF_PROCESSORS'])

        if res > 0:
            return res
    except (KeyError, ValueError):
        pass

    # jython
    try:
        from java.lang import Runtime
        runtime = Runtime.getRuntime()
        res = runtime.availableProcessors()
        if res > 0:
            return res
    except ImportError:
        pass

    # BSD
    try:
        sysctl = subprocess.Popen(['sysctl', '-n', 'hw.ncpu'],
                                      stdout=subprocess.PIPE)
        scStdout = sysctl.communicate()[0]
        res = int(scStdout)

        if res > 0:
            return res
    except (OSError, ValueError):
        pass

    # Linux
    try:
        res = open('/proc/cpuinfo').read().count('processor\t:')

        if res > 0:
            return res
    except IOError:
        pass

    # Solaris
    try:
        pseudoDevices = os.listdir('/devices/pseudo/')
        expr = re.compile('^cpuid@[0-9]+$')

        res = 0
        for pd in pseudoDevices:
            if expr.match(pd) != None:
                res += 1

        if res > 0:
            return res
    except OSError:
        pass

    # Other UNIXes (heuristic)
    try:
        try:
            dmesg = open('/var/run/dmesg.boot').read()
        except IOError:
            dmesgProcess = subprocess.Popen(['dmesg'], stdout=subprocess.PIPE)
            dmesg = dmesgProcess.communicate()[0]

        res = 0
        while '\ncpu' + str(res) + ':' in dmesg:
            res += 1

        if res > 0:
            return res
    except OSError:
        pass

    raise Exception('Can not determine number of CPUs on this system')

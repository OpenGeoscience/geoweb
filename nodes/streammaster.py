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

from __init__ import WebSocketNode

this_dir = os.path.dirname(os.path.abspath(__file__))
temp_dir = os.path.abspath(os.path.join(this_dir, '../temp'))

logfile = None
def mylog(m):
    global logfile
    if logfile is None:
        logfile = open(os.path.join(temp_dir, "masterout.txt"), "a")
    logfile.write("%s\n" % m)
    logfile.flush()
# def mylog(m): pass

def get2DBins(x, y, binSizeX, binSizeY):
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

    i = 0
    xcount = 0
    for i1 in range(0, xlength, binSizeX):
        i2 = i1 + binSizeX
        if i2 >= xlength:
            i2 = xlength - 1
        xcount += 1
        ycount = 0
        for j1 in range(0, ylength, binSizeY):
            j2 = j1 + binSizeY
            if j2 >= ylength:
                j2 = ylength - 1
            result.append((i1, i2, j1, j2))
            ycount += 1
    return result, xcount, ycount

# #
# From http://stackoverflow.com/a/1006301/1114724
import re, subprocess
def  determineNumberOfCPUs():
    """ Number of virtual or physical CPUs on this system, i.e.
    user/real as output by time(1) when called with an optimally scaling
    userspace-only program"""

    # Python 2.6+
    try:
        import multiprocessing
        return multiprocessing.cpu_count()
    except (ImportError, NotImplementedError):
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
    except (AttributeError, ValueError):
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

class functions(object):

    @staticmethod
    def start(websocket, userkey, filename, varName, idx=0):

        try:

            if hasattr(websocket, 'processing') and websocket.processing:
                return

            websocket.processing = True

            mylog('read data file')
            cdmsFile = cdms2.open(filename)
            cdmsVar = cdmsFile[varName]

            mylog('split data into regions')
            # need some hueristics to determine size of bins
            # just split into 10x10 regions for test
            latCoords = cdmsVar.getLatitude().getValue()
            mylog('split data into regions')
            lonCoords = cdmsVar.getLongitude().getValue()
            mylog('split data into regions')
            regionIndexes, xcount, ycount = get2DBins(latCoords, lonCoords, 10, 10)
            mylog('split data into regions')
            latBounds = [(latCoords[i1], latCoords[i2]) for (i1, i2, j1, j2) in regionIndexes]
            mylog('split data into regions')
            lonBounds = [(lonCoords[j1], lonCoords[j2]) for (i1, i2, j1, j2) in regionIndexes]
            mylog('split data into regions')
            latIndexs = [(i1, i2) for (i1, i2, j1, j2) in regionIndexes]
            mylog('split data into regions')
            lonIndexs = [(j1, j2) for (i1, i2, j1, j2) in regionIndexes]


            mylog('get cpus')
            try:
                numcpus = determineNumberOfCPUs()
            except:
                numcpus = 8

            websocket.userdata[userkey] = {'nextIdx': idx + 2,
                                           'xcount': xcount,
                                           'ycount': ycount,
                                           'latIndexs': latIndexs,
                                           'lonIndexs': lonIndexs}

            mylog("send loadData RPC call")
            funcData = {'func': 'loadData',
                        'args': [filename, varName, userkey],
                        'kwargs': {}}
            websocket.send('%s,%s' % ('streamworker', json.dumps(funcData)))

            mylog("send first RPC call")
            funcData = {'func': 'region',
                        'args': [latIndexs[idx], lonIndexs[idx], idx],
                        'kwargs': {'userkey':userkey}}
            websocket.send('%s,%s' % ('streamworker', json.dumps(funcData)))

            mylog("send second, so one is always on queue")
            funcData['args'] = [latIndexs[idx + 1], lonIndexs[idx + 1], idx + 1]
            websocket.send('%s,%s' % ('streamworker', json.dumps(funcData)))
        except Exception, e:
            import traceback
            mylog(traceback.format_exc(None))
            try:
                cdmsFile.close()
            except:
                pass

    @staticmethod
    def region(websocket, clientkey, data, i, userkey):

        mylog("send next RPC call")
        if websocket.processing:
            latIndexs = websocket.userdata[userkey]['latIndexs']
            lonIndexs = websocket.userdata[userkey]['lonIndexs']
            idx = websocket.userdata[userkey]['nextIdx']
            if idx < len(latIndexs):
                fData = {'func': 'region',
                         'args': [latIndexs[idx], lonIndexs[idx], idx],
                         'kwargs': {'userkey':userkey}}
                websocket.userdata[userkey]['nextIdx'] = idx + 1
                websocket.send('%s,%s' % ('streamworker', json.dumps(fData)))
            else:
                websocket.processing = False
                websocket.send('%s,%s' % (userkey, 'done'))

        mylog("send image data to user")
        xcount = websocket.userdata[userkey]['xcount']
        ycount = websocket.userdata[userkey]['ycount']
        w = 150 - 1;  # size of image
        h = 100 - 1;  # gets rid of 1px border
        y = int(i / ycount)
        x = i % ycount
        response = {'x':x * w, 'y':(xcount - y) * h, 'img':data}
        websocket.send('%s,%s' % (userkey, json.dumps(response)))

    @staticmethod
    def stop(websocket, userkey):
        websocket.processing = False
        websocket.send('%s,%s' % (userkey, 'done'))

class StreamingMasterClient(WebSocketClient):

    def opened(self):
        mylog("Master started")
        self.userdata = {}
        self.send('register,streammaster')

    def closed(self, code, reason):
        mylog(("Closed down", code, reason))

    def received_message(self, m):
        mylog("#message from user/client %s" % str(m))
        key_msg = str(m).split(',', 1)

        if key_msg[0] == 'register':
            return

        func_args = json.loads(key_msg[1])
        func = getattr(functions, func_args['func'])
        func(self, key_msg[0], *func_args['args'], **func_args['kwargs'])

if __name__ == '__main__':
    try:
        ws = StreamingMasterClient('ws://localhost:8080/ws')
        ws.daemon = False
        ws.connect()
    except:
        ws.close()

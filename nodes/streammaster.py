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

from __init__ import WebSocketNode, NodeSlot, startNode

userdata = dict()

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

class StreamMaster(WebSocketNode):

    def nodeFileName(self):
        return 'streammaster'

    @NodeSlot
    def start(self, filename, varName, idx=0, bins={}, **axes):

        try:
            if hasattr(self, 'processing') and self.processing:
                return

            self.processing = True

            self.debug('read data file')
            cdmsFile = cdms2.open(filename)
            cdmsVar = cdmsFile(varName, **axes)

            self.debug('split data into regions')
            # need some hueristics to determine size of bins
            # just split into 10x10 regions for test
            latCoords = cdmsVar.getLatitude().getValue()
            lonCoords = cdmsVar.getLongitude().getValue()
            regionIndexes, xcount, ycount = get2DBins(latCoords, lonCoords, 10, 10)
            latBounds = [(latCoords[i1], latCoords[i2]) for (i1, i2, j1, j2) in regionIndexes]
            lonBounds = [(lonCoords[j1], lonCoords[j2]) for (i1, i2, j1, j2) in regionIndexes]
            latIndexs = [(i1, i2) for (i1, i2, j1, j2) in regionIndexes]
            lonIndexs = [(j1, j2) for (i1, i2, j1, j2) in regionIndexes]

            # self.debug('get cpus')
            try:
                numcpus = determineNumberOfCPUs()
            except:
                numcpus = 8

            userdata[self.sender] = {'nextIdx': idx + 2,
                                     'latIndexs': latIndexs,
                                     'lonIndexs': lonIndexs}

            self.debug("send loadData signal")
            self.signal('streamworker', 'loadData', filename, varName,
                         self.sender)

            self.debug("send first region signal")
            self.signal('streamworker', 'region', latIndexs[idx],
                         lonIndexs[idx], idx, userkey=self.sender)

            self.debug("send second, so one is always on queue")
            self.signal('streamworker', 'region', latIndexs[idx + 1],
                         lonIndexs[idx + 1], idx + 1, userkey=self.sender)

        except Exception, e:
            import traceback
            self.debug(traceback.format_exc(None))
            try:
                cdmsFile.close()
            except:
                pass

        return None

    @NodeSlot
    def region(self, data, i, userkey):

        if self.processing:
            latIndexs = userdata[userkey]['latIndexs']
            lonIndexs = userdata[userkey]['lonIndexs']
            idx = userdata[userkey]['nextIdx']
            if idx < len(latIndexs):
                self.signal('streamworker', 'region', latIndexs[idx],
                            lonIndexs[idx], idx, userkey=userkey)
                userdata[userkey]['nextIdx'] = idx + 1
            else:
                self.processing = False
                self.send(json.dumps({'target':userkey, 'message':'done'}))

        self.send(json.dumps({'target': userkey, 'message': {'data': data}}))
        return None

    @NodeSlot
    def stop(self):
        self.processing = False
        return 'done'

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


if __name__ == '__main__':
    startNode(StreamMaster)

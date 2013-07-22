    # -*- coding: utf-8 -*-
import os
import sys

import base64
import json
import os
from array import array
from uuid import uuid4

import cdms2
import cdutil
import numpy as np
import matplotlib as mpl
mpl.rcParams['mathtext.default'] = 'regular'
mpl.use('qt4agg')
import matplotlib.pyplot as plt
from mpl_toolkits.basemap import Basemap

from __init__ import WebSocketNode, NodeSlot, startNode, TEMP_DIR
from pvcdmsreader import PVCDMSReader

userdata = {}

_start_time = None
def starttime():
    from time import clock
    global _start_time
    _start_time = clock()

def stoptime(label):
    print "%s %s" % (label, str(clock() - _start_time))

# def starttime(): pass
# def stoptime(_): pass

class StreamWorker(WebSocketNode):

    def nodeFileName(self):
        return 'streamworker'

    @NodeSlot
    def loadData(self, filename, var, userkey, clevs=range(-1, 100, 10),
                 pre_cdutils=['setTimeBoundsMonthly'], cdutils=[('averager', [], {'axis': 't'})]):

        starttime()

        if userkey not in userdata:
            userdata[userkey] = {}
        f = cdms2.open(filename, 'r')
        userdata[userkey]['var'] = cdmsVar = f[var]
        userdata[userkey]['latCoords'] = cdmsVar.getLatitude().getValue()
        userdata[userkey]['lonCoords'] = cdmsVar.getLongitude().getValue()
        userdata[userkey]['clevs'] = clevs
        userdata[userkey]['pre_cdutils'] = pre_cdutils
        userdata[userkey]['cdutils'] = cdutils

        stoptime('loadData')

        return None

    @NodeSlot
    def region(self, latBounds, lonBounds, i, userkey):

        starttime()

        cdmsVar = userdata[userkey]['var']
        latCoords = userdata[userkey]['latCoords']
        lonCoords = userdata[userkey]['lonCoords']
        clevs = userdata[userkey]['clevs']

        # self.debug("get data for only this region")
        # need to expand bounds by one due to the difference in how
        # basemap and cdms work with bounds
        t = len(latCoords) - 1
        n = len(lonCoords) - 1
        a, b, c, d = latBounds[0], latBounds[1], lonBounds[0], lonBounds[1]
        regiondata = cdmsVar[:,
                             (a - 1 if a > 0 else a):(b + 1 if b < t else b),
                             (c - 1 if c > 0 else c):(d + 1 if d < n else d)]

        # self.debug("perform pre on data")
        for util in userdata[userkey]['pre_cdutils']:
            if hasattr(cdutil, util):
                f = getattr(cdutil, util)
                f(regiondata)

        for util in userdata[userkey]['cdutils']:
            functionName = util[0]
            if hasattr(cdutil, functionName):
                f = getattr(cdutil, functionName)
                args = util[1]
                kwargs = util[2]
                regiondata = f(regiondata, *args, **kwargs)

#        base64png = self.matPlotContour(regiondata, a, b, c, d, lonCoords,
#                                        lonBounds, latCoords, latBounds, clevs)
#        self.signal('streammaster', 'region', base64png, i, userkey)

        # print "convert to vtk image data"
        cv = PVCDMSReader()
        image_data = cv.convert(regiondata)

        # convert to poly data
        geom = vtk.vtkImageDataGeometryFilter()
        geom.SetInputData(image_data)
        geom.ReleaseDataFlagOn()

        # print "Convert to GeoJSON"
        gw = vtk.vtkGeoJSONWriter()
        gw.SetInputConnection(geom.GetOutputPort())
        gw.WriteToOutputStringOn()
        gw.Write()

        # // @todo: add pretty print option for JSON writer
        gj = str(gw.RegisterAndGetOutputString()).replace('\n', '')

        self.signal('streammaster', 'region', gj, i, userkey)

        # cleanup
        plt.clf()

        stoptime('region')

        return None

    def matPlotContour(self, _var, a, b, c, d, lonCoords, lonBounds,
                       latCoords, latBounds, clevs):
        # setup figure to have no borders
        fig = plt.figure(figsize=((d - c) * 0.15, (b - a) * 0.1), frameon=False)
        ax = plt.Axes(fig, [0., 0., 1., 1.])
        ax.set_axis_off()
        fig.add_axes(ax)

        # self.debug("plot using basemap")
        lons, lats = _var.getLongitude()[:], _var.getLatitude()[:]
        m = Basemap(projection='cyl', resolution='c',
                    llcrnrlon=lonCoords[lonBounds[0]],
                    llcrnrlat=latCoords[latBounds[0]],
                    urcrnrlon=lonCoords[lonBounds[1]],
                    urcrnrlat=latCoords[latBounds[1]], fix_aspect=False)
        x, y = m(*np.meshgrid(lons, lats))

        try:
            m.contourf(x, y, _var.asma(), clevs, cmap=plt.cm.RdBu_r, extend='both')
        except Exception, err:
            import traceback
            tb = traceback.format_exc()
            self.debug(tb)
            self.debug("Region lat(%d,%d) lon(%d,%d) faled" % (latBounds[0], latBounds[1], lonBounds[0], lonBounds[1]))

        m.drawcoastlines()

        # self.debug("save to temp file")
        temp_image_file = os.path.join(TEMP_DIR, '%s.png' % str(uuid4()))
        fig.savefig(temp_image_file, dpi=100)

        # self.debug("convert image data to base64")
        with open(temp_image_file, "rb") as temp_image:
            base64png = base64.b64encode(temp_image.read())

        os.remove(temp_image_file)

        return base64png

if __name__ == '__main__':
    startNode(StreamWorker)

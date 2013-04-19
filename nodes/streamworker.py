    # -*- coding: utf-8 -*-
import os
import sys

import base64
import cdutil
import json
import os
from array import array
from uuid import uuid4

import cdms2
import numpy as np
import matplotlib as mpl
mpl.rcParams['mathtext.default'] = 'regular'
mpl.use('qt4agg')
import matplotlib.pyplot as plt
from mpl_toolkits.basemap import Basemap

from nodes import WebSocketNode, NodeSlot, startNode

userdata = {}


class StreamWorker(WebSocketNode):

    @NodeSlot
    def loadData(filename, var, userkey):
        if userkey not in userdata:
            userdata[userkey] = {}
        f = cdms2.open(filename, 'r')
        userdata[userkey]['var'] = cdmsVar = f[var]
        userdata[userkey]['latCoords'] = cdmsVar.getLatitude().getValue()
        userdata[userkey]['lonCoords'] = cdmsVar.getLongitude().getValue()
        userdata[userkey]['clevs'] = range(-1, 100, 10)  # TODO: user defined
        return None

    @NodeSlot
    def region(latBounds, lonBounds, i, userkey):

        cdmsVar = userdata[userkey]['var']
        latCoords = userdata[userkey]['latCoords']
        lonCoords = userdata[userkey]['lonCoords']
        clevs = userdata[userkey]['clevs']

        mylog("get data for only this region")
        # need to expand bounds by one due to the difference in how
        # basemap and cdms work with bounds
        t = len(latCoords) - 1
        n = len(lonCoords) - 1
        a, b, c, d = latBounds[0], latBounds[1], lonBounds[0], lonBounds[1]
        regiondata = cdmsVar[:, (a - 1 if a > 0 else a):(b + 1 if b < t else b), (c - 1 if c > 0 else c):(d + 1 if d < n else d)]

        mylog("perform time average on data")
        cdutil.setTimeBoundsMonthly(regiondata)
        avg = cdutil.averager(regiondata, axis='t')

        # setup figure to have no borders
        fig = plt.figure(figsize=((d - c) * 0.15, (b - a) * 0.1), frameon=False)
        ax = plt.Axes(fig, [0., 0., 1., 1.])
        ax.set_axis_off()
        fig.add_axes(ax)

        mylog("plot using basemap")
        lons, lats = avg.getLongitude()[:], avg.getLatitude()[:]
        m = Basemap(projection='cyl', resolution='c',
                    llcrnrlon=lonCoords[lonBounds[0]],
                    llcrnrlat=latCoords[latBounds[0]],
                    urcrnrlon=lonCoords[lonBounds[1]],
                    urcrnrlat=latCoords[latBounds[1]], fix_aspect=False)
        x, y = m(*np.meshgrid(lons, lats))

        try:
            m.contourf(x, y, avg.asma(), clevs, cmap=plt.cm.RdBu_r, extend='both')
        except Exception, err:
            import traceback
            tb = traceback.format_exc()
            mylog(tb)
            mylog("Region lat(%d,%d) lon(%d,%d) faled" % (latBounds[0], latBounds[1], lonBounds[0], lonBounds[1]))

        m.drawcoastlines()

        mylog("save to temp file")
        temp_image_file = os.path.join(temp_dir, '%s.png' % str(uuid4()))
        fig.savefig(temp_image_file, dpi=100)

        mylog("convert image data to base64")
        with open(temp_image_file, "rb") as temp_image:
            base64png = base64.b64encode(temp_image.read())

        self.signal('StreamMaster', 'region', base64png, i, userkey)

        # cleanup
        plt.clf()
        os.remove(temp_image_file)

        return None

if __name__ == '__main__':
    startNode(StreamWorker)

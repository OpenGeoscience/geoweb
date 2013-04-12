# -*- coding: utf-8 -*-
import base64
import cdutil
import json
import os
from array import array
from uuid import uuid4

import cdms2
import cherrypy
import numpy as np
import matplotlib as mpl
mpl.rcParams['mathtext.default'] = 'regular'
mpl.use('qt4agg')
import matplotlib.pyplot as plt
from mpl_toolkits.basemap import Basemap
from ws4py.client.threadedclient import WebSocketClient

from geoweb import current_dir as webroot
from geowebsocket import WebSocketRouter

userdata = {}
class functions(object):

    @staticmethod
    def echo(*args, **kwargs):
        return (args, kwargs)

    @staticmethod
    def region(latBounds, lonBounds, i, userkey):
        if userkey not in userdata:
            userdata[userkey] = {}

            data_file = '~/src/uvcdat/data/sample_data/clt.nc' #TODO: user defined
            f = cdms2.open(data_file, 'r')
            clt = f['clt'] #TODO: user defined

            userdata[userkey]['latCoords'] = clt.getLatitude().getValue()
            userdata[userkey]['lonCoords'] = clt.getLongitude().getValue()
            userdata[userkey]['clevs'] = range(-1,100,10) #TODO: user defined


        latCoords = userdata[userkey]['latCoords']
        lonCoords = userdata[userkey]['lonCoords']
        clevs = userdata[userkey]['clevs']

        print "get data for only this region"
        #need to expand bounds by one due to the difference in how
        #basemap and cdms work with bounds
        t = len(latCoords)-1
        n = len(lonCoords)-1
        a,b,c,d = latBounds[0],latBounds[1],lonBounds[0],lonBounds[1]
        regiondata = clt[:,(a-1 if a>0 else a):(b+1 if b<t else b),(c-1 if c>0 else c):(d+1 if d<n else d)]

        print "perform time average on data"
        cdutil.setTimeBoundsMonthly(regiondata)
        avg = cdutil.averager(regiondata,axis='t')

        #setup figure to have no borders
        fig = plt.figure(figsize=((d-c)*0.15,(b-a)*0.1),frameon=False)
        ax = plt.Axes(fig, [0., 0., 1., 1.])
        ax.set_axis_off()
        fig.add_axes(ax)

        print "plot using basemap"
        lons, lats = avg.getLongitude()[:], avg.getLatitude()[:]
        m = Basemap(projection='cyl', resolution='c',
                    llcrnrlon=lonCoords[lonBounds[0]],
                    llcrnrlat=latCoords[latBounds[0]],
                    urcrnrlon=lonCoords[lonBounds[1]],
                    urcrnrlat=latCoords[latBounds[1]],fix_aspect=False)
        x, y = m(*np.meshgrid(lons, lats))

        try:
            m.contourf(x, y, avg.asma(), clevs, cmap=plt.cm.RdBu_r, extend='both')
        except Exception, err:
            import traceback
            tb = traceback.format_exc()
            print tb
            print "Region lat(%d,%d) lon(%d,%d) faled" % (latBounds[0],latBounds[1],lonBounds[0],lonBounds[1])

        m.drawcoastlines()

        print "save to temp file"
        temp_image_file = os.path.join(os.path.abspath(os.path.dirname(data_file)),'%s.png'%str(uuid4()))
        fig.savefig(temp_image_file,dpi=100)

        print "convert image data to base64"
        with open(temp_image_file, "rb") as temp_image:
            base64png = base64.b64encode(temp_image.read())

        funcData = {'func':'region', 'args':[base64png, i, userkey], 'kwargs':{}}

        #cleanup
        plt.clf()
        os.remove(temp_image_file)

        return funcData

class StreamingWorkerClient(WebSocketClient):

    def opened(self):
        print "Worker started"
        self.send(WebSocketRouter.serverkey + ',streamworker')

    def closed(self, code, reason):
        print(("Closed down", code, reason))

    def received_message(self, m):
        print "#message from user/client %s" % str(m)
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

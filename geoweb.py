#!/usr/bin/python

'''
  cherryd -i py -c py/app.conf
'''
import cherrypy
import simplejson
import os
import sys

current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(os.path.join(current_dir, "modules"))

from ws4py.server.cherrypyserver import WebSocketPlugin, WebSocketTool

import modules.geowebsocket #used by config
from services import ServiceRoot

from mako.template import Template
from mako.lookup import TemplateLookup
template_dir = os.path.dirname(os.path.abspath(__file__))
lookup = TemplateLookup(directories=[template_dir])

#make sure WebSocketPlugin runs after daemonizer plugin (priority 65)
#see cherrypy plugin documentation for default plugin priorities
WebSocketPlugin.start.__func__.priority = 66

#init websocket plugin
WebSocketPlugin(cherrypy.engine).subscribe()
cherrypy.tools.websocket = WebSocketTool()

# Utility functions
def empty_response():
  return {'result': None,
          'error' : None}

def empty_result():
  return {}

class Root(object):
    #vtk = VTKRoot(host='127.0.0.1', port=8080, ssl=False)

    services = ServiceRoot()

    @cherrypy.expose
    def mongo(self, *args, **kwargs):
      import mongo
      pargs = list(args)
      return mongo.run(*pargs, **kwargs)

    @cherrypy.expose
    def data(self, *args, **kwargs):
      import geodata
      pargs = list(args)
      return geodata.run(*pargs, **kwargs);

    @cherrypy.expose
    def ws(self):
        cherrypy.log("Handler created: %s" % repr(cherrypy.request.ws_handler))

if __name__ == '__main__':
    import os.path
    cherrypy.engine.start()
    cherrypy.engine.block()

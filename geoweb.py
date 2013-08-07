#!/usr/bin/python

'''
  cherryd -i py -c py/app.conf
'''
import cherrypy
import imp
import json
import os
import re
import sys

current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(os.path.join(current_dir, "modules"))
sys.path.append(os.path.join(current_dir, "modules", "thirdparty",
    "MyProxyClient-1.3.0"))

from ws4py.server.cherrypyserver import WebSocketPlugin, WebSocketTool

import modules.geowebsocket #used by config

from mako.template import Template
from mako.lookup import TemplateLookup
template_dir = os.path.dirname(os.path.abspath(__file__))
lookup = TemplateLookup(directories=[template_dir])

#render demo
from ogsvtk import VTKRoot

#make sure WebSocketPlugin runs after daemonizer plugin (priority 65)
#see cherrypy plugin documentation for default plugin priorities
WebSocketPlugin.start.__func__.priority = 66

#init websocket plugin
WebSocketPlugin(cherrypy.engine).subscribe()
cherrypy.tools.websocket = WebSocketTool()


# Utility functions
def empty_response():
    return {'result': None, 'error': None}


def empty_result():
    return {}

services = dict()


class Root(object):
    vtk = VTKRoot(host='127.0.0.1', port=8080, ssl=False)

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

    @cherrypy.expose
    def esgf(self, *args, **kwargs):
        import esgf
        return esgf.run(*args, **kwargs)

    @cherrypy.expose
    def default(self, *args, **kwargs):
        # If there are no positional arguments, abort
        if len(args) == 0:
            raise cherrypy.HTTPError(404)

        # Convert the args into a list (from a tuple).
        path = list(args)

        runningPath = current_dir

        response = {'result': None, 'error': None}

        def stripAllSpecial(str):
            pattern = re.compile('[\W]')
            return pattern.sub('', str)

        for i in range(len(path)):
            service = None
            runningPath = os.path.join(runningPath, path[i])

            if runningPath in services:
                service = services[runningPath]
            elif os.path.exists(runningPath + '.py'):
                try:
                    service = services[runningPath] = \
                        imp.load_source("__imp_%s__" %
                                        stripAllSpecial(runningPath),
                                        runningPath + '.py')
                except IOError as e:
                    error = "IOError: %s" % e
                    cherrypy.log(error)
                    response['error'] = error
                    return json.dumps(response)

            if service is not None:
                if hasattr(service, 'run'):
                    pathArgs = path[i+1:]
                    response['result'] = service.run(*pathArgs, **kwargs)
                    return json.dumps(response)
                else:
                    error = "`run` not defined in service %s" % runningPath
                    cherrypy.log(error)
                    response['error'] = error
                    return json.dumps(response)

        raise cherrypy.HTTPError(404)

if __name__ == '__main__':
    import os.path
    cherrypy.engine.start()
    cherrypy.engine.block()

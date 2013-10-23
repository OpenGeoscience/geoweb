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

from ws4py.server.cherrypyserver import WebSocketPlugin, WebSocketTool

import modules.geowebsocket #used by config for websockets

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


class Services(object):
    vtk = VTKRoot(host='127.0.0.1', port=8080, ssl=False)

    @cherrypy.expose
    def ws(self):
        cherrypy.log("Handler created: %s" % repr(cherrypy.request.ws_handler))

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
                    response['error'] = error
                    return json.dumps(response)

            if service is not None:
                if hasattr(service, 'run'):
                    pathArgs = path[i+1:]
                    try:
                        response = service.run(*pathArgs, **kwargs)
                        return response
                    except Exception, e:
                        error = str(e)
                        response['error'] = error
                        return json.dumps(response)
                else:
                    error = "`run` not defined in service %s" % runningPath
                    response['error'] = error
                    return json.dumps(response)

        raise cherrypy.HTTPError(404)

class Root(object):
    pass

import sys
run_path = os.path.dirname(os.path.abspath(sys.argv[0]))
# Load the configuration
server_config = "%s/server.conf" % run_path

cherrypy.tree.mount(Services(), '/', "%s/geoweb.conf" % run_path)

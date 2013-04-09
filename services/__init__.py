import os
import imp

import cherrypy
import json

service_dir = os.path.dirname(os.path.abspath(__file__))

class ServiceRoot(object):

    services = {}

    @cherrypy.expose
    def default(self, *args, **kwargs):
        # If there are no positional arguments, abort
        if len(args) == 0:
            raise cherrypy.HTTPError(404)

        # Convert the args into a list (from a tuple).
        path = list(args)

        #grab the first path arg
        service = path[0]

        response = {'result' : None, 'error' : None}

        if service not in ServiceRoot.services:
            try:
                fn = os.path.join(service_dir, service+'.py')
                ServiceRoot.services[service] = imp.load_source("service", fn)
            except IOError as e:
                error = "IOError: %s" % (e)
                cherrypy.log(error)
                response['error'] = error
                return json.dumps(response)

        if service in ServiceRoot.services:
            if hasattr(ServiceRoot.services[service], 'run'):
                pargs = path[1:]
                response['result'] = ServiceRoot.services[service].run(*pargs,
                                                                      **kwargs)
                return json.dumps(response)
            else:
                error = "`run` not defined in service %s" % (service)
                cherrypy.log(error)
                response['error'] = error
                return json.dumps(response)

        raise cherrypy.HTTPError(404)

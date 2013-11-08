import cherrypy
import geoweb
import json

def run(parameter= None):
    response = geoweb.empty_response()

    method = cherrypy.request.method

    if method == 'GET':
        response['result'] = {'value': cherrypy.session[parameter] }
    elif method == 'DELETE':
        cherrypy.session.clear()

    return json.dumps(response)
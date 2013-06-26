import requests
import libxml2
import uuid
import json
import cherrypy
import geoweb
import urlparse
import requests
import esgf.download
from esgf.download import status
from esgf.download import url_to_download_filepath
from esgf.query import query


streams = dict()

def run(method, url=None, size=None, checksum=None, user=None, password=None, expr=None, vars=None,
        streamId=None, cancel=False, taskId=None):
    response = geoweb.empty_response();

    if method == 'query':
        streamId = str(uuid.uuid1())
        streams[streamId] = query("http://pcmdi9.llnl.gov", expr)
        response['result'] = {'hasNext': True, 'streamId': streamId }
    elif method == 'stream':
        if cancel:
            if streamId in streams:
                del streams[streamId]
            response['result'] = {'hasNext': False}
        try:
            if streamId in streams:
                response['result'] = {'hasNext': True,
                                      'streamId': streamId,
                                      'data': [streams[streamId].next()] };
            else:
                response['result'] = {'hasNext': False}
        except StopIteration:
            response['result'] = {'hasNext': False}
    elif method == 'read':
        url = url.strip('"')
        read(url, user, password);
    elif method == "download":
        url = url.strip('"')
        r = esgf.download.download.delay(url, size, checksum, user, password);
        response['result'] = {'taskId': r.task_id}
    elif method == 'download_status':
        taskId = taskId.strip('"')
        response['result'] = status(taskId)
    elif method == 'filepath':
        response['result'] = {'filepath': url_to_download_filepath(user, url )}
    else:
        raise RuntimeError("illegal method '%s' in module 'esgf'" % (method))

    return json.dumps(response)

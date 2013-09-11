import requests
import libxml2
import uuid
import json
import cherrypy
import geojs
import urlparse
import requests
import esgf.download
from esgf.download import status
from esgf.download import url_to_download_filepath
from esgf.query import query


streams = dict()

def run(method, url=None, size=None, checksum=None, userUrl=None, password=None,
        queryId=None, expr=None, vars=None,streamId=None, cancel=False, taskId=None):
    response = geojs.empty_response();

    if url:
        url = url.strip('"')

    if userUrl:
        userUrl = userUrl.strip();

    if taskId:
        taskId = taskId.strip('"')

    if method == 'query':
        streamId = str(uuid.uuid1())
        streams[streamId] = query("http://pcmdi9.llnl.gov", expr)
        response['result'] = {'hasNext': True, 'streamId': streamId}
        if queryId:
            response['result']['queryId'] = int(queryId)
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

        if queryId:
            response['result']['queryId'] = int(queryId)
    elif method == 'read':
        read(url, user, password);
    elif method == "download":
        r = esgf.download.download.delay(url, size, checksum, userUrl, password);
        response['result'] = {'taskId': r.task_id}
    elif method == 'download_status':
        response['result'] = status(taskId)
    elif method == 'cancel_download':
        esgf.download.cancel(taskId)
    elif method == 'filepath':
        response['result'] = {'filepath': url_to_download_filepath(userUrl, url )}
    else:
        raise RuntimeError("illegal method '%s' in module 'esgf'" % (method))

    return json.dumps(response)

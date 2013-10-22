import requests
import libxml2
import uuid
import json
import cherrypy
import os

import geoweb
from urlparse import urlparse
import requests

from esgf.download import status
from esgf.download import url_to_download_filepath
from esgf.download import user_cert_file
import esgf.download
import esgf.registration
from esgf.query import query
from esgf.auth import authenticate

streams = dict()

def run(method, **kwargs):

    response = geoweb.empty_response();

    if method == 'query':
        streamId = str(uuid.uuid1())
        expr = kwargs['expr']
        base_url = cherrypy.session['ESGFBaseUrl']
        streams[streamId] = query(base_url, expr)
        response['result'] = {'hasNext': True, 'streamId': streamId}

        if 'queryId' in kwargs:
            response['result']['queryId'] = int(kwargs['queryId'])

    elif method == 'stream':
        streamId = None
        if 'streamId' in kwargs:
            streamId = kwargs['streamId']

        if 'cancel' in kwargs:
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

        if 'queryId' in kwargs:
            response['result']['queryId'] = int(kwargs['queryId'])
    elif method == 'read':
        url = kwargs['url'].strip('"')
        read(url);
    elif method == "download":
        user_url = cherrypy.session['username']
        url = kwargs['url'].strip('"')
        size = kwargs['size']
        checksum = kwargs['checksum']
        r = esgf.download.download.delay(url, size, checksum, user_url);
        response['result'] = {'taskId': r.task_id}
    elif method == 'download_status':
        response['result'] = status(**kwargs)
    elif method == 'cancel_download':
        esgf.download.cancel(**kwargs)
    elif method == 'filepath':
        user_url = cherrypy.session['username']
        url = kwargs['url'].strip('"')
        response['result'] = {'filepath': url_to_download_filepath(user_url, url)}
    elif method == 'registerGroups':
        response['result'] = {'groups': esgf.registration.register_groups(**kwargs)}
    elif method == 'register':
        response['result'] = {'success': esgf.registration.register_with_group(**kwargs)}
    else:
        raise RuntimeError("illegal method '%s' in module 'esgf'" % (method))

    return json.dumps(response)

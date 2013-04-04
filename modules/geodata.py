#!/usr/bin/python

import bson.json_util
import geoweb

def decode(s, argname, resp):
    try:
        return bson.json_util.loads(s)
    except ValueError as e:
        resp['error'] = e.message + " (argument '%s' was '%s')" % (argname, s)
        raise

def run(method='read', expr=None, vars=None, fields=None, imit=1000, sort=None, fill=None):
    # Create an empty response object.
    response = geoweb.empty_response();

    # Check the requested method.
    if method not in ['find', 'read']:
        response['error'] = "Unsupported data operation '%s'" % (method)
        return bson.json_util.dumps(response)

    # Decode the strings into Python objects.
    try:
        if expr is not None: expr = decode(expr, 'expr', response)
        if vars is not None: vars = decode(expr, 'vars', response)
        if fields is not None: vars = decode(fields, 'f', response)
        if expr is not None: expr = decode(expr, 'expr', response)
        if sort is not None: sort = decode(sort, 'sort', response)
        if fill is not None:
            fill = decode(fill, 'fill', response)
        else:
            fill = True
    except ValueError:
        return bson.json_util.dumps(response)

    # Cast the limit value to an int
    try:
        limit = int(limit)
    except ValueError:
        response['error'] = "Argument 'limit' ('%s') could not be converted to int." % (limit)
        return bson.json_util.dumps(response)

    # Perform the requested action.
    if method == 'find':
        # @todo This method should find the matching data on the server
        pass
    elif method == 'read':
        # Load reader module
        import reader
        it = reader.read(expr, vars)

        # Create a list of the results.
        if fill:
            results = [it]
        else:
            results = []

        # Create an object to structure the results.
        retobj = {}
        retobj['count'] = 1
        retobj['data'] = results

        # Pack the results into the response object, and return it.
        response['result'] = retobj
    else:
        raise RuntimeError("illegal method '%s' in module 'mongo'")

    # Return the response object.
    return bson.json_util.dumps(response)

#!/usr/bin/python

import bson.json_util
import geoweb

def decode(s, argname, response):
    try:
        return bson.json_util.loads(s)
    except ValueError as e:
        response['error'] = e.message + " (argument '%s' was '%s')" % (argname, s)

def run(method='read', expr=None, vars=None, time=None, fields=None, limit=1000, sort=None, fill=None):
    response = geoweb.empty_response()

    # Check the requested method.
    if method not in ['find', 'read']:
        raise Exception("Unsupported data operation '%s'" % (method))

    # Decode the strings into Python objects.
    try:
        if expr is not None: expr = decode(expr, 'expr', response)
        if vars is not None: vars = decode(vars, 'vars', response)
        if time is not None: time = decode(time, 'time', response)
        if fields is not None: fields = decode(fields, 'f', response)
        if sort is not None: sort = decode(sort, 'sort', response)
        if fill is not None:
            fill = decode(fill, 'fill', response)
        else:
            fill = True
    except ValueError:
        return json.dumps(response)

    # Cast the limit value to an int
    try:
        limit = int(limit)
    except ValueError:
        response['error'] =  "Argument 'limit' ('%s') could not be converted to int." % (limit)

    # Perform the requested action.
    if method == 'find':
        # @todo This method should find the matching data on the server
        pass
    elif method == 'read':
        # Load reader module
        import io.reader as reader
        try:
            it = reader.read(expr, vars, time)

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
        except IOError as io:
            raise io
    else:
        raise RuntimeError("illegal method '%s' in module 'mongo'")

    # Return the response object.
    return  json.dumps(response)

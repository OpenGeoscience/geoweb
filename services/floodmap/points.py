import cherrypy
import geoweb
from floodmap.tile import connect_to_mongo
import floodmap
from floodmap.config import *
from bson.objectid import ObjectId
from celery import Celery, group
from celery.result import GroupResult
import json
import uuid
import sys

try:
    celery = Celery()
    celery.config_from_object('floodmap.celeryconfig')
except:
    import traceback
    cherrypy.log(traceback.format_exc())

db = connect_to_mongo()

BATCH_SIZE = 50000

map = {'0_100000': '0_10',
       '0_050000': '0_05',
       '0_025000':'0_025'}

def find_points(bbox, rise, res, batch_size = BATCH_SIZE,  batch = 0):
    try:
        # Need to convert [lowerLeft, upperRight] into enclosing polygon
        bbox = [bbox[0], [bbox[0][0], bbox[1][1]],
                bbox[1], [bbox[1][0], bbox[0][1]],  bbox[0]]

        cherrypy.log(str(bbox))
        res = "%.6f" % res
        res = res.replace('.', '_')

        # Hack fo miss named collection, FIXME s
        if res in map:
          res = map[res]

        collection = "hgt.%s" % res

        cherrypy.log("coll: %s" % collection)

        cherrypy.log("batch: %d" % batch)

        query = {
                  "tile": {
                    "$geoIntersects": {
                      "$geometry": {
                        "type": "Polygon",
                        "coordinates": [bbox]
                      }
                    }
                  }
                }

        proj = {}

        if rise:
            query["tile.properties.elevation"] = { "$lt": rise }
            proj['_id'] = 1,
            proj['tile.coordinates'] = 1,
            proj['tile.properties.elevation'] = 1

        results = db[collection].find(
            query, proj).skip(batch*batch_size).limit(batch_size)
    except:
         import traceback
         cherrypy.log(traceback.format_exc())


    return results

def to_geojson(points):
    geojson = {"type": "FeatureCollection", "features": [{
                 "type": "MultiPoint",
                 "coordinates": points
              }]}

    return geojson

try:
    import pcl
    import numpy as np
# If we don't have pcl or numpy install then  don't do the filtering
except ImportError:
    cherrypy.log("[warn] Skipping outlier filter as PCL is not available.")
    pcl = None

def remove_outliers(points):
    # If we don't have pcl install then  don't do the filtering
    if not pcl:
        return points

    p = pcl.PointCloud()
    p.from_list(points)

    fil = p.make_statistical_outlier_filter()
    fil.set_mean_k(50)
    fil.set_std_dev_mul_thresh (2.0)
    points = fil.filter().to_list()

    return points

def points(id, bbox, rise, res, batch):

    try:
        bbox = json.loads(bbox)
        rise = int(rise)
        batch = int(batch)
        res = float(res)

        if not id:
            id = uuid.uuid4()

        cherrypy.log("course points")

        points = []
        raw_points = find_points(bbox, rise, res, BATCH_SIZE, batch)

        for point in raw_points:
            elevation = point['tile']['properties']['elevation']
            coordinates = point['tile']['coordinates']
            coordinates.append(elevation)
            points.append(coordinates)

        points = remove_outliers(points)

        response = geoweb.empty_response()
        geojson = to_geojson(points)

        has_more = True

        if len(points) == 0 or len(points) < BATCH_SIZE:
            has_more = False


        response['result'] = {'id': str(id),
                              'hasMore': has_more,
                              'res': res,
                              'batch': batch + 1,
                              'geoJson': geojson}
    except:
        import traceback
        cherrypy.log(traceback.format_exc())

    return response


def count_points(bbox, res, limit=1):
    bbox = json.loads(bbox)
    res = float(res)
    response = geoweb.empty_response()

    count = find_points(bbox, None, res, limit, 0).count(True)

    response['result'] = {'count': count}

    return response

def cancel(id):
    pass

def run(*pargs, **kwargs):

    method = cherrypy.request.method
    # GET /floodmap/<id>/points
    # {
    #  result: {id: <id>, geoJson: <points>,
    #  hasMore: <true|false> }
    # }
    if method == 'GET':
        if len(pargs) == 1 and pargs[0] == 'count':
            cherrypy.log("here")
            response = count_points(**kwargs)
        elif len(kwargs) > 1:
            response = points(**kwargs)
        else:
            response = geoweb.empty_response();
            response['error'] =  "Invalid GET request"
    else:
        response = geoweb.empty_response();
        response['error'] =  "Unsupported HTTP method"

    return json.dumps(response)





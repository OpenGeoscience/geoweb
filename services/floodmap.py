import cherrypy
import geoweb
from floodmap.tile import connect_to_mongo
import floodmap
from floodmap.config import *
from bson.objectid import ObjectId
from celery import Celery, group
from celery.result import GroupResult
import json

try:
    celery = Celery()
    celery.config_from_object('floodmap.celeryconfig')
except:
    import traceback
    cherrypy.log(traceback.format_exc())

db = connect_to_mongo()

bb = [[-80.4845, 34.9813], [-80.4845, 48.7153], [-65.4894, 48.7153],[-65.4894, 34.9813],[-80.4845, 34.9813]]
#bb = [[-75.0, 40.5], [-75.0, 41.5], [-73.0, 41.5], [-73.0, 40.5], [-75.0, 40.5]]

def find_tiles():
    cherrypy.log("Finding tiles")
    results = db.hgt.find({"tile": {"$geoIntersects": { "$geometry": { "type": "Polygon",
                                                                       "coordinates": [bb]}}}}, {'_id': 1})

    cherrypy.log("Got tiles:")

    return results

def to_geojson(points):
    geojson = {"type": "FeatureCollection", "features": [{
                 "type": "MultiPoint",
                 "coordinates": points
              }]}

    return geojson


def generate(bbox, rise):

#     response = geoweb.empty_response();
#     response['result'] = {'id': 'test'}
#
#     return response

    try:
        cherrypy.log("Creating group")
        group_result = group(floodmap.tile.process_tile.s(bb, rise, str(doc['_id'])) for doc in find_tiles()).apply_async()
        group_result.save(backend=celery.backend)
        cherrypy.log("Done")
        response = geoweb.empty_response();
        response['result'] = {'id': group_result.id}
    except:
        import traceback
        cherrypy.log(traceback.format_exc())

    cherrypy.log("response: %s" % str(response))

    return response

count = 1

def points(id):
#     cherrypy.log("In points ...")
#
#     with open('/tmp/points1.json', 'r') as fp:
#         geojson = json.load(fp)
#
#     response = geoweb.empty_response();
#     response['result'] = {'id': id,
#                           'hasMore': False,
#                           'geoJson': geojson}
#
#     return response

    try:
        results = db[FLOODMAP_RESULT_COLLECTION].find({'group_id': id}, limit=FLOODMAP_POINT_QUERY_LIMIT)

        points = []
        ids_to_delete = []
        result_count = 0
        for tile_result in results:
          ids_to_delete.append(tile_result['_id'])
          points = points + tile_result['points']
          result_count += 1


        cherrypy.log("Removing: " + str(ids_to_delete))

        db[FLOODMAP_RESULT_COLLECTION].remove({'_id': {'$in': ids_to_delete}})

        response = geoweb.empty_response();

        geoJson = None
        cherrypy.log("Got %d point" % len(points))

        if len(points) > 0:
            geoJson = to_geojson(points)

        group_result = GroupResult.restore(id, backend=celery.backend)

        cherrypy.log("group_result: " + group_result.id)

        hasMore = True

        if result_count < FLOODMAP_POINT_QUERY_LIMIT and group_result.ready():
            hadMore = False
            cherrypy.log("deleting group")
            group_result.delete()

        response['result'] = {'id': id,
                              'hasMore': hasMore,
                              'geoJson': geoJson}
    except:
        import traceback
        cherrypy.log(traceback.format_exc())
#     global count
#     try:
#         with open('/tmp/points%d.json' % count, 'w') as fp:
#             fp.write(json.dumps(geoJson))
#         count += 1
#     except:
#         import traceback
#         cherrypy.log(traceback.format_exc())

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
        response = points(*pargs)
    # POST /floodmap?bbox=<bbox>&seaLevelChange=<seaLevelChange>
    # {id: <id>}
    elif method == 'POST':
        response = generate(**kwargs)
    # DELETE /floodmap/<id>
    elif method == 'DELETE':
        response = cancel(*pargs)
    else:
        response = geoweb.empty_response();
        response['error'] =  "Unsupported HTTP method"

    return json.dumps(response)

def calculate(bb, sea_level_rise):
    with open("/tmp/small.json") as fp:
        geojson = json.load(fp)

    return geojson

def next(id):
    pass

def cancel(id):
    pass






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

def find_tiles(bbox, rise):
    cherrypy.log("Finding tiles")
    cherrypy.log("rise: %d" % int(rise))
    results = db.hgt.find({"tile": {"$geoIntersects": { "$geometry": { "type": "Polygon",
                                                                       "coordinates": [bbox]}}},
                                   "tile.properties.minElevation": {"$lt": rise}}, {'_id': 1})

    cherrypy.log("Got tiles: %d" % results.count())

    return results


map = {'0_100000': '0_10',
       '0_050000': '0_05',
       '0_025000':'0_025'}

def find_course_tiles(bbox, rise, res, batch_size = BATCH_SIZE,  batch = 0):
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

total_points = 0

def generate(bbox, rise):

    cherrypy.log(bbox)
    bbox = json.loads(bbox)
    rise = int(rise)



#     response = geoweb.empty_response();
#     response['result'] = {'id': 'test'}
#
#     return response
    global total_points
    total_points = 0
    try:
        cherrypy.log("Creating group: host: %s, port: %d" % (celery.backend.host, celery.backend.port))

        group_result = group(floodmap.tile.process_tile.s(bbox, int(rise), str(doc['_id'])) for doc in find_tiles(bbox, rise)).apply_async()
        group_result.save(backend=celery.backend)

        cherrypy.log(group_result.id)

        cherrypy.log("Done")
        response = geoweb.empty_response();
        response['result'] = {'id': group_result.id}
    except:
        import traceback
        cherrypy.log(traceback.format_exc())

    cherrypy.log("response: %s" % str(response))

    return response

count = 1

def course_points(id, bbox, rise, res, batch):

    try:
        bbox = json.loads(bbox)
        rise = int(rise)
        batch = int(batch)
        res = float(res)

        if not id:
            id = uuid.uuid4()

        cherrypy.log("course points")

        points = []
        raw_points = find_course_tiles(bbox, rise, res, BATCH_SIZE, batch)

        for point in raw_points:
            elevation = point['tile']['properties']['elevation']
            coordinates = point['tile']['coordinates']
            coordinates.append(elevation)
            points.append(coordinates)


        cherrypy.log("points size: %d" % len(points))

        #points = points[:50000]
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


def points(id):
    cherrypy.log("In points ...")

#     with open('/tmp/points1.json', 'r') as fp:
#         geojson = json.load(fp)
#
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
        global total_points
        total_points += len(points)
        cherrypy.log("Total points %d" % total_points)



        if len(points) > 0:
            geoJson = to_geojson(points)

        group_result = GroupResult.restore(id, backend=celery.backend)

        hasMore = True

        if result_count < FLOODMAP_POINT_QUERY_LIMIT and \
           (not group_result or (group_result and group_result.ready())):
            hasMore = False
            cherrypy.log("deleting group")

            if group_result:
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

def count_points(bbox, res, limit=1):
    bbox = json.loads(bbox)
    res = float(res)
    response = geoweb.empty_response()

    count = find_course_tiles(bbox, None, res, limit, 0).count(True)

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
            response = course_points(**kwargs)
        else:
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





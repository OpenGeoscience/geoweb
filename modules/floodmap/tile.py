from floodmap.config import *
import re
import numpy as np
import os
import zipfile
import sys
from pymongo import MongoClient
from celery import Celery
import pickle
from bson.binary import Binary
from bson.objectid import ObjectId
import cPickle
import gridfs
import json
import floodmap.celeryconfig

from shapely.geometry import Polygon, Point

pixel_size = 1.0/1200.0

increase = 20

celery = Celery()
celery.config_from_object('floodmap.celeryconfig')

def to_feature(point):
    return {"type": "Feature", \
            "geometry": {"type": "Point", \
                          "coordinates": point[0]}, \
                          "properties": {"elevation": point[1]} \
                         }

def connect_to_mongo():
    connection = MongoClient(FLOODMAP_MONGO_HOSTNAME)
    db = connection[FLOODMAP_MONGO_DATABASE]
    return db

db = connect_to_mongo()

@celery.task
def process_tile(bb, tile):
    flood_points = []

    import sys
    print >> sys.stderr, "process_tile"

    # If the min elevation is greater than the change we can skip this tile
    if tile['properties']['minElevation'] > increase:
        return flood_points

    poly = Polygon(bb)
    elevations = cPickle.loads(tile['properties']['elevations'])

    origin = tile['coordinates'][0][0]

    it = np.nditer(elevations, flags=['f_index', 'multi_index'])
    while not it.finished:
        coord = [origin[0] + (pixel_size*it.multi_index[1]),
                 origin[1] + (pixel_size*it.multi_index[0])]

        elev= np.asscalar(it[0])

        point = Point(coord)

        if poly.contains(point) and elev > 0 and elev <= increase:
            point = [coord, elev]
            #flood_points.append(to_feature(point))
            flood_points.append(coord)

        it.iternext()

    if len(flood_points) == 0:
      return

    results = db[FLOODMAP_RESULT_COLLECTION]

    # Key off the group id
    results.insert({'group_id': process_tile.request.group, 'points': flood_points})

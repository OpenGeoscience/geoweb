import json

def calculate(bb, sea_level_rise):
    with open("/tmp/small.json") as fp:
        geojson = json.load(fp)

    return geojson

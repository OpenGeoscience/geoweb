#!/usr/bin/python

import pymongo
import sys

class mongo_delete:
  def delete_collection(seff, server, database, collection):

    conn = pymongo.Connection(server)
    db = conn[database]
    coll = db[collection]

    coll.remove()

if __name__ == "__main__":
  import sys
  print sys.argv
  if (len(sys.argv) < 4):
    print "usage: mongoDeleteCollection.py server database collection"
    sys.exit(1)

  server = sys.argv[1]
  database = sys.argv[2]
  coll = sys.argv[3]

  ins = mongo_delete()
  ins.delete_collection(server, database, coll)

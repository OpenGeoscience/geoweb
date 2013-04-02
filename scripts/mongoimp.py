import pymongo
import os

class mongo_import:
  def import_directory(seff, server, database, collection, directory):
    if (not (os.path.isdir(directory) and os.path.exists(directory))):
      raise Exception("Directory " + directory + " does not exist")

    conn = pymongo.Connection(server)
    db = conn[database]
    coll = db[collection]

    # Collect filenames under the directory
    from os import listdir
    from os.path import isfile, join
    files = [ f for f in listdir(directory) if isfile(join(directory,f)) ]

    # Add files to the database
    for filename in files:
      basename = os.path.basename(filename)
      fileprefix = os.path.splitext(basename)[0]
      insertId = coll.insert({"name":fileprefix, "basename":basename})

if __name__ == "__main__":
  import sys
  print sys.argv
  if (len(sys.argv) < 5):
    print "usage: import_data server database collection directory"
    sys.exit(1)

  server = sys.argv[1]
  database = sys.argv[2]
  coll = sys.argv[3]
  directory = sys.argv[4]

  ins = mongo_import()
  ins.import_directory(server, database, coll, directory)

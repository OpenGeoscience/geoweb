#!/usr/bin/python

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
      variables = []
      basename = os.path.basename(filename)
      filenamesplitted = os.path.splitext(basename)
      fileprefix = filenamesplitted[0]
      filesuffix = filenamesplitted[1]
      if filesuffix == ".nc":
        import vtk
        reader = vtk.vtkNetCDFReader()
        reader.SetFileName(os.path.join(directory, filename))
        reader.Update()
        data = reader.GetOutput();
        pds = data.GetPointData()
        pdscount = pds.GetNumberOfArrays()
        for i in range(0, pdscount):
          variable = {}
          pdarray = pds.GetArray(i)
          variable["name"] = pdarray.GetName()
          variable["dim"] = []
          variable["time"] = []
          variable["tags"] = []
          variables.append(variable)

      insertId = coll.insert({"name":fileprefix, "basename":basename, "variables":variables})

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

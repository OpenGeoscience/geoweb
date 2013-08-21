#!/usr/bin/python

import pymongo
import os
import sys

current_dir = os.path.dirname(os.path.abspath(__file__))
modules_dir = os.path.join(current_dir, "..", "modules")
sys.path.append(modules_dir)

from standardtime import attrib_to_converters

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
      print 'Working on %s' % filename
      variables = []
      basename = os.path.basename(filename)
      filenamesplitted = os.path.splitext(basename)
      fileprefix = filenamesplitted[0]
      filesuffix = filenamesplitted[1]
      if filesuffix == ".nc":
        import vtk
        reader = vtk.vtkNetCDFCFReader()
        reader.SphericalCoordinatesOff()
        reader.SetOutputTypeToImage()
        reader.ReplaceFillValueWithNanOn()
        reader.SetFileName(os.path.join(directory, filename))
        reader.Update()
        data = reader.GetOutput()

        #obtain spatial information
        bounds = data.GetBounds()

        #obtain temporal information
        timeInfo = {}
        times = reader.GetOutputInformation(0).Get(vtk.vtkStreamingDemandDrivenPipeline.TIME_STEPS())
        timeInfo['rawTimes'] = times #time steps in raw format
        tunits = reader.GetTimeUnits()
        timeInfo['units'] = tunits #calendar info needed to interpret/convert times
        converters = attrib_to_converters(tunits)
        if converters and times:
            timeInfo['numSteps'] = len(times)

            nativeStart = converters[3]
            timeInfo['nativeStart'] = nativeStart
            stepUnits = converters[2]
            timeInfo['nativeUnits'] = stepUnits
            stepSize = 0
            if len(times) > 1:
              stepSize = times[1]-times[0]
            timeInfo['nativeDelta'] = stepSize
            stdTimeRange = (converters[0](times[0]), converters[0](times[-1]))
            timeInfo['nativeRange'] = (times[0], times[-1])

            stdTimeDelta = 0
            if len(times) > 1:
                stdTimeDelta = converters[0](times[1]) - converters[0](times[0])
            timeInfo['stdDelta'] = stdTimeDelta
            stdTimeRange = (converters[0](times[0]), converters[0](times[-1]))
            timeInfo['stdTimeRange'] = stdTimeRange #first and last time as normalized integers

            dateRange = (converters[1](stdTimeRange[0]), converters[1](stdTimeRange[1]))
            timeInfo['dateRange'] = dateRange #first and last time in Y,M,D format

        #obtain array information
        pds = data.GetPointData()
        pdscount = pds.GetNumberOfArrays()
        if times == None:
            times = [0]
        #go through all timesteps to accumulate global min and max values
        for t in times:
            firstTStep = t==times[0]
            arrayindex = 0
            #go through all arrays
            for i in range(0, pdscount):
                pdarray = pds.GetArray(i)
                if not pdarray:
                    # got an abstract array
                    continue
                if firstTStep:
                    #create new record for this array
                    variable = {}
                else:
                    #extend existing record
                    variable = variables[arrayindex]
                #tell reader to read data so that we can get info about this time step
                sddp = reader.GetExecutive()
                sddp.SetUpdateTimeStep(0,t)
                sddp.Update()
                arrayindex = arrayindex + 1
                if firstTStep:
                    #record unchanging meta information
                    variable["name"] = pdarray.GetName()
                    variable["dim"] = []
                    variable["tags"] = []
                    variable["units"] = reader.QueryArrayUnits(pdarray.GetName())
                # find min and max for each component of this array at this timestep
                componentCount = pdarray.GetNumberOfComponents()
                minmax = []
                for j in range(0, componentCount):
                    minmaxJ = [0,-1]
                    pdarray.GetRange(minmaxJ, j)
                    minmax.append(minmaxJ[0])
                    minmax.append(minmaxJ[1])
                if firstTStep:
                    #remember what we learned about this new array
                    variable["range"] = minmax
                    variables.append(variable)
                else:
                    #extend range if necessary from this timesteps range
                    for j in range(0, componentCount):
                        if minmax[j*2+0] < variable["range"][j*2+0]:
                            variable["range"][j*2+0] = minmax[j*2+0]
                        if minmax[j*2+1] > variable["range"][j*2+1]:
                            variable["range"][j*2+1] = minmax[j*2+1]

        #record what we've learned in the data base
        insertId = coll.insert({"name":fileprefix, "basename":basename,
                                "variables":variables,
                                "timeInfo":timeInfo,
                                "spatialInfo":bounds})

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

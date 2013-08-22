#!/usr/bin/python

import pymongo

# Import Python modules
import os
import sys

# Import vtk
import vtk

current_dir = os.path.dirname(os.path.abspath(__file__))
modules_dir = os.path.join(current_dir, "..", "modules")
sys.path.append(modules_dir)

from standardtime import attrib_to_converters

class mongo_import:
    def __init__(self, server, database):
        self._connection = pymongo.Connection(server)
        self._db = self._connection[database]

    def import_file(self, collection, filename):
        """Import metadata from a filename into the database

        This method reads a filename (fullpath) for its metadata
        and stores it into the specified collection of the database.

        :param collection: Name of the collection to look for basename.
        :type collection: str.
        :param filename: Name of the file with fullpath (eg. /home/clt.nc).
        :type filename: str.
        """
        if (not (os.path.isfile(filename) and os.path.exists(filename))):
            raise Exception("File " + filename + " does not exist")

        # @note Assuming that getting mongo collection everytime
        # is not going to cause much performance penalty
        coll = self._db[collection]

        print 'Begin importing %s into database' % filename
        variables = []
        basename = os.path.basename(filename)
        filenamesplitted = os.path.splitext(basename)
        fileprefix = filenamesplitted[0]
        filesuffix = filenamesplitted[1]

        if filesuffix == ".nc":
            reader = vtk.vtkNetCDFCFReader()
            reader.SphericalCoordinatesOff()
            reader.SetOutputTypeToImage()
            reader.ReplaceFillValueWithNanOn()
            reader.SetFileName(filename)
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
            stdTimeRange = None
            dateRange = None

        if converters and times:
            stdTimeRange = (converters[0](times[0]),converters[0](times[-1]))
            timeInfo['stdTimeRange'] = stdTimeRange #first and last time as normalized integers
            dateRange = (converters[1](stdTimeRange[0]), converters[1](stdTimeRange[1]))
            timeInfo['dateRange'] = dateRange #first and last time in Y,M,D format
            print filename, "tunits:", tunits, "times: ", times, "std time range:", stdTimeRange, "dates: ", dateRange

        #obtain array information
        pds = data.GetPointData()
        pdscount = pds.GetNumberOfArrays()
        for i in range(0, pdscount):
            variable = {}
            pdarray = pds.GetArray(i)
            if not pdarray:
                # got an abstract array
                continue
            variable["name"] = pdarray.GetName()
            variable["dim"] = []
            variable["tags"] = []
            variable["units"] = reader.QueryArrayUnits(pdarray.GetName())
            # todo: iterate over all timesteps, default (first) timestep may not be representative
            variable["time"] = []
            componentCount = pdarray.GetNumberOfComponents()
            minmax = []
            for j in range(0, componentCount):
                minmaxJ = [0,-1]
                pdarray.GetRange(minmaxJ, j)
                minmax.append(minmaxJ[0])
                minmax.append(minmaxJ[1])
            variable["range"] = minmax
            variables.append(variable)

        #record what we've learned
        insertId = coll.insert({"name":fileprefix, "basename":basename,
                                "variables":variables,
                                "timeInfo":timeInfo,
                                "spatialInfo":bounds})
        print 'Done importing %s into database' % filename

    def import_directory(self, collection, directory, drop_existing=False):
        """Import metadata from files of a directory into the database

        This method reads all of the files that belong to a directory
        for its metadata and stores it into the specified collection of
        the database.

        :param collection: Name of the collection to look for basename.
        :type collection: str.
        :param directory: Full path to the directory.
        :type directory: str.
        """
        if (not (os.path.isdir(directory) and os.path.exists(directory))):
          raise Exception("Directory " + directory + " does not exist")

        # Gather all files in the directory
        from os import listdir
        from os.path import isfile, join
        files = [f for f in listdir(directory) if isfile(join(directory,f))]

        # Check if requested to drop existing collection
        if drop_existing:
            self._db.drop_collection(collection)

        # Add files to the database
        for filename in files:
            self.import_file(collection, os.path.join(directory, filename))

    def is_exists(self, collection, basename):
        """Check if a basename exists in the given collection of the database.

        :param collection: Name of the collection to look for basename.
        :type collection: str.
        :param basename: Name of the file (eg. clt.nc).
        :type basename: str.
        :returns:  bool -- True if exists False otherwise.
        """
        if not(self._connection and self._db):
            coll = self._db[collection]
            if (coll.find({"basename": basename}).count() > 0):
                return True
            return False

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

    ins = mongo_import(server, database)
    ins.import_directory(coll, directory, True)

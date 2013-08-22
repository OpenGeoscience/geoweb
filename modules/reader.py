# Python imports
import os
import sys

# CherryPy imports
import cherrypy

# PyGeo imports
import geoweb
import mongoimp

current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(os.path.join(current_dir))

def read(expr, vars, time):
  if expr is None:
    return geoweb.empty_result()

  # Check if the data exists in the database. If not then perform
  # a import to extract the metadata
  dbimport = mongoimp.mongo_import()

  # @todo Provide means to configure this
  dbimport.connect("localhost", "documents")
  if not dbimport.is_exists("files", expr):
    datadir = cherrypy.request.app.config['/data']['tools.staticdir.dir']
    filename = os.path.join(datadir, expr)
    dbimport.import_file(filename)

  # @todo Implement plugin mechanism to ask each reader if they can
  # read this file for now read using the vtk_reader
  import vtk_reader
  return vtk_reader.read(expr, vars, time)

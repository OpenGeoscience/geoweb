import cherrypy
import os

vtkOK = False
try:
  import vtk
  vtkOK = True
except ImportError:
  raise Exception("[error] VTK is not available")

def can_read():
  return True

def read(expr, vars):
  ''' Read a file or files from a directory given a wild-card expression
  '''
  # @todo Reading a single file of netcdf cf convention now
  ss = vtk.vtkNetCDFCFReader() #get test data
  ss.SphericalCoordinatesOff()
  ss.SetOutputTypeToImage()
  datadir = cherrypy.request.app.config['/data']['tools.staticdir.dir']
  filename = os.path.join(datadir, expr)
  ss.SetFileName(filename)

  # Convert to polydata
  sf = vtk.vtkDataSetSurfaceFilter()
  sf.SetInputConnection(ss.GetOutputPort())
  sf.Update()

  # Error reading file?
  if not sf.GetOutput():
    raise IOError("Unable to load data file: " + filename)

  # Convert to GeoJSON
  gw = vtk.vtkGeoJSONWriter()
  gw.SetInputConnection(sf.GetOutputPort())
  gw.WriteToOutputStringOn()
  gw.Write()
  gj = str(gw.RegisterAndGetOutputString()).replace('\n','')
  return gj

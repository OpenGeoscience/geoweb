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

  #tlog = vtk.vtkTimerLog()
  #t0 = tlog.GetUniversalTime()
  ss = vtk.vtkNetCDFCFReader() #get test data
  ss.SphericalCoordinatesOff()
  ss.SetOutputTypeToImage()
  datadir = cherrypy.request.app.config['/data']['tools.staticdir.dir']
  filename = os.path.join(datadir, expr)
  ss.SetFileName(filename)
  #ss.Update()
  #t1 = tlog.GetUniversalTime()

  # Convert to polydata
  sf = vtk.vtkDataSetSurfaceFilter()
  sf.SetInputConnection(ss.GetOutputPort())
  #sf.Update()
  #t2 = tlog.GetUniversalTime()

  # Convert to GeoJSON
  gw = vtk.vtkGeoJSONWriter()
  gw.SetInputConnection(sf.GetOutputPort())
  gw.WriteToOutputStringOn()
  gw.SetScalarFormat(2)
  gw.Write()
  gj = str(gw.RegisterAndGetOutputString()).replace('\n','')
  #t3 = tlog.GetUniversalTime()

  #cherrypy.log("VTKTIME: " + str(t1-t0) + " + " + str(t2-t1) + " + " + str(t3-t2))
  return gj

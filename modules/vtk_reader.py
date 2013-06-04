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

def read(expr, vars, time):
  ''' Read a file or files from a directory given a wild-card expression
  '''
  # @todo Reading a single file of netcdf cf convention now
  #cherrypy.log("vtkread " + expr + " " + vars + " " + str(time))
  reader = vtk.vtkNetCDFCFReader() #get test data
  reader.SphericalCoordinatesOff()
  reader.SetOutputTypeToImage()
  datadir = cherrypy.request.app.config['/data']['tools.staticdir.dir']
  filename = os.path.join(datadir, expr)
  reader.SetFileName(filename)
  reader.UpdateInformation()

  # pick particular timestep
  trange = reader.GetOutputInformation(0).Get(vtk.vtkStreamingDemandDrivenPipeline.TIME_STEPS())
  if time is not None and trange is not None and int(time) >= trange[0] and int(time) <= trange[-1]:
    #cherrypy.log("rTime " + str(time))
    sddp = reader.GetExecutive()
    sddp.SetUpdateTimeStep(0,int(time))

  # enable only chosen array(s)
  narrays = reader.GetNumberOfVariableArrays()
  for x in range(0,narrays):
      arrayname = reader.GetVariableArrayName(x)
      if arrayname in vars:
          #cherrypy.log("Enable " + arrayname)
          reader.SetVariableArrayStatus(arrayname, 1)
      else:
          #cherrypy.log("Disable " + arrayname)
          reader.SetVariableArrayStatus(arrayname, 0)

  # Convert to polydata
  sf = vtk.vtkDataSetSurfaceFilter()
  sf.SetInputConnection(reader.GetOutputPort())

  # Convert to GeoJSON
  gw = vtk.vtkGeoJSONWriter()
  gw.SetInputConnection(sf.GetOutputPort())
  gw.WriteToOutputStringOn()
  gw.SetScalarFormat(2)
  gw.Write()
  gj = str(gw.RegisterAndGetOutputString()).replace('\n','')
  return gj

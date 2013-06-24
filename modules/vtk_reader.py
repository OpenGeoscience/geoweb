import cherrypy
import os
from standardtime import attrib_to_converters

vtkOK = False
try:
  import vtk
  vtkOK = True
except ImportError:
  raise Exception("[error] VTK is not available")

def can_read():
  return True

def read(expr, vars, rqstTime):
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

  #obtain temporal information
  times = reader.GetOutputInformation(0).Get(vtk.vtkStreamingDemandDrivenPipeline.TIME_STEPS())
  tunits = reader.GetTimeUnits()
  converters = attrib_to_converters(tunits)

  # pick particular timestep
  if (rqstTime is not None and
      times is not None
      and int(rqstTime) >= times[0] and int(rqstTime) <= times[-1]):
    #cherrypy.log("rTime " + str(time))
    sddp = reader.GetExecutive()
    sddp.SetUpdateTimeStep(0,int(rqstTime))
    if converters and temporalrange:
      stdTime = converters[0](int(rqstTime))
      date = converters[1](stdTime)))
      cherrypy.log("time = " + rqstTime +
                   " tunits: " + tunits +
                   " stdTime: " + str(stdTime) +
                   " date " + str(date))

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

  # Error reading file?
  if not sf.GetOutput():
    raise IOError("Unable to load data file: " + filename)

  # Convert to GeoJSON
  gw = vtk.vtkGeoJSONWriter()
  gw.SetInputConnection(sf.GetOutputPort())
  gw.WriteToOutputStringOn()
  gw.SetScalarFormat(2)
  gw.Write()
  gj = str(gw.RegisterAndGetOutputString()).replace('\n','')
  return gj

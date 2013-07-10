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
  reader.ReplaceFillValueWithNanOn()
  datadir = cherrypy.request.app.config['/data']['tools.staticdir.dir']
  filename = os.path.join(datadir, expr)
  reader.SetFileName(filename)
  reader.UpdateInformation()

  #obtain temporal information
  rawTimes = reader.GetOutputInformation(0).Get(vtk.vtkStreamingDemandDrivenPipeline.TIME_STEPS())
  tunits = reader.GetTimeUnits()
  converters = attrib_to_converters(tunits)

  # pick particular timestep
  if (rqstTime is not None and
      rawTimes is not None
      and float(rqstTime) >= rawTimes[0] and float(rqstTime) <= rawTimes[-1]):
    #cherrypy.log("rTime " + str(time))
    sddp = reader.GetExecutive()
    sddp.SetUpdateTimeStep(0,float(rqstTime))
    if converters:
      stdTime = converters[0](float(rqstTime))
      date = converters[1](stdTime)
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

  # wrap around to get the implicit cell
  extent = reader.GetOutputInformation(0).Get(vtk.vtkStreamingDemandDrivenPipeline.WHOLE_EXTENT())
  pad = vtk.vtkImageWrapPad()
  reader.Update()
  data = reader.GetOutput()
  da = data.GetPointData().GetArray(0).GetName();
  data.GetPointData().SetActiveScalars(da)
  pad.SetInputData(data)
  pad.SetOutputWholeExtent(extent[0], extent[1]+1,
                           extent[2], extent[3],
                           extent[4], extent[5]);

  # Convert to polydata
  sf = vtk.vtkDataSetSurfaceFilter()
  sf.SetInputConnection(pad.GetOutputPort())

  # Error reading file?
  if not sf.GetOutput():
    raise IOError("Unable to load data file: " + filename)

  # Convert to GeoJSON
  gw = vtk.vtkGeoJSONWriter()
  gw.SetInputConnection(sf.GetOutputPort())
  gw.SetScalarFormat(2)
  gw.WriteToOutputStringOn()
  gw.Write()
  gj = str(gw.RegisterAndGetOutputString()).replace('\n','')
  return gj

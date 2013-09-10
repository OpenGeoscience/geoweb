import cdms2
import cdutil
import vtk

from vistrails.core.modules.vistrails_module import Module, ModuleError

from pvcdmsreader import PVCDMSReader

class Dataset(Module):

    _input_ports = [('file', '(edu.utah.sci.vistrails.basic:String')]
    _output_ports = [('self','(Dataset)')]

    def compute(self):
        self.data = cdms2.open(self.getInputFromPort('file'))
        self.setResult('self', self)

class Variable(Module):

    _input_ports = [('dataset', '(Dataset)'),
                    ('name', '(edu.utah.sci.vistrails.basic:String)')]
    _output_ports = [('self','(Variable)')]

    def compute(self):
        dataset = self.getInputFromPort('dataset')
        name = self.getInputFromPort('name')

        self.data = dataset.data[name]

class TransientVariable(Module):

    _output_ports = [('self','(TransientVariable)')]

    def __init__(self, data):
        super(TransientVariable, self).__init__()
        self.data = data

    def compute(self):
        pass

class SubSelect(Module):

    _input_ports = [('variable', '(Variable)'),
                    ('axis', '(basic:String)'),
                    ('start', '(basic:String)'),
                    ('end', '(basic:String)')]

    _output_ports = [('tvariable', '(TransientVariable)')]

    def compute(self):
        variable = self.getInputFromPort("variable")
        axis = self.getInputFromPort("axis")
        start = self.getInputFromPort("start")
        end = self.getInputFromPort("end")

        kwargs={axis: (start,end)}
        v = variable.data(**kwargs)

        self.setResult('tvariable', TransientVariable(v))

class MonthlyTimeBounds(Module):

    _input_ports = [('tvariable', '(TransientVariable)')]
    _output_ports = [('tvariable', '(TransientVariable)')]

    def compute(self):
        variable = self.getInputFromPort('tvariable')
        cdutil.setTimeBoundsMonthly(variable.data)
        self.setResult('tvariable', variable)


class Average(Module):
    _input_ports = [('tvariable', '(TransientVariable)'),
                    ('axis', '(basic:String)')]
    _output_ports = [('tvariable', '(TransientVariable)')]

    def compute(self):
        variable = self.getInputFromPort("tvariable")
        axis = self.getInputFromPort("axis")

        avg = cdutil.averager(variable.data, axis=axis)

        self.setResult('tvariable', TransientVariable(avg))

class WriteJSON(Module):

    _input_ports = [('tvariable', '(TransientVariable)'),
                    ('filename', '(basic:String)')]

    def compute(self):
        variable = self.getInputFromPort('tvariable')
        filename = self.getInputFromPort('filename')

        print "convert to vtk image data"
        cv = PVCDMSReader()
        image_data = cv.convert(variable.data)

        print "convert to poly data"
        geom = vtk.vtkImageDataGeometryFilter()
        geom.SetInputData(image_data)
        geom.ReleaseDataFlagOn()

        print "Convert to GeoJSON"
        gw = vtk.vtkGeoJSONWriter()
        gw.SetInputConnection(geom.GetOutputPort())
        gw.WriteToOutputStringOn()
        gw.Write()
        gj = str(gw.RegisterAndGetOutputString()).replace('\n','')
        outf = open(filename, 'w')
        outf.write(gj)

_modules = [Average, MonthlyTimeBounds, TransientVariable, Variable, Dataset, SubSelect, WriteJSON]

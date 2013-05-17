import types

def str_to_class(s):
    if s in globals() and isinstance(globals()[s], types.ClassType):
        return globals()[s]
    return None

class WorkFlow(object):

    def __init__(self):
        self.modules = []
        self.connections = []

    def addConnection(self, source, target):
        self.connections.append(Connection(source, target))

    def addModule(self, module='', id=None):
        if isinstance(module, Module):
            self.modules.append(module)
            module.workflow = self
        elif isinstance(module, basestring):
            self.modules.append(Module(self, module, id))
        else:
            raise Exception("Expected Module or string, got %s instead" %
                            str(module))

    def run(self):
        start_modules = [m for m in self.modules if m.canRun()]

        for module in start_modules:
            module.run()

    def toJSON(self):
        return json.dumps({'modules': [m.toDict() for m in self.modules],
                           'connections': [c.toDict()
                                           for c in self.connections]})

    @staticmethod
    def fromJSON(s):
        dict = json.loads(s)
        self.modules = [Module.fromDict(m) for m in dict['modules']]
        self.connections = [Connection.fromDict(c)
                            for c in dict['connections']]


class Module(object):

    _next_id = 0

    def __init__(self, workflow, name='', id=None):
        self.workflow = workflow
        self.name = name
        self.id = Module._next_id if id is None else id
        if self.id >= Module._next_id:
            Module._next_id = self.id + 1

        self.inPorts = {}
        self.outPorts = {}
        self._ran = False

    def toDict(self):
        return {'name': self.name,
                'id': self.id,
                'inPorts': [ip.toDict() for ip in self.inPorts.itervalues()],
                'outPorts': [op.toDict() for op in self.outPorts.itervalues()]}

    @staticmethod
    def fromDict(d, workflow):
        klass = str_to_class(d['class'])
        m = klass(workflow, d['name'], d['id'])
        for p in d['inPorts']:
            m.addInPort(p['name'], p['type'], p.get('value', None))
        for p in d['outPorts']:
            m.addOutPort(p['name'], p['type'])
        return m

    def _addPort(self, dict, klass, name, type=None):
        if name in dict:
            raise Exception("%s already has %s %s" % (self.name,
                                                      klass.__name__, name))
        else:
            dict[name] = klass(self, name, type)

    def addInPort(self, name, type=None, value=None):
        self._addPort(self.inPorts, InPort, name, type, value)
        self.inPorts[name].value = value

    def addOutPort(self, name, type=None):
        self._addPort(self.outPorts, OutPort, name, type)

    def addInPorts(self, inPorts):
        for name in inPorts:
            self.addInPort(name)

    def addOutPorts(self, outPorts):
        for name in inPorts:
            self.addOutPort(name)

    def run(self):
        if not self.hasRun() and self.canRun():
            self.execute()
            self._ran = True
            for port in self.outPorts.itervalues():
                port.run()

    def hasRun(self):
        return self._ran

    def canRun(self):
        """ If all connected input ports have run, return true
        """
        for port in self.inPorts.itervalues():
            for connection in port.getConnections():
                if not connection.hasRun():
                    return False
        return True

    def getInPort(self, name):
        return self.inPorts[name]

    def getOutPort(self, name):
        return self.outPorts[name]

    def setOutput(self, name, value):
        self.getOutPort(name).value = value

    def getInput(self, name):
        connections = self.getInPort(name).getConnections()
        result = []
        for connection in connections:
            result.append(connection.source.value)
        if len(result) > 0:
            return result
        return [self.getInPort(name).value]

    def execute(self):
        raise NotImplementedError()

class Port(object):

    def __init__(self, module, name, type=None):
        self.module = module
        self.name = name
        self.type = type
        self.connections = []
        self.value = None

    def addConnection(self, connection):
        self.connections.append(connection)

    def getConnections(self):
        return self.connections

    def toDict(self):
        return {'name': self.name,
                'type': None if self.type is None else self.type.__name__}

    def connect(self, port):
        self.module.workflow.addConnection(self, port)

class InPort(Port):

    def __init__(self, module, name, type=None):
        super(InPort, self).__init__(module, name, type)

    def accepts(self, outPort):
        return self.type is None or isinstance(outPort.type, self.type)

    def run(self):
        self.module.run()

    def toDict(self):
        d = super(InPort, self).toDict()
        d['value'] = self.value
        return d

class OutPort(Port):

    def __init__(self, module, name, type=None):
        super(OutPort, self).__init__(module, name, type)

    def run(self):
        for connection in self.connections:
            connection.run()

class PortMismatch(Exception):

    def __init__(self, source, target):
        super(PortMismatch, self).__init__('%s expects type %s but got %s' %
                                           (target.name, target.type,
                                            source.type))

class Connection(object):

    def __init__(self, source, target):
        if not target.accepts(source):
            raise PortMismatch(source, target)
        self.source = source
        self.target = target
        self.source.addConnection(self)
        self.target.addConnection(self)

    def run(self):
        self.target.run()

    def hasRun(self):
        return self.source.module.hasRun()

    def toDict(self):
        return {'src': self.source.module.id, 'srcPort': self.source.name,
                'tgt': self.target.module.id, 'tgtPort': self.target.name}

    @staticmethod
    def fromDict(d, workflow):
        src = workflow.findModuleById(d['src'])
        tgt = workflow.findModuleById(d['tgt'])
        return Connection(src.getOutPort(d['srcPort']),
                          tgt.getInPort(d['tgtPort']))

#TESTS
import unittest

class TestNumber(Module):

    def onInit(self):
        self.name = 'Number'
        self.value = 0
        self.addOutPort('value')

    def execute(self):
        self.setOutput('value', self.value)


class TestModuleExecution(unittest.TestCase):

    def setUp(self):
        self.wf = WorkFlow()

        add = Module('Add')
        add.addInPorts(['op1','op2'])
        add.addOutPort('result')

        def add_execute(this):
            this.setOutput('result', this.getInput('op1')[0] + this.getInput('op2')[0])

        add.execute = types.MethodType(add_execute, add)

        n1 = wf.addModule(TestNumber)
        n1.value = 3
        n2 = wf.addModule(TestNumber)
        n2.value = 5

        c1 = Connection(n1.getOutPort('value'), add.getInPort('op1'))
        c2 = Connection(n2.getOutPort('value'), add.getInPort('op2'))

        self.wf.modules = [add, n1, n2]
        self.wf.connections = [c1, c2]
        self.add = add

    def test_execution(self):
        self.wf.run()
        self.assertEqual(self.add.getOutPort('result').value, 8)

if __name__ == '__main__':
    unittest.main()

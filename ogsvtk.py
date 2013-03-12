'''
Exercises in creating vtk content on server,
serializing and rendering on client.
localhost:8080/vtk?which=EXERCISENAME
'''
import cherrypy
import vtk
import sys

class VTKRoot(object):
    def __init__(self, host, port, ssl=False):
        self.host = host
        self.port = port
        self.scheme = 'wss' if ssl else 'ws'

    def serveVTK(self, filename):
        '''
        Run a vtk pipeline that produces a geojson file and
        deliver that to the client as text.
        '''

        ss = vtk.vtkSphereSource()
        gw = vtk.vtkGeoJSONWriter()
        gw.SetInputConnection(ss.GetOutputPort())
        fname = "/Source/CPIPES/buildogs/deploy/sphere.gj"
        gw.SetFileName(fname)
        gw.DebugOn()
        gw.Write()
        f = file(fname)
        res = str(f.readlines())
        #lines = (line.rstrip() for line in open(fname));
        v = """<html><head></head><body>""" + res + """</body><html>"""
        return v

    def serveGJ(self):
        '''
        Deliver a canonical geojson string to client and show as text.
        '''

        res = """
        { "type": "FeatureCollection",
          "features": [
          { "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [102.0, 0.5]},
            "properties": {"prop0": "value0"}
          },
          { "type": "Feature",
            "geometry": {
            "type": "LineString",
            "coordinates": [
              [102.0, 0.0], [103.0, 1.0], [104.0, 0.0], [105.0, 1.0]
             ]
            },
            "properties": {
              "prop0": "value0",
              "prop1": 0.0
              }
          },
          { "type": "Feature",
            "geometry": {
            "type": "Polygon",
            "coordinates": [
              [ [100.0, 0.0], [101.0, 0.0], [101.0, 1.0],
              [100.0, 1.0], [100.0, 0.0] ]
             ]
            },
            "properties": {
              "prop0": "value0",
              "prop1": {"this": "that"}
            }
          }
          ]
        }"""
        v = """<html><head></head><body>""" + res + """</body><html>"""
        return v

    def serveCPIPE(self):
        '''
        Make the canonical cpipe scene.
        '''

        res = """
  <html>
    <head>
      <script src="../lib/sylvester.js" type="text/javascript"></script>
      <script src="../lib/glUtils.js" type="text/javascript"></script>
      <script src="../lib/gl-matrix.js" type="text/javascript"></script>
      <script type="text/javascript" src="../lib/ogs.min.js"></script>
      <script type="text/javascript" src="//ajax.googleapis.com/ajax/libs/jquery/1.9.0/jquery.min.js"></script>
      <script type="text/javascript">
      function main() {
        var mapOptions = {
          zoom : 1,
          center : ogs.geo.latlng(30.0, 70.0)
        };
        var myMap = ogs.geo.map(document.getElementById("glcanvas"), mapOptions);
      }
      </script>
      <link rel="stylesheet" href="http://code.jquery.com/ui/1.10.1/themes/base/jquery-ui.css" />
      <script src="http://code.jquery.com/jquery-1.9.1.js"></script>
      <script src="http://code.jquery.com/ui/1.10.1/jquery-ui.js"></script>
    </head>
    <body onload="main()">
      <canvas id="glcanvas" width="800" height="600"></canvas>
    </body>
  </html>
"""
        return res

    def serveVGL1(self):
        '''
        Deliver a bjson encoded serialized vtkpolydata file and render it
        over the canonical cpipe scene.
        '''

        res = """
  <html>
    <head>
      <script src="../lib/sylvester.js" type="text/javascript"></script>
      <script src="../lib/glUtils.js" type="text/javascript"></script>
      <script src="../lib/gl-matrix.js" type="text/javascript"></script>
      <script type="text/javascript" src="../lib/ogs.min.js"></script>

      <script type="text/javascript" src="//ajax.googleapis.com/ajax/libs/jquery/1.9.0/jquery.min.js"></script>
      <script type="text/javascript">
      function makesphere() {
        var geom = new ogs.vgl.vtkUnpack().parseObject(sphereString);

        var mapper = new ogs.vgl.mapper();
        mapper.setGeometryData(geom);
        var mat = new ogs.vgl.material();
        var prog = new ogs.vgl.shaderProgram();

        var posVertAttr = new ogs.vgl.vertexAttribute("aVertexPosition");
        prog.addVertexAttribute(posVertAttr, ogs.vgl.vertexAttributeKeys.Position);

        var posNormAttr = new ogs.vgl.vertexAttribute("aVertexNormal");
        prog.addVertexAttribute(posNormAttr, ogs.vgl.vertexAttributeKeys.Normal);

        var modelViewUniform = new ogs.vgl.modelViewUniform("modelViewMatrix");
        prog.addUniform(modelViewUniform);

        var projectionUniform = new ogs.vgl.projectionUniform("projectionMatrix");
        prog.addUniform(projectionUniform);

        var vertexShaderSource = [
          'attribute vec3 aVertexPosition;',
          'attribute vec3 aVertexNormal;',
          'uniform mat4 modelViewMatrix;',
          'uniform mat4 projectionMatrix;',
          'varying vec3 vNormal;',
          'void main(void)',
          '{',
            'gl_Position = projectionMatrix * modelViewMatrix * vec4(aVertexPosition*100.0, 1.0);',
            'vNormal = aVertexNormal;',
          '}'
        ].join('\\n');
        var vertexShader = new ogs.vgl.shader(gl.VERTEX_SHADER);
        vertexShader.setShaderSource(vertexShaderSource);
        prog.addShader(vertexShader);

        var fragmentShaderSource = [
         'precision mediump float;',
         'varying vec3 vNormal;',
         'void main(void) {',
           'gl_FragColor = vec4(0.0, 0.0, 1.0, 1.0) * vec4(vNormal, 1.0);',
         '}'
        ].join('\\n');
        var fragmentShader = new ogs.vgl.shader(gl.FRAGMENT_SHADER);
        fragmentShader.setShaderSource(fragmentShaderSource);
        prog.addShader(fragmentShader);

        mat.addAttribute(prog);

        var actor = new ogs.vgl.actor();
        actor.setMapper(mapper);
        actor.setMaterial(mat);
        return actor;
      }
      </script>
      <script type="text/javascript">
      function main() {
        var mapOptions = {
          zoom : 1,
          center : ogs.geo.latlng(30.0, 70.0)
        };
        var myMap = ogs.geo.map(document.getElementById("glcanvas"), mapOptions);

        var planeLayer = ogs.geo.featureLayer({
          "opacity" : 1,
          "showAttribution" : 1,
          "visible" : 1
         },
         makesphere()
         );
        myMap.addLayer(planeLayer);
      }
      </script>

      <link rel="stylesheet" href="http://code.jquery.com/ui/1.10.1/themes/base/jquery-ui.css" />
      <script src="http://code.jquery.com/jquery-1.9.1.js"></script>
      <script src="http://code.jquery.com/ui/1.10.1/jquery-ui.js"></script>
    </head>
    <body onload="main()">
      <canvas id="glcanvas" width="800" height="600"></canvas>
    </body>
  </html>
"""
        return res

    def serveVGL2(self):
        '''
        Deliver geojson encoded data and render it over the canonical cpipe scene.
        '''

        res = """
  <html>
    <head>
      <script src="../lib/sylvester.js" type="text/javascript"></script>
      <script src="../lib/glUtils.js" type="text/javascript"></script>
      <script src="../lib/gl-matrix.js" type="text/javascript"></script>
      <script type="text/javascript" src="../lib/ogs.min.js"></script>

      <script type="text/javascript" src="//ajax.googleapis.com/ajax/libs/jquery/1.9.0/jquery.min.js"></script>
      <script type="text/javascript">
      function makedata() {
        var dataString = [
            '{"type": "Feature",',
            '"geometry": {',
            '"type": "Polygon",',
            '"coordinates": [',
            '  [ [0.0, 0.0], [1.0, 0.0], [1.0, 1.0],',
            '  [0.0, 1.0], [0.0, 0.0] ]',
            ' ]',
            '},',
            '"properties": {',
            '  "prop0": "value0",',
            '  "prop1": {"this": "that"}',
            '}}'
          ].join('\\n')

        var geom = new ogs.vgl.geoJSONUnpack().parseObject(dataString);

        var mapper = new ogs.vgl.mapper();
        mapper.setGeometryData(geom);
        var mat = new ogs.vgl.material();
        var prog = new ogs.vgl.shaderProgram();

        var posVertAttr = new ogs.vgl.vertexAttribute("aVertexPosition");
        prog.addVertexAttribute(posVertAttr, ogs.vgl.vertexAttributeKeys.Position);

        var modelViewUniform = new ogs.vgl.modelViewUniform("modelViewMatrix");
        prog.addUniform(modelViewUniform);

        var projectionUniform = new ogs.vgl.projectionUniform("projectionMatrix");
        prog.addUniform(projectionUniform);

        var vertexShaderSource = [
          'attribute vec3 aVertexPosition;',
          'uniform mat4 modelViewMatrix;',
          'uniform mat4 projectionMatrix;',
          'void main(void)',
          '{',
            'gl_Position = projectionMatrix * modelViewMatrix * vec4(aVertexPosition*1.0, 1.0);',
          '}'
        ].join('\\n');
        var vertexShader = new ogs.vgl.shader(gl.VERTEX_SHADER);
        vertexShader.setShaderSource(vertexShaderSource);
        prog.addShader(vertexShader);

        var fragmentShaderSource = [
         'precision mediump float;',
         'void main(void) {',
           'gl_FragColor = vec4(1.0, 0.0, 1.0, 1.0);',
         '}'
        ].join('\\n');
        var fragmentShader = new ogs.vgl.shader(gl.FRAGMENT_SHADER);
        fragmentShader.setShaderSource(fragmentShaderSource);
        prog.addShader(fragmentShader);

        mat.addAttribute(prog);

        var actor = new ogs.vgl.actor();
        actor.setMapper(mapper);
        actor.setMaterial(mat);
        return actor;
      }
      </script>
      <script type="text/javascript">
      function main() {
        var mapOptions = {
          zoom : 1,
          center : ogs.geo.latlng(30.0, 70.0)
        };
        var myMap = ogs.geo.map(document.getElementById("glcanvas"), mapOptions);

        var planeLayer = ogs.geo.featureLayer({
          "opacity" : 1,
          "showAttribution" : 1,
          "visible" : 1
         },
         makedata()
         );
        myMap.addLayer(planeLayer);
      }
      </script>

      <link rel="stylesheet" href="http://code.jquery.com/ui/1.10.1/themes/base/jquery-ui.css" />
      <script src="http://code.jquery.com/jquery-1.9.1.js"></script>
      <script src="http://code.jquery.com/ui/1.10.1/jquery-ui.js"></script>
    </head>
    <body onload="main()">
      <canvas id="glcanvas" width="800" height="600"></canvas>
    </body>
  </html>
"""
        return res

    def serveVGL3(self):
        '''
        Deliver a geojson encoded serialized vtkpolydata file and render it
        over the canonical cpipe scene.
        '''

        ss = vtk.vtkSphereSource()
        gw = vtk.vtkGeoJSONWriter()
        gw.SetInputConnection(ss.GetOutputPort())
        gw.SetFileName("/Source/CPIPES/buildogs/deploy/sphere.gj")
        gw.DebugOn()
        gw.Write()
        f = file("/Source/CPIPES/buildogs/deploy/sphere.gj")
        gj = str(f.readlines())

        res = """
  <html>
    <head>
      <script src="../lib/sylvester.js" type="text/javascript"></script>
      <script src="../lib/glUtils.js" type="text/javascript"></script>
      <script src="../lib/gl-matrix.js" type="text/javascript"></script>
      <script type="text/javascript" src="../lib/ogs.min.js"></script>

      <script type="text/javascript" src="//ajax.googleapis.com/ajax/libs/jquery/1.9.0/jquery.min.js"></script>
      <script type="text/javascript">
      function makedata() {
        var dataString = %(gjfile)s.join('\\n');
        var geom = new ogs.vgl.geoJSONUnpack().parseObject(dataString);

        var mapper = new ogs.vgl.mapper();
        mapper.setGeometryData(geom);
        var mat = new ogs.vgl.material();
        var prog = new ogs.vgl.shaderProgram();

        var posVertAttr = new ogs.vgl.vertexAttribute("aVertexPosition");
        prog.addVertexAttribute(posVertAttr, ogs.vgl.vertexAttributeKeys.Position);

        var modelViewUniform = new ogs.vgl.modelViewUniform("modelViewMatrix");
        prog.addUniform(modelViewUniform);

        var projectionUniform = new ogs.vgl.projectionUniform("projectionMatrix");
        prog.addUniform(projectionUniform);

        var vertexShaderSource = [
          'attribute vec3 aVertexPosition;',
          'uniform mat4 modelViewMatrix;',
          'uniform mat4 projectionMatrix;',
          'void main(void)',
          '{',
            'gl_Position = projectionMatrix * modelViewMatrix * vec4(aVertexPosition*1.0, 1.0);',
          '}'
        ].join('\\n');
        var vertexShader = new ogs.vgl.shader(gl.VERTEX_SHADER);
        vertexShader.setShaderSource(vertexShaderSource);
        prog.addShader(vertexShader);

        var fragmentShaderSource = [
         'precision mediump float;',
         'void main(void) {',
           'gl_FragColor = vec4(1.0, 0.0, 1.0, 1.0);',
         '}'
        ].join('\\n');
        var fragmentShader = new ogs.vgl.shader(gl.FRAGMENT_SHADER);
        fragmentShader.setShaderSource(fragmentShaderSource);
        prog.addShader(fragmentShader);

        mat.addAttribute(prog);

        var actor = new ogs.vgl.actor();
        actor.setMapper(mapper);
        actor.setMaterial(mat);
        return actor;
      }
      </script>
      <script type="text/javascript">
      function main() {
        var mapOptions = {
          zoom : 1,
          center : ogs.geo.latlng(30.0, 70.0)
        };
        var myMap = ogs.geo.map(document.getElementById("glcanvas"), mapOptions);

        var planeLayer = ogs.geo.featureLayer({
          "opacity" : 1,
          "showAttribution" : 1,
          "visible" : 1
         },
         makedata()
         );
        myMap.addLayer(planeLayer);
      }
      </script>

      <link rel="stylesheet" href="http://code.jquery.com/ui/1.10.1/themes/base/jquery-ui.css" />
      <script src="http://code.jquery.com/jquery-1.9.1.js"></script>
      <script src="http://code.jquery.com/ui/1.10.1/jquery-ui.js"></script>
    </head>
    <body onload="main()">
      <canvas id="glcanvas" width="800" height="600"></canvas>
    </body>
  </html>
""" % {'gjfile' :gj}
        return res


    @cherrypy.expose
    def index(self, which=None):
        '''
        Entry point for web app. Ex: http://localhost:8080/vtk?which=VGL1
        '''

        if which == "VTK":
          v = self.serveVTK("foo")
        elif which == "GJ":
          v = self.serveGJ()
        elif which == "CPIPE":
          v = self.serveCPIPE()
        elif which == "VGL1":
          v = self.serveVGL1()
        elif which == "VGL2":
          v = self.serveVGL2()
        elif which == "VGL3":
          v = self.serveVGL3()
        else:
          v = """<html><head></head><body>""" + "HELLO WORLD" + """</body><html>"""
        return v

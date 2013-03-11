'''
  cherryd -i py -c py/app.conf
'''
import cherrypy
import simplejson
import os

#websocket imports
from ws4py.server.cherrypyserver import WebSocketPlugin, WebSocketTool
from websocket_chat import ChatRoot
from websocket_pi import PiRoot
from ogsvtk import VTKRoot

current_dir = os.path.dirname(os.path.abspath(__file__))

from mako.template import Template
from mako.lookup import TemplateLookup
template_dir = os.path.dirname(os.path.abspath(__file__))
lookup = TemplateLookup(directories=[template_dir])

JS_DIR = os.path.join(os.path.abspath("."), u"js")
CONFIG_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'app.conf')

#make sure WebSocketPlugin runs after daemonizer plugin (priority 65)
#see cherrypy plugin documentation for default plugin priorities
WebSocketPlugin.start.__func__.priority = 66

#init websocket plugin
WebSocketPlugin(cherrypy.engine).subscribe()
cherrypy.tools.websocket = WebSocketTool()

class Root(object):
    # access at http://localhost:8080/chat
    chat = ChatRoot(host='127.0.0.1', port=8080, ssl=False)

    # access at http://localhost:8080/pi
    pi = PiRoot(host='127.0.0.1', port=8080, ssl=False)

    # access at http://localhost:8080/pi
    vtk = VTKRoot(host='127.0.0.1', port=8080, ssl=False)

    @cherrypy.expose
    def update(self):
      # Here's the important message!
      return "This a very important message"

if __name__ == '__main__':
    import os.path
    cherrypy.engine.start()
    cherrypy.engine.block()

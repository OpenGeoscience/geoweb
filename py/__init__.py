'''
  cherryd -i py -c py/app.conf
'''
import cherrypy
import simplejson
import os

current_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')

from mako.template import Template
from mako.lookup import TemplateLookup
template_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../html')
lookup = TemplateLookup(directories=[template_dir])

JS_DIR = os.path.join(os.path.abspath("."), u"js")
CONFIG_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'app.conf')

class Root(object):
    @cherrypy.expose
    def index(self):
        index_html = 'index.html'
        tmpl = lookup.get_template(index_html)
        return tmpl.render(name="aashish")

    @cherrypy.expose
    def update(self):
      # Here's the important message!
      return "This a very important message"

if __name__ == '__main__':
    import os.path
    cherrypy.engine.start()
    cherrypy.engine.block()

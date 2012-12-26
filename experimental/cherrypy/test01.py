import cherrypy
import simplejson
import os

from mako.template import Template
from mako.lookup import TemplateLookup
lookup = TemplateLookup(directories=['html'])

JS_DIR = os.path.join(os.path.abspath("."), u"js")

class Root(object):
    @cherrypy.expose
    def index(self):
        index_html = os.path.join(os.path.dirname(__file__), 'index.html')
        tmpl = lookup.get_template(index_html)
        return tmpl.render(name="aashish")

    @cherrypy.expose
    def update(self):
      # Here's the important message!
      name = "My name is aashish"
      return name

config = {'/js':
                {'tools.staticdir.on': True,
                 'tools.staticdir.dir': JS_DIR,
                }
        }

cherrypy.tree.mount(Root(), '/', config=config)

if __name__ == '__main__':
    import os.path
    cherrypy.engine.start()
    cherrypy.engine.block()

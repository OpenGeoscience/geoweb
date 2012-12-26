import cherrypy
from mako.template import Template
from mako.lookup import TemplateLookup
lookup = TemplateLookup(directories=['html'])

class Root:
    @cherrypy.expose
    def index(self):
        index_html = os.path.join(os.path.dirname(__file__), 'index.html')
        tmpl = lookup.get_template(index_html)
        return tmpl.render(name="aashish")

cherrypy.tree.mount(Root())

if __name__ == '__main__':
    import os.path
    cherrypy.engine.start()
    cherrypy.engine.block()

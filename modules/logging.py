import cherrypy

def log(_str): cherrypy.log("LOG: %s" % _str)
def error(_str): cherrypy.log("ERROR: %s" % _str)

if cherrypy.tree.apps[''].config['global']['log.debug']:
    def debug(_str): cherrypy.log("DEBUG: %s" % _str)
else:
    def debug(_): pass
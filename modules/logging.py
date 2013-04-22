import cherrypy

def log(_str): cherrypy.log("LOG: %s" % _str)
def error(_str): cherrypy.log("ERROR: %s" % _str)

def debug(_str):
    global debug
    def no_debug(_): pass

    if cherrypy.tree.apps[''].config['global']['log.debug']:
        cherrypy.log("DEBUG: %s" % _str)
    else:
        debug = no_debug

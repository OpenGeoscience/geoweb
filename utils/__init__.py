import cherrypy

def log(_str): cherrypy.log("LOG: %s" % _str)
def error(_str): cherrypy.log("ERROR: %s" % _str)

def debug(_str):
    #this function gets redefined after first call, based on debug config
    global debug
    def no_debug(_): pass
    def yes_debug(_str): cherrypy.log("DEBUG: %s" % _str)
    def std_debug(_str): print "DEBUG: %s" % _str

    if '' not in cherrypy.tree.apps:
        #cherrypy probably not running
        debug = std_debug
        std_debug(_str)
    elif cherrypy.tree.apps[''].config['global']['log.debug']:
        debug = yes_debug
        yes_debug(_str)
    else:
        debug = no_debug

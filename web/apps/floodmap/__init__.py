#!python
import os.path
current_dir = os.path.dirname(os.path.abspath(__file__))

import cherrypy


class Root:
    @cherrypy.expose
    def index(self):
        return """<html>
<head>
        <title>CherryPy static example</title>
        <link rel="stylesheet" type="text/css" href="css/style.css" type="text/css"></link>
        <script type="application/javascript" src="js/some.js"></script>
</head>
<html>
<body>
<p>Static example</p>
</body>
</html>"""

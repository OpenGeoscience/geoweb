# -*- coding: utf-8 -*-
#python libs
import argparse, inspect, os, random, sys

#third party libs
import numpy, cherrypy

from mpi4py import MPI

from ws4py.server.cherrypyserver import WebSocketPlugin, WebSocketTool
from ws4py.websocket import WebSocket
from ws4py.messaging import TextMessage

class PiWebSocketHandler(WebSocket):

    def received_message(self, m):
        try:
            cherrypy.log('something')
            if hasattr(self, 'processing') and self.processing:
                return

            cherrypy.log("Recieved message " + str(m))

            self.processing = True
            import ogs
            thisdir = ogs.current_dir
            cherrypy.log("Dir %s" % thisdir)
            exec_py = os.path.join(thisdir, 'cpi.py')
            cherrypy.log("Path %s" % exec_py)
            comm = MPI.COMM_SELF.Spawn(sys.executable,
                                       args=[exec_py],
                                       maxprocs=8)

            cherrypy.log("Spawned processes")

            self.comm = comm

            iterations = int(str(m))
            N = numpy.array(iterations, 'i')
            comm.Bcast([N, MPI.INT], root=MPI.ROOT)
            cherrypy.log("Broadcasts %d iterations" % iterations)
            PI = numpy.array(0.0, 'd')
            comm.Reduce(None, [PI, MPI.DOUBLE],
                        op=MPI.SUM, root=MPI.ROOT)

            cherrypy.log("reduce pi: %f" % PI)

            self.send(TextMessage(str(PI)))

            cherrypy.log("sent response")

            comm.Barrier()
            comm.Disconnect()
            self.comm = None
            self.processing = False

        except Exception, err:
            import traceback
            tb = traceback.format_exc()
            cherrypy.log(tb)
            cherrypy.log(str(err))

    def closed(self, code, reason="A client left the room without a proper explanation."):
        if self.processing and self.comm:
            self.comm.Abort()

class PiRoot(object):
    def __init__(self, host, port, ssl=False):
        self.host = host
        self.port = port
        self.scheme = 'wss' if ssl else 'ws'

    @cherrypy.expose
    def index(self):
        return """<html>
    <head>
      <script type='application/javascript' src='https://ajax.googleapis.com/ajax/libs/jquery/1.8.3/jquery.min.js'></script>
      <script type='application/javascript'>
        $(document).ready(function() {

          websocket = '%(scheme)s://%(host)s:%(port)s/pi/ws';
          if (window.WebSocket) {
            ws = new WebSocket(websocket);
          }
          else if (window.MozWebSocket) {
            ws = MozWebSocket(websocket);
          }
          else {
            console.log('WebSocket Not Supported');
            return;
          }

          window.onbeforeunload = function(e) {
            $('#chat').val($('#chat').val() + 'Bye bye...\\n');
            ws.close(1000, '%(username)s left the room');

            if(!e) e = window.event;
            e.stopPropagation();
            e.preventDefault();
          };
          ws.onmessage = function (evt) {
             $('#chat').val($('#chat').val() + evt.data + '\\n');
          };
          ws.onopen = function() {
             ws.onmessage({data: 'Connected to server'})
             ws.onmessage({data: 'Enter the number of iterations you want to use to compute PI in parrallel, and hit send'})
          };
          ws.onclose = function(evt) {
             $('#chat').val($('#chat').val() + 'Connection closed by server: ' + evt.code + ' \"' + evt.reason + '\"\\n');
          };

          $('#send').click(function() {
             var val = $('#message').val();
             console.log(val);
             if(!isNaN(parseFloat(val)) && isFinite(val)) {
               val = Math.floor(parseFloat(val))
               if(val <= 100000000 && val > 100) {
                 ws.onmessage({data: 'Computing PI using ' + val + ' iterations.'});
                 ws.send(val);
               } else {
                 ws.onmessage({data:'Number must be between 100 and 100000000'});
               }
             } else {
               ws.onmessage({data:'Number must be between 100 and 100000000'});
             }
             $('#message').val("");
             return false;
          });
        });
      </script>
    </head>
    <body>
    <form action='#' id='chatform' method='get'>
      <textarea id='chat' cols='35' rows='10'></textarea>
      <br />
      <label for='message'>Iterations: </label><input type='text' id='message' />
      <input id='send' type='submit' value='Send' />
      </form>
    </body>
    </html>
    """ % {'username': "User%d" % random.randint(0, 100), 'host': self.host, 'port': self.port, 'scheme': self.scheme}

    @cherrypy.expose
    def ws(self):
        cherrypy.log("Handler created: %s" % repr(cherrypy.request.ws_handler))

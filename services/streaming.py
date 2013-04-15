# This service starts and stops the streaming websocket client proceses
import os
import signal
from subprocess import Popen


streaming_service_dir = os.path.dirname(os.path.abspath(__file__))

def run(*pargs, **kwargs):
    def startClient(name):
        cmdfile = os.path.join(streaming_service_dir, 'streaming/%s.py' % name)
        pidfile = os.path.join(streaming_service_dir, 'streaming/%s.pid' % name)

        if os.path.exists(pidfile):
            return "%s running" % name

        pid = Popen(["python", cmdfile]).pid

        file = open(pidfile, 'w')
        file.write(str(pid))
        file.flush()
        file.close()

        return "started %s" % name

    def stopClient(name):
        pidfile = os.path.join(streaming_service_dir, 'streaming/%s.pid' % name)
        if os.path.exists(pidfile):
            error = ''
            file = open(pidfile)

            try:
                pid = int(file.read())
            except:
                error += "%s.pid does not contain a valid process id" % name

            try:
                error = "Exit code: %s" % str(os.kill(pid, signal.SIGKILL))
            except:
                error += "unable to kill %s process" % name
            finally:
                os.remove(pidfile)

            return error
        return "Already stopped"

    if len(pargs) > 0:
        if pargs[0] == 'start':
            return "%s\n%s" % (startClient('master'), startClient('worker'))

        elif pargs[0] == 'stop':
            return "%s\n%s" % (stopClient('master'), stopClient('worker'))

    return "Unknown command"

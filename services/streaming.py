# This service starts and stops the streaming websocket client proceses
import os
import signal
from subprocess import Popen

streaming_service_dir = os.path.dirname(os.path.abspath(__file__))

pidfile = os.path.join(streaming_service_dir, 'streaming/client.pid')
workerfile = os.path.join(streaming_service_dir, 'streaming/worker.py')
masterfile = os.path.join(streaming_service_dir, 'streaming/master.py')

def run(*pargs, **kwargs):
    if pargs[0] == 'start':
        if os.path.exists(pidfile):
            return "Already running"

        pid = Popen(["python", cmdfile]).pid

        file = open(pidfile, 'w')
        file.write(str(pid))
        file.flush()
        file.close()

        return "started"

    elif pargs[0] == 'stop':
        if os.path.exists(pidfile):
            error = ''
            file = open(pidfile)

            try:
                pid = int(file.read())
            except ValueError:
                error += "client.pid does not contain a valid process id"

            try:
                error = "Exit code: %s" % str(os.kill(pid, signal.SIGKILL))
            except:
                error += "unable to kill process"
            finally:
                os.remove(pidfile)

            return error
        return "Already stopped"
    else:
        return "Unknown command"

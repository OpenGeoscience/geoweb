# This service starts and stops the streaming websocket client worker thread
import os
import signal
from subprocess import Popen

streaming_service_dir = os.path.dirname(os.path.abspath(__file__))

pidfile = os.path.join(streaming_service_dir, 'streaming/client.pid')
cmdfile = os.path.join(streaming_service_dir, 'streaming/client.py')

def run(*pargs, **kwargs):
    if pargs[0] == 'start':
        if os.path.exists(pidfile):
            return "Already running"

        pid = Popen(["python", cmdfile]).pid

        file = open(pidfile, 'w')
        file.write(pid)
        file.close()

        return "started"

    elif pargs[0] == 'stop':
        if os.path.exists(pidfile):
            file = open(pidfile)

            try:
                pid = int(file.read())
            except ValueError:
                return "error: client.pid does not contain a valid process id"

            retval = os.kill(pid, signal.SIGKILL)
            os.remove(pidfile)

        return retval

    else:
        return "Unknown command"

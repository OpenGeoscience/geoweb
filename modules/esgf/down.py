from celery import Celery
from celery import task, current_task
from celery.result import AsyncResult
from myproxy.client import MyProxyClient
import requests
import os.path
from functools import partial
import hashlib

mongo_url='mongodb://localhost/celery'
celery = Celery('download', broker=mongo_url, backend=mongo_url)

def aquire_certificate(user, password):
    myproxy = MyProxyClient(hostname='pcmdi9.llnl.gov')
    credentials = myproxy.logon(user, password, bootstrap=True)

    with open('/tmp/%s.esgf' % (user), 'w') as fd:
        fd.write(credentials[0])
        fd.write(credentials[1])

def url_to_download_filepath(user, url):
    print url
    filepath = '/tmp/' + user
    filepath += url[6:]
    print filepath
    return filepath

@celery.task
def download(url, size, checksum, user, password):
    aquire_certificate(user, password)

    cert_path = '/tmp/%s.esgf' % (user)

    request = requests.get(url,
                           cert=(cert_path, cert_path), verify=False, stream=True)

    filepath = url_to_download_filepath(user, url)
    dir = os.path.dirname(filepath);
    if not os.path.exists(dir):
        os.makedirs(dir)

    # Now we know the user is authorized, first check if they have already
    # downloaded this file.
    filepath = url_to_download_filepath(user, url)

    if os.path.exists(filepath):
        md5 = hashlib.md5()
        with open(filepath) as fp:
            for chunk in iter(partial(fp.read, 128), ''):
                md5.update(chunk)

        # if the checksums match we can skip the download
        if checksum == md5.hexdigest():
            current_task.update_state(state='PROGRESS',  meta={'percentage': 100})
            return

    downloaded  = 0
    with open(filepath, 'w') as fp:
        for block in request.iter_content(1024):
            if not block:
                break

            fp.write(block)
            downloaded += 1024
            # update the task state
            percentage = int((downloaded / float(size)) * 100)
            current_task.update_state(state='PROGRESS',  meta={'percentage': percentage})

def status(taskId):
    task = AsyncResult(taskId, backend=celery.backend)

    percentage = 0
    if task.state == 'PROGRESS':
        percentage = task.result['percentage']
    elif task.state == 'SUCCESS':
        percentage = 100

    return percentage

from celery import Celery
from celery import task, current_task
from celery.result import AsyncResult
from celery.exceptions import SoftTimeLimitExceeded
import requests
import os.path
from functools import partial
import hashlib
from urlparse import urlparse
import geocelery_conf

mongo_url='mongodb://localhost/celery'
celery = Celery('download', broker=mongo_url, backend=mongo_url)

def download_dir():
    return "%s/esgf" % geocelery_conf.DOWNLOAD_DIR

def user_url_to_filepath(user_url):
    user_url = user_url.replace('https://', '')
    user_url = user_url.replace('http://', '')

    return user_url

def user_cert_file(user_url):
    filepath = user_url_to_filepath(user_url)

    return '%s/%s/cert.esgf' % (download_dir(), filepath)

def aquire_certificate(user_url, password):
    from myproxy.client import MyProxyClient

    try:
        filepath = user_url_to_filepath(user_url)
        host = urlparse(user_url).netloc;
        user = user_url.rsplit('/', 1)[1]
    except IndexError:
        raise Exception('Invalid OpenID identifier')

    if not host or not user:
        raise Exception('Invalid OpenID identifier')

    myproxy = MyProxyClient(hostname=host)
    credentials = myproxy.logon(user, password, bootstrap=True)

    cert_filepath = user_cert_file(user_url)

    dir = os.path.dirname(cert_filepath);
    if not os.path.exists(dir):
        os.makedirs(dir)

    with open(cert_filepath, 'w') as fd:
        fd.write(credentials[0])
        fd.write(credentials[1])

    return cert_filepath

def url_to_download_filepath(user_url, url):
    user_filepath = user_url_to_filepath(user_url)
    filepath = '%s/%s' %(download_dir(), user_filepath)
    filepath += url[6:]

    return filepath

@celery.task
def download(url, size, checksum, user_url, password):
    request = None
    filepath = None
    try:
        cert_filepath = aquire_certificate(user_url, password)
        request = requests.get(url,
                               cert=(cert_filepath, cert_filepath), verify=False, stream=True)

        if request.status_code != 200:
            raise Exception("HTTP status code: %s" % request.status)

        filepath = url_to_download_filepath(user_url, url)
        dir = os.path.dirname(filepath);
        if not os.path.exists(dir):
            os.makedirs(dir)

        # Now we know the user is authorized, first check if they have already
        # downloaded this file.
        filepath = url_to_download_filepath(user_url, url)

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
    except SoftTimeLimitExceeded:
        current_task.update_state(state='CANCELED')
        # Clean up the request and files
        if request:
            request.close()
        if os.path.exists(filepath):
            os.remove(filepath)

def status(taskId):
    task = AsyncResult(taskId, backend=celery.backend)

    status = {'state': str(task.state) }

    percentage = 0
    if task.state == 'PROGRESS':
        status['percentage'] = task.result['percentage']
    elif task.state == 'SUCCESS':
        status['percentage'] = 100
    elif task.state == 'FAILURE':
        status['message'] = str(task.result)

    return status

def cancel(taskId):
    task = AsyncResult(taskId, backend=celery.backend)
    task.revoke(celery.broker_connection(), terminate=True, signal="SIGUSR1")

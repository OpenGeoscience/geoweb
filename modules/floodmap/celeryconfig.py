BROKER_URL = "mongodb://ulmus/srtm-celery"
CELERY_RESULT_BACKEND = "mongodb"
CELERY_MONGODB_BACKEND_SETTINGS = {
    "host": "ulmus",
    "database": "srtm-celery"
}
CELERY_DEFAULT_DELIVERY_MODE= "transient"

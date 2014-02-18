#BROKER_URL = "mongodb://ulmus/srtm-celery"
BROKER_URL = 'redis://localhost:6379/0'
CELERY_RESULT_BACKEND = 'redis://localhost:6379/1'
#CELERY_RESULT_BACKEND = "mongodb"
# CELERY_MONGODB_BACKEND_SETTINGS = {
#     "host": "ulmus",
#     "database": "srtm-celery"
# }
CELERY_DEFAULT_DELIVERY_MODE= "transient"

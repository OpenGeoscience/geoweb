set(STATICDIR_ROOT)
set(SRC_DIR)
set(BIN_DIR)
set(DEPLOY_DIR)
set(DATA_DIR)
set(LOG_ERROR_FILE)
set(LOG_ACCESS_FILE)
set(GEOWEB_USER)
set(GEOWEB_GROUP)
set(VTK_ROOT)
set(VisTrails_ROOT)
set(GEOWEB_CMAKE_DIR)
set(GEOWEB_DEPLOY_DIR)

configure_file(${GEOWEB_CMAKE_DIR}/setup-runtime.sh.in
  ${GEOWEB_DEPLOY_DIR}/setup-runtime.sh @ONLY
)

configure_file(${GEOWEB_CMAKE_DIR}/configure_server.cmake.in
  ${CMAKE_CURRENT_BINARY_DIR}/configure_server.cmake @ONLY
)

configure_file(${GEOWEB_CMAKE_DIR}/run.sh.in
  ${GEOWEB_DEPLOY_DIR}/run.sh @ONLY
)

configure_file(${GEOWEB_CMAKE_DIR}/geocelery_conf.py.in
  ${GEOWEB_DEPLOY_DIR}/pygeo/geocelery_conf.py @ONLY
)

set(STATICDIR_ROOT)
set(SRC_DIR)
set(BIN_DIR)
set(DEPLOY_DIR)
set(DATA_ROOT)
set(LOG_ERROR_FILE)
set(LOG_ACCESS_FILE)
set(GEOWEB_USER)
set(GEOWEB_GROUP)
set(VTK_ROOT)
set(VisTrails_ROOT)
set(GEOWEB_CMAKE_DIR)
set(GEOWEB_DEPLOY_DIR)

configure_file(${GEOWEB_CMAKE_DIR}/setup-runtime.sh.in
  ${CMAKE_CURRENT_BINARY_DIR}/${GEOWEB_DEPLOY_DIR}/setup-runtime.sh @ONLY
)

configure_file(${GEOWEB_CMAKE_DIR}/configure_server.cmake.in
  ${CMAKE_CURRENT_BINARY_DIR}/configure_server.cmake @ONLY
)


configure_file(${GEOWEB_CMAKE_DIR}/run.sh.in
  ${CMAKE_CURRENT_BINARY_DIR}/${GEOWEB_DEPLOY_DIR}/run.sh @ONLY
)

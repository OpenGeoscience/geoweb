cmake_minimum_required(VERSION 2.8)
project(ClimatePipes)

# Extend cmake module path.
list(APPEND CMAKE_MODULE_PATH "${CMAKE_SOURCE_DIR}/cmake")

# Cache variables.
set(DEPLOY_TEST_SERVICES OFF CACHE BOOL "Deploy the \"testing\" web service modules.")
set(SERVER_HOSTNAME localhost CACHE STRING "The hostname of the machine that will run the server.")
set(SERVER_PORT 8080 CACHE STRING "The port the server will run on.")
set(MINIFY ON CACHE BOOL "Minify the JavaScript files prior to concatenating.")
set(MANGLE ON CACHE BOOL "When minifying, also mangle non-public symbol names.")
set(DOCUMENT OFF CACHE BOOL "Generate documentation for JavaScript files.")
set(SERVER_LOGS ON CACHE BOOL "Write cherrypy server access and error logs in deploy/logs")
set(DATA_ROOT "data" CACHE PATH "Root directory for the data")

# Non-cache variables.
set(DEPLOY_DIR deploy)
set_directory_properties(PROPERTIES ADDITIONAL_MAKE_CLEAN_FILES ${DEPLOY_DIR})

if(SERVER_LOGS)
    file(MAKE_DIRECTORY ${CMAKE_BINARY_DIR}/${DEPLOY_DIR}/logs)
    set(LOG_ERROR_FILE "logs/error.log")
    set(LOG_ACCESS_FILE "logs/access.log")
endif()

# Find JSLint.
find_package(JSLint)

# Find UglifyJS.
find_package(UglifyJS REQUIRED)

# Find JSDuck.
if (DOCUMENT)
  find_package(JSDuck)
endif()

# Find a Python2 interpreter.
find_package(PythonInterp 2.6)

# Create a "stamps" directory for storing fake targets for custom commands.
file(MAKE_DIRECTORY ${CMAKE_BINARY_DIR}/stamps)

# These files should be validated with JSLint.
set(JS_LINT_FILES
    ${CMAKE_SOURCE_DIR}/web/lib/vgl/gl-matrix.js
    ${CMAKE_SOURCE_DIR}/web/lib/geo/init.js
    ${CMAKE_SOURCE_DIR}/web/lib/geo/latlng.js
    ${CMAKE_SOURCE_DIR}/web/lib/geo/command.js
    ${CMAKE_SOURCE_DIR}/web/lib/geo/layer.js
    ${CMAKE_SOURCE_DIR}/web/lib/geo/map.js
    ${CMAKE_SOURCE_DIR}/web/lib/geo/feature.js
    ${CMAKE_SOURCE_DIR}/web/lib/geo/mapInteractorStyle.js
    ${CMAKE_SOURCE_DIR}/web/lib/vgl/boundingObject.js
    ${CMAKE_SOURCE_DIR}/web/lib/vgl/camera.js
    ${CMAKE_SOURCE_DIR}/web/lib/vgl/geoJSONUnpack.js
    ${CMAKE_SOURCE_DIR}/web/lib/vgl/geomData.js
    ${CMAKE_SOURCE_DIR}/web/lib/vgl/groupNode.js
    ${CMAKE_SOURCE_DIR}/web/lib/vgl/init.js
    ${CMAKE_SOURCE_DIR}/web/lib/vgl/timestamp.js
    ${CMAKE_SOURCE_DIR}/web/lib/vgl/mapper.js
    ${CMAKE_SOURCE_DIR}/web/lib/vgl/materialAttribute.js
    ${CMAKE_SOURCE_DIR}/web/lib/vgl/blend.js
    ${CMAKE_SOURCE_DIR}/web/lib/vgl/material.js
    ${CMAKE_SOURCE_DIR}/web/lib/vgl/modelViewMatrixStack.js
    ${CMAKE_SOURCE_DIR}/web/lib/vgl/node.js
    ${CMAKE_SOURCE_DIR}/web/lib/vgl/object.js
    ${CMAKE_SOURCE_DIR}/web/lib/vgl/renderer.js
    ${CMAKE_SOURCE_DIR}/web/lib/vgl/renderWindow.js
    ${CMAKE_SOURCE_DIR}/web/lib/vgl/interactorStyle.js
    ${CMAKE_SOURCE_DIR}/web/lib/vgl/viewer.js
    ${CMAKE_SOURCE_DIR}/web/lib/vgl/shader.js
    ${CMAKE_SOURCE_DIR}/web/lib/vgl/shaderProgram.js
    ${CMAKE_SOURCE_DIR}/web/lib/vgl/texture.js
    ${CMAKE_SOURCE_DIR}/web/lib/vgl/uniform.js
    ${CMAKE_SOURCE_DIR}/web/lib/vgl/vertexAttribute.js
    ${CMAKE_SOURCE_DIR}/web/lib/vgl/visitor.js
    ${CMAKE_SOURCE_DIR}/web/lib/vgl/vtkUnpack.js
    ${CMAKE_SOURCE_DIR}/web/lib/vgl/source.js
    ${CMAKE_SOURCE_DIR}/web/lib/vgl/planeSource.js
    ${CMAKE_SOURCE_DIR}/web/lib/vgl/pointSource.js
    ${CMAKE_SOURCE_DIR}/web/lib/vgl/utils.js
    ${CMAKE_SOURCE_DIR}/web/lib/vgl/command.js
)

# These files should be uglified and concatenated.
set(JS_UGLIFY_FILES
  ${CMAKE_SOURCE_DIR}/web/lib/vgl/gl-matrix.js
  ${CMAKE_SOURCE_DIR}/web/lib/vgl/init.js
  ${CMAKE_SOURCE_DIR}/web/lib/vgl/timestamp.js
  ${CMAKE_SOURCE_DIR}/web/lib/vgl/object.js
  ${CMAKE_SOURCE_DIR}/web/lib/vgl/command.js
  ${CMAKE_SOURCE_DIR}/web/lib/vgl/boundingObject.js
  ${CMAKE_SOURCE_DIR}/web/lib/vgl/node.js
  ${CMAKE_SOURCE_DIR}/web/lib/vgl/groupNode.js
  ${CMAKE_SOURCE_DIR}/web/lib/vgl/actor.js
  ${CMAKE_SOURCE_DIR}/web/lib/vgl/camera.js
  ${CMAKE_SOURCE_DIR}/web/lib/vgl/geoJSONUnpack.js
  ${CMAKE_SOURCE_DIR}/web/lib/vgl/geomData.js
  ${CMAKE_SOURCE_DIR}/web/lib/vgl/mapper.js
  ${CMAKE_SOURCE_DIR}/web/lib/vgl/materialAttribute.js
  ${CMAKE_SOURCE_DIR}/web/lib/vgl/blend.js
  ${CMAKE_SOURCE_DIR}/web/lib/vgl/material.js
  ${CMAKE_SOURCE_DIR}/web/lib/vgl/renderer.js
  ${CMAKE_SOURCE_DIR}/web/lib/vgl/renderWindow.js
  ${CMAKE_SOURCE_DIR}/web/lib/vgl/interactorStyle.js
  ${CMAKE_SOURCE_DIR}/web/lib/vgl/viewer.js
  ${CMAKE_SOURCE_DIR}/web/lib/vgl/shader.js
  ${CMAKE_SOURCE_DIR}/web/lib/vgl/shaderProgram.js
  ${CMAKE_SOURCE_DIR}/web/lib/vgl/texture.js
  ${CMAKE_SOURCE_DIR}/web/lib/vgl/uniform.js
  ${CMAKE_SOURCE_DIR}/web/lib/vgl/vertexAttribute.js
  ${CMAKE_SOURCE_DIR}/web/lib/vgl/source.js
  ${CMAKE_SOURCE_DIR}/web/lib/vgl/planeSource.js
  ${CMAKE_SOURCE_DIR}/web/lib/vgl/pointSource.js
  ${CMAKE_SOURCE_DIR}/web/lib/vgl/utils.js
  ${CMAKE_SOURCE_DIR}/web/lib/vgl/vtkUnpack.js
  ${CMAKE_SOURCE_DIR}/web/lib/geo/init.js
  ${CMAKE_SOURCE_DIR}/web/lib/geo/latlng.js
  ${CMAKE_SOURCE_DIR}/web/lib/geo/layer.js
  ${CMAKE_SOURCE_DIR}/web/lib/geo/command.js
  ${CMAKE_SOURCE_DIR}/web/lib/geo/mapInteractorStyle.js
  ${CMAKE_SOURCE_DIR}/web/lib/geo/map.js
  ${CMAKE_SOURCE_DIR}/web/lib/geo/feature.js
)

# These files should have documentation generated for them.
set(JS_DOCUMENT_FILES
  ${JS_UGLIFY_FILES}
)

# These files should be copied to the deployment directory.
set(SOURCES
    ogsctl
    modules/ogs.py
    modules/websocket_chat.py
    modules/websocket_pi.py
    modules/ogsvtk.py
    modules/cpi.py
)

set(DIRECTORIES
  web
)

configure_file(configure_server.cmake.in
  ${CMAKE_CURRENT_BINARY_DIR}/configure_server.cmake @ONLY
)

# Configure the server config file.
set(SERVER_CONFIG "${DEPLOY_DIR}/server.conf")
add_custom_command(OUTPUT ${CMAKE_BINARY_DIR}/${DEPLOY_DIR}/server.conf
  COMMAND ${CMAKE_COMMAND} -P
    ${CMAKE_CURRENT_BINARY_DIR}/configure_server.cmake
  DEPENDS
    ${CMAKE_CURRENT_BINARY_DIR}/configure_server.cmake
    ${CMAKE_CURRENT_SOURCE_DIR}/server.conf.in
  COMMENT "Configuring server configuration script"
  VERBATIM
)

# Copy the files to the deployment directory.
set(ALL_TARGETS)
foreach(m ${SOURCES})
    set(outfile ${DEPLOY_DIR}/modules/${m})
    add_custom_command(
        OUTPUT ${outfile}
        COMMAND ${CMAKE_COMMAND} -E copy ${CMAKE_SOURCE_DIR}/${m} ${CMAKE_BINARY_DIR}/${outfile}
        DEPENDS ${m}
    )
    list(APPEND ALL_TARGETS ${outfile})
endforeach()

# Copy directories to the deployment directory
foreach(m ${DIRECTORIES})
    set(outdir ${DEPLOY_DIR}/${m})
    add_custom_command(
        OUTPUT ${outdir}
        COMMAND ${CMAKE_COMMAND} -E copy_directory ${CMAKE_SOURCE_DIR}/${m} ${CMAKE_BINARY_DIR}/${outdir}
        DEPENDS ${m}
    )
    list(APPEND ALL_TARGETS ${outdir})
endforeach()


# Uglify and concatenate the library js files.
if(NOT ${MINIFY})
    set(MINIFY_FLAG "-b")
endif()

if(${MINIFY} AND ${MANGLE})
    set(MANGLE_FLAG "-m")
endif()

set(MIN_JS_FILE ${CMAKE_BINARY_DIR}/${DEPLOY_DIR}/web/lib/ogs.min.js)

# Check why xdata does not need to do this
if(NOT EXISTS "${CMAKE_BINARY_DIR}/${DEPLOY_DIR}/web/lib")
  execute_process(COMMAND ${CMAKE_COMMAND} -E make_directory "${CMAKE_BINARY_DIR}/${DEPLOY_DIR}/web/lib")
endif()

add_custom_command(
    OUTPUT ${MIN_JS_FILE}
    COMMAND ${UglifyJS_EXECUTABLE} -o ${MIN_JS_FILE} ${JS_UGLIFY_FILES} ${MINIFY_FLAG} ${MANGLE_FLAG}
    DEPENDS ${JS_UGLIFY_FILES}
)

# Generate documentation.
set(DOCUMENTATION_STAMP ${CMAKE_BINARY_DIR}/stamps/documentation.txt)
set(DOCUMENTATION_DIR ${CMAKE_BINARY_DIR}/doc)
if(DOCUMENT)
    add_custom_command(
        OUTPUT ${DOCUMENTATION_STAMP}
        COMMAND ${CMAKE_COMMAND} -E remove_directory ${DOCUMENTATION_DIR}
        COMMAND ${JSDuck_EXECUTABLE} ${JSDuck_ARGS} ${JS_DOCUMENT_FILES} --builtin-classes --output ${DOCUMENTATION_DIR}
        COMMAND ${CMAKE_COMMAND} -E touch ${DOCUMENTATION_STAMP}
        DEPENDS ${JS_DOCUMENT_FILES}
    )

    # Remove the stamp file, which may have been trivially generated in a
    # previous configure step by the else portion of this if-block.
    file(REMOVE ${DOCUMENTATION_STAMP})
else()
    # Use a dummy custom command rather than a call to file() in case someone
    # deletes the stamp file for some reason.  In that case, the custom command
    # will regenerate the file without complaints, whereas the call to file()
    # wouldn't, instead resulting in an error.
    add_custom_command(
        OUTPUT ${DOCUMENTATION_STAMP}
        COMMAND ${CMAKE_COMMAND} -E touch ${DOCUMENTATION_STAMP}
    )
endif()

# The top-level target.
add_custom_target(
    deploy
    ALL
    DEPENDS ${ALL_TARGETS} ${MIN_JS_FILE} ${SERVER_CONFIG} ${DOCUMENTATION_STAMP}
)

# Testing
include(CTest)
enable_testing()

# JSLint tests.
foreach(f ${JS_LINT_FILES})
    add_test(jslint-${f} ${JSLint_EXECUTABLE} ${f})
endforeach(

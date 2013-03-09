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
set(DATA_ROOT "" CACHE PATH "Root directory for the data")

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

# Find JSDoc.
find_package(JSDoc)

# Find a Python2 interpreter.
find_package(PythonInterp 2.6)

# Create a "stamps" directory for storing fake targets for custom commands.
file(MAKE_DIRECTORY ${CMAKE_BINARY_DIR}/stamps)

# These files should be validated with JSLint.
set(JS_LINT_FILES
    ${CMAKE_SOURCE_DIR}/web/lib/init.js
    ${CMAKE_SOURCE_DIR}/web/lib/jsHelper.js
    ${CMAKE_SOURCE_DIR}/web/lib/core/init.js
    ${CMAKE_SOURCE_DIR}/web/lib/geo/init.js
    ${CMAKE_SOURCE_DIR}/web/lib/geo/latlng.js
    ${CMAKE_SOURCE_DIR}/web/lib/geo/layer.js
    ${CMAKE_SOURCE_DIR}/web/lib/geo/map.js
    ${CMAKE_SOURCE_DIR}/web/lib/geo/feature.js
    ${CMAKE_SOURCE_DIR}/web/lib/vgl/boundingObject.js
    ${CMAKE_SOURCE_DIR}/web/lib/vgl/camera.js
    ${CMAKE_SOURCE_DIR}/web/lib/vgl/geomData.js
    ${CMAKE_SOURCE_DIR}/web/lib/vgl/groupNode.js
    ${CMAKE_SOURCE_DIR}/web/lib/vgl/init.js
    ${CMAKE_SOURCE_DIR}/web/lib/vgl/mapper.js
    ${CMAKE_SOURCE_DIR}/web/lib/vgl/materialAttribute.js
    ${CMAKE_SOURCE_DIR}/web/lib/vgl/blend.js
    ${CMAKE_SOURCE_DIR}/web/lib/vgl/material.js
    ${CMAKE_SOURCE_DIR}/web/lib/vgl/modelViewMatrixStack.js
    ${CMAKE_SOURCE_DIR}/web/lib/vgl/node.js
    ${CMAKE_SOURCE_DIR}/web/lib/vgl/object.js
    ${CMAKE_SOURCE_DIR}/web/lib/vgl/renderer.js
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
)

# These files should be uglified and concatenated.
set(JS_UGLIFY_FILES
  ${CMAKE_SOURCE_DIR}/web/lib/init.js
  ${CMAKE_SOURCE_DIR}/web/lib/jsHelper.js
  ${CMAKE_SOURCE_DIR}/web/lib/core/init.js
  ${CMAKE_SOURCE_DIR}/web/lib/vgl/init.js
  ${CMAKE_SOURCE_DIR}/web/lib/vgl/object.js
  ${CMAKE_SOURCE_DIR}/web/lib/vgl/boundingObject.js
  ${CMAKE_SOURCE_DIR}/web/lib/vgl/node.js
  ${CMAKE_SOURCE_DIR}/web/lib/vgl/groupNode.js
  ${CMAKE_SOURCE_DIR}/web/lib/vgl/actor.js
  ${CMAKE_SOURCE_DIR}/web/lib/vgl/camera.js
  ${CMAKE_SOURCE_DIR}/web/lib/vgl/geomData.js
  ${CMAKE_SOURCE_DIR}/web/lib/vgl/mapper.js
  ${CMAKE_SOURCE_DIR}/web/lib/vgl/materialAttribute.js
  ${CMAKE_SOURCE_DIR}/web/lib/vgl/blend.js
  ${CMAKE_SOURCE_DIR}/web/lib/vgl/material.js
  ${CMAKE_SOURCE_DIR}/web/lib/vgl/renderer.js
  ${CMAKE_SOURCE_DIR}/web/lib/vgl/shader.js
  ${CMAKE_SOURCE_DIR}/web/lib/vgl/shaderProgram.js
  ${CMAKE_SOURCE_DIR}/web/lib/vgl/texture.js
  ${CMAKE_SOURCE_DIR}/web/lib/vgl/uniform.js
  ${CMAKE_SOURCE_DIR}/web/lib/vgl/vertexAttribute.js
  ${CMAKE_SOURCE_DIR}/web/lib/vgl/source.js
  ${CMAKE_SOURCE_DIR}/web/lib/vgl/planeSource.js
  ${CMAKE_SOURCE_DIR}/web/lib/vgl/pointSource.js
  ${CMAKE_SOURCE_DIR}/web/lib/vgl/utils.js
  ${CMAKE_SOURCE_DIR}/web/lib/geo/init.js
  ${CMAKE_SOURCE_DIR}/web/lib/geo/latlng.js
  ${CMAKE_SOURCE_DIR}/web/lib/geo/layer.js
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
    ogs.py
    websocket_chat.py
    websocket_pi.py
    cpi.py
    web/index.html
    web/lib/app.js
    web/lib/gl-matrix.js
    web/lib/glUtils.js
    web/lib/sylvester.js
)

if(DEPLOY_TEST_SERVICES)
    #list(APPEND SOURCES)
endif()

# Configure the server config file.
configure_file(
    server.conf.in
    ${CMAKE_BINARY_DIR}/${DEPLOY_DIR}/server.conf)

# Configure the Python testing driver.
#configure_file(
#    testing/xdwpytest.py.in
#    ${CMAKE_BINARY_DIR}/xdwpytest.py
#)

# Copy the files to the deployment directory.
set(ALL_TARGETS)
foreach(m ${SOURCES})
    set(outfile ${DEPLOY_DIR}/${m})
    add_custom_command(
        OUTPUT ${outfile}
        COMMAND ${CMAKE_COMMAND} -E copy ${CMAKE_SOURCE_DIR}/${m} ${CMAKE_BINARY_DIR}/${outfile}
        DEPENDS ${m}
    )
    list(APPEND ALL_TARGETS ${outfile})
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

# Copy data to the deploy directory
if (NOT  "${DATA_ROOT}" STREQUAL "")
  add_custom_target(copy_data
    COMMAND ${CMAKE_COMMAND} -E copy_directory
    "${DATA_ROOT}"
    "${CMAKE_BINARY_DIR}/${DEPLOY_DIR}/data"
  )

  add_custom_target(clean_data
    COMMAND ${CMAKE_COMMAND} -E remove_directory
    "${CMAKE_BINARY_DIR}/${DEPLOY_DIR}/data"
  )
endif()

add_custom_command(
    OUTPUT ${MIN_JS_FILE}
    COMMAND ${UglifyJS_EXECUTABLE} -o ${MIN_JS_FILE} ${JS_UGLIFY_FILES} ${MINIFY_FLAG} ${MANGLE_FLAG}
    DEPENDS ${JS_UGLIFY_FILES}
)

# Generate documentation.
set(DOCUMENTATION_STAMP ${CMAKE_BINARY_DIR}/stamps/documentation.txt)
set(DOCUMENTATION_DIR ${CMAKE_BINARY_DIR}/jsdoc)
if(${DOCUMENT})
    add_custom_command(
        OUTPUT ${DOCUMENTATION_STAMP}
        COMMAND ${CMAKE_COMMAND} -E remove_directory ${DOCUMENTATION_DIR}
        COMMAND ${JSDoc_EXECUTABLE} ${JSDoc_ARGS} ${JS_DOCUMENT_FILES} -p -d=${DOCUMENTATION_DIR}
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
    DEPENDS ${ALL_TARGETS} ${MIN_JS_FILE} ${DOCUMENTATION_STAMP}
)

# Testing
include(CTest)
enable_testing()

# JSLint tests.
foreach(f ${JS_LINT_FILES})
    add_test(jslint-${f} ${JSLint_EXECUTABLE} ${f})
endforeach()

# Python web service tests.
#set(PYTEST ${PYTHON_EXECUTABLE} ${CMAKE_BINARY_DIR}/xdwpytest.py)

#add_test(xdw-NER ${PYTEST} NER "Toto, I've got a feeling we're not in Kansas anymore." "{\"result\": [[\"GPE\", \"Toto\"], [\"GPE\", \"Kansas\"]], \"error\": null}")

#if(DEPLOY_TEST_SERVICES)
#    add_test(xdw-echo-blank ${PYTEST} echo "(No arguments passed)")
#    add_test(xdw-echo ${PYTEST} echo jan feb mar color=red answer=42 "[jan, feb, mar]\ncolor -> red\nanswer -> 42\n")
#endif()

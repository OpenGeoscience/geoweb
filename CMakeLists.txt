#/////////////////////////////////////////////////////////////////////////////
#
# GeoWeb
#
#/////////////////////////////////////////////////////////////////////////////

cmake_minimum_required(VERSION 2.8)
project(geoweb)

set(STATICDIR_ROOT "geoweb.current_dir")

option(DEV_BUILD "Allow running from source tree" OFF)
if (DEV_BUILD)
  set(STATICDIR_ROOT "${CMAKE_SOURCE_DIR}")
endif()

# Extend cmake module path.
list(APPEND CMAKE_MODULE_PATH "${CMAKE_SOURCE_DIR}/cmake")

#/////////////////////////////////////////////////////////////////////////////
#
# GeoWeb options
#
#/////////////////////////////////////////////////////////////////////////////

set(DEPLOY_TEST_SERVICES OFF CACHE BOOL "Deploy the \"testing\" web service modules.")
set(SERVER_HOSTNAME localhost CACHE STRING "The hostname of the machine that will run the server.")
set(SERVER_PORT 8080 CACHE STRING "The port the server will run on.")
set(MINIFY ON CACHE BOOL "Minify the JavaScript files prior to concatenating.")
set(MANGLE ON CACHE BOOL "When minifying, also mangle non-public symbol names.")
set(DOCUMENT OFF CACHE BOOL "Generate documentation for JavaScript files.")
set(SERVER_LOGS ON CACHE BOOL "Write cherrypy server access and error logs in deploy/logs")
set(SERVER_DEBUG ON CACHE BOOL "Write debug statements to error logs")
set(DATA_DIR "data" CACHE PATH "Root directory for the data")
set(BASELINE_DIR "" CACHE PATH "Path to directory containing baseline images for testing.")
set(GEOWEB_USER $ENV{USER} CACHE STRING "User to run geoweb as when dropping privileges")
set(GEOWEB_GROUP $ENV{USER} CACHE STRING "Group to run geoweb as when dropping privileges")
set(BUILD_TESTING OFF CACHE BOOL "Enable testing")


#/////////////////////////////////////////////////////////////////////////////
#
# Internal variables
#
#/////////////////////////////////////////////////////////////////////////////

set(GEOWEB_DEPLOY_DIR "${CMAKE_CURRENT_BINARY_DIR}/deploy"
    CACHE PATH "PATH to deployment directory")
set(GEOWEB_DEPLOY_LIB_DIR "${GEOWEB_DEPLOY_DIR}/web/lib")
set(GEOJS_DEPLOY_DIR "${GEOWEB_DEPLOY_DIR}")
set(GEOJS_DEPLOY_LIB_DIR "${GEOWEB_DEPLOY_LIB_DIR}")

set(_deploy_depends)
set(_geoweb_cmake_dir "${CMAKE_CURRENT_SOURCE_DIR}/cmake")

# These files should be validated with JSLint.
set(_js_lint_files)
set_directory_properties(PROPERTIES ADDITIONAL_MAKE_CLEAN_FILES ${GEOWEB_DEPLOY_DIR})

#/////////////////////////////////////////////////////////////////////////////
#
# Find required packages
#
#/////////////////////////////////////////////////////////////////////////////

# VTK is required
find_package(VTK REQUIRED)

# VisTrails is required
find_package(VisTrails REQUIRED)

# Find JSLint.
find_package(JSLint)

# Find UglifyJS.
find_package(UglifyJS)

# Find JSDuck.
if (DOCUMENT)
  find_package(JSDuck)
endif()

# Find a Python2 interpreter.
include(FindPythonInterp)
find_package(PythonInterp 2.7)
set(PYVER ${PYTHON_VERSION_MAJOR}.${PYTHON_VERSION_MINOR})

message(STATUS "Python version is ", ${PYVER})

#/////////////////////////////////////////////////////////////////////////////
#
# Add source files and directories
#
#/////////////////////////////////////////////////////////////////////////////

# Create a "stamps" directory for storing fake targets for custom commands.
file(MAKE_DIRECTORY ${CMAKE_BINARY_DIR}/stamps)

# These files should be copied to the deployment directory.
set(sources
    geoweb geoweb.py geocelery login.html
)

set(paths
  web/apps web/common web/index.html utils
  nodes services temp
)

set(_lib_dir "${GEOWEB_DEPLOY_LIB_DIR}")
add_custom_command(OUTPUT ${_lib_dir}
  COMMAND ${CMAKE_COMMAND} -E make_directory ${_lib_dir}
)

#/////////////////////////////////////////////////////////////////////////////
#
# Create custom commands and necessary build pieces
#
#/////////////////////////////////////////////////////////////////////////////

# Copy the files to the deployment directory.
set(all_targets)
foreach(m ${sources})
  set(outfile ${GEOWEB_DEPLOY_DIR}/${m})
  add_custom_command(OUTPUT ${outfile}
    COMMAND ${CMAKE_COMMAND} -E copy
      ${CMAKE_SOURCE_DIR}/${m} ${outfile}
    DEPENDS ${m}
  )
  list(APPEND all_targets ${outfile})
endforeach()

# Copy directories / files to the deployment directory
foreach(m ${paths})
    set(copy_command "copy")
    if (IS_DIRECTORY "${CMAKE_SOURCE_DIR}/${m}")
      set(copy_command "copy_directory")
    endif()
    set(outpath ${GEOWEB_DEPLOY_DIR}/${m})
    add_custom_command(
        OUTPUT ${outpath}
        COMMAND ${CMAKE_COMMAND} -E ${copy_command}
          ${CMAKE_SOURCE_DIR}/${m} ${outpath}
        DEPENDS ${m}
    )
    list(APPEND all_targets ${outpath})
endforeach()
add_custom_target(bar ALL DEPENDS ${all_targets})

message(STATUS "${geoweb_SOURCE_DIR}/ocgis")

set(GAIA_BUILD_BASE "${${PROJECT_NAME}_BINARY_DIR}")
add_subdirectory(gaia)

# Install OCGIS
add_custom_command(
  OUTPUT "${GEOWEB_DEPLOY_DIR}/lib/python${PYVER}/site-packages/ocgis"
  COMMAND "${PYTHON_EXECUTABLE}" setup.py build --build-base "${${PROJECT_NAME}_BINARY_DIR}" install
          --prefix="${GEOWEB_DEPLOY_DIR}"
  WORKING_DIRECTORY "${geoweb_SOURCE_DIR}/ocgis"
)
add_custom_target(ocgis ALL DEPENDS
  "${GEOWEB_DEPLOY_DIR}/lib/python${PYVER}/site-packages/ocgis")


# Uglify and concatenate the library js files.
if(NOT ${MINIFY})
    set(MINIFY_FLAG "-b")
endif()

if(${MINIFY} AND ${MANGLE})
    set(MANGLE_FLAG "-m")
endif()

set(_logs_dir ${GEOWEB_DEPLOY_DIR}/logs)
add_custom_command(
  OUTPUT ${_logs_dir}
  COMMAND ${CMAKE_COMMAND} -E make_directory
    ${GEOWEB_DEPLOY_DIR}/logs
)

if(SERVER_LOGS)
    set(LOG_ERROR_FILE "${_logs_dir}/error.log")
    set(LOG_ACCESS_FILE "${_logs_dir}/access.log")
endif()

if(SERVER_DEBUG)
  set(LOG_DEBUG "True")
else()
  set(LOG_DEBUG "False")
endif()

#/////////////////////////////////////////////////////////////////////////////
#
# Generate documentation
#
#/////////////////////////////////////////////////////////////////////////////

set(documentation_stamp ${CMAKE_BINARY_DIR}/stamps/documentation.txt)
set(documenation_dir ${CMAKE_BINARY_DIR}/doc)
if(DOCUMENT)
    add_custom_command(
        OUTPUT ${documentation_stamp}
        COMMAND ${CMAKE_COMMAND} -E remove_directory ${documenation_dir}
        COMMAND ${JSDuck_EXECUTABLE} ${JSDuck_ARGS}
          ${_js_document_files} --builtin-classes --output ${documenation_dir}
        COMMAND ${CMAKE_COMMAND} -E touch ${documentation_stamp}
        DEPENDS ${_js_document_files}
    )

    # Remove the stamp file, which may have been trivially generated in a
    # previous configure step by the else portion of this if-block.
    file(REMOVE ${documentation_stamp})
else()
    # Use a dummy custom command rather than a call to file() in case someone
    # deletes the stamp file for some reason.  In that case, the custom command
    # will regenerate the file without complaints, whereas the call to file()
    # wouldn't, instead resulting in an error.
    add_custom_command(
        OUTPUT ${documentation_stamp}
        COMMAND ${CMAKE_COMMAND} -E touch ${documentation_stamp}
    )
endif()

#/////////////////////////////////////////////////////////////////////////////
#
# Add top level target
#
#/////////////////////////////////////////////////////////////////////////////

add_custom_target(geoweb_pre_deploy ALL
  COMMAND ${CMAKE_COMMAND}
   -DSTATICDIR_ROOT=${STATICDIR_ROOT}
   -DSRC_DIR=${SRC_DIR}
   -DBIN_DIR=${BIN_DIR}
   -DDATA_DIR=${DATA_DIR}
   -DLOG_ERROR_FILE=${LOG_ERROR_FILE}
   -DLOG_ACCESS_FILE=${LOG_ACCESS_FILE}
   -DGEOWEB_USER=${GEOWEB_USER}
   -DGEOWEB_GROUP=${GEOWEB_GROUP}
   -DVTK_DIR=${VTK_DIR}
   -DVisTrails_DIR=${VisTrails_DIR}
   -DGEOWEB_CMAKE_DIR=${_geoweb_cmake_dir}
   -DGEOWEB_DEPLOY_DIR=${GEOWEB_DEPLOY_DIR}
   -DPYVER=${PYVER}
   -P ${_geoweb_cmake_dir}/configure.cmake
  DEPENDS
    ${_lib_dir} ${all_targets} ${_logs_dir}
    ${documentation_stamp}
)

set(_server_config "${GEOWEB_DEPLOY_DIR}/server.conf")
add_custom_command(OUTPUT ${GEOWEB_DEPLOY_DIR}/server.conf
  COMMAND ${CMAKE_COMMAND} -P
    ${CMAKE_CURRENT_BINARY_DIR}/configure_server.cmake
  DEPENDS
    ${CMAKE_CURRENT_BINARY_DIR}/configure_server.cmake
    ${_geoweb_cmake_dir}/server.conf.in
  COMMENT "Configuring server configuration script"
  VERBATIM
)

add_custom_target(deploy ALL DEPENDS ${_server_config})
add_dependencies(geoweb_pre_deploy gaia)
add_dependencies(geoweb_pre_deploy ocgis)
add_dependencies(deploy ocgis)
add_dependencies(deploy geoweb_pre_deploy)

# Testing
if (BUILD_TESTING)
  include(CTest)
  enable_testing()

  if(EXISTS "${DATA_DIR}" AND IS_DIRECTORY "${DATA_DIR}")
    message("[info] GeoWeb data directory is set to ${DATA_DIR}")
    set(GEOJS_DATA_DIR "${DATA_DIR}")
  else()
    message(FATAL_ERROR "GeoWeb testing requires valid data directory")
  endif()

  if(EXISTS "${BASELINE_DIR}" AND IS_DIRECTORY "${BASELINE_DIR}")
    message("[info] GeoWeb baseline directory is set to ${BASELINE_DIR}")
    set(GEOJS_BASELINE_DIR "${BASELINE_DIR}")
  else()
    message(FATAL_ERROR "GeoWeb testing requires valid baseline directory")
  endif()
endif()

# Now include sub-directories
add_subdirectory(web)
add_dependencies(geojs geoweb_pre_deploy)


#/////////////////////////////////////////////////////////////////////////////
#
# Add pieces for testing if enabled
#
#/////////////////////////////////////////////////////////////////////////////

# Testing
if (BUILD_TESTING)
  include(CTest)
  enable_testing()
endif()

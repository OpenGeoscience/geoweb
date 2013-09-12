cmake_minimum_required(VERSION 2.8.10)

if(UNIX)
  set(PLATFORM_SPECIFIC_CACHE_DATA "
    CMAKE_INSTALL_PREFIX:PATH=/usr/local
  ")
else()
  if(WIN32)
    set(PLATFORM_SPECIFIC_CACHE_DATA "
      GITCOMMAND:FILEPATH=${CTEST_GIT_COMMAND}
      git_command:FILEPATH=${CTEST_GIT_COMMAND}
    ")
  endif()
endif()

# Populate CMakeCache with block of initial data
message("[INFO] writing to ${CTEST_BINARY_DIRECTORY}/CMakeCache.txt")
file(
  # CMake settings
  WRITE "${CTEST_BINARY_DIRECTORY}/CMakeCache.txt"
  "CMAKE_BUILD_TYPE:STRING=${CTEST_BUILD_CONFIGURATION}
  BUILD_TESTING:BOOL=ON
  DART_TESTING_TIMEOUT:STRING=1500
  VTK_DIR=/home/kitware/tools/vtk/build
  VisTrails_DIR=/home/kitware/tools/vistrails/src.git
  UPDATE_TYPE:STRING=git
  ${PLATFORM_SPECIFIC_CACHE_DATA}"
)

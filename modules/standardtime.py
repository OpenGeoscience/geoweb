def attrib_to_converters(string):
    """Poor man's udunits.
    Give this a udunit's time attribute and it will generate functions to
    convert numbers in that calendar to and from a standard numerical format.
    If returns False on error.
    Note: using udunits is preferable but I haven't yet gotten it to work well on my system.
    """

    if not string or not "since" in string:
        return False
    print string
    parts = string.split("since")
    units = parts[0].strip()

    if (units != "days" and
        units != "weeks" and
        units != "months" and
        units != "years"):
        return False
    print units

    after = parts[1].strip()
    startDate = after.split(" ")[0]
    start_year = int(startDate.split("-")[0])
    print "Y0", start_year
    start_month = int(startDate.split("-")[1])
    print "M0", start_month
    start_day = int(startDate.split("-")[2])
    print "D0", start_day

    ylen = 365
    def number_to_absday(x):
        print "d(", x, ")=",
        mult = 1
        if units == "weeks":
            mult = 7
        if units == "months":
            mult = ylen/12
        if units == "years":
            mult = ylen
        days = x*mult+start_year*ylen+start_month*ylen/12+start_day
        print days
        return days

    def absday_to_ymd(x):
        print "x = ", x
        print "ylen = ", ylen
        year = x/ylen
        print year
        month = (x%ylen)/(ylen/12)
        print "month = ", month
        day = (x%ylen)%(ylen/12)
        print "day = ", day

        return year,month,day

    return number_to_absday, absday_to_ymd, units, startDate

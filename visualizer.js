document.getElementById('csvFileInput').addEventListener('change', function (event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const text = e.target.result;
            //get user data from first line
            //      what is,,date of when,,owner name
            setUserInfo(text);
            //make the date col a date type
            var data = parseCSVDateTime(text);
            //sort by date
            data = sortByDate(data);
            //group by day
            data = groupByDay(data);
            //for each day'
            data = groupByHour(data);
            //  make and lable a new chart under the last one
            //  group by hour
            //    for each hour
            //       for each row
            //          if record type == 0 or 1 then get data for ploting to line graph
            //          if record type == 4 flag hour for meal
            //          if record type == 5 get data and flag hour with data in insulin section
            //          if record type == 6 then put any notes in a notes section under the hour
            generateDayTables(data);

            console.log(data);
        };
        reader.readAsText(file);
    }
});
function sout(a, b) {
    console.log("(" + a + "," + b + ")");
}
function makeDate(csvDateText) {
    const [day, month, year, hour, minute] = csvDateText.split(/[-\s:]/);
    let dateObj = new Date(year, month - 1, day, hour, minute);

    // Adjusting for the local timezone offset
    let timezoneOffset = dateObj.getTimezoneOffset(); // in minutes
    //dateObj.setMinutes(dateObj.getMinutes() - timezoneOffset);

    return dateObj;
}
function setUserInfo(csvFileText) {
    const lines = csvFileText.trim().split('\r\n');
    const userData = lines[0].split(',');
    var whatis = document.getElementById("WhatIS");
    whatis.innerHTML = userData[0];
    var owner = document.getElementById("Owner");
    owner.innerHTML = userData[4];
    var whenIs = document.getElementById("WhenIs");
    whenIs.innerHTML = userData[2];
}

/**
 * 
 * @param {Text from csv} csvFileText 
 * @returns {JSON data} with "Device Timestamp" converted to utc
 */

function parseCSVDateTime(csvFileText) {
    const lines = csvFileText.trim().split('\r\n');
    const headers = lines[1].split(',');
    var result = [];
    for (var i = 2; i < lines.length; i++) {
        var obj = {};
        var currentline = lines[i].split(",");

        for (var j = 0; j < headers.length; j++) {
            switch (headers[j]) {
                case "Device Timestamp":
                    obj[headers[j]] = makeDate(currentline[j]);
                    break;
                default:
                    obj[headers[j]] = currentline[j];
            }

        }

        result.push(obj);
    }
    return result;
}

/**
 * @param {JSON data} data 
 * @returns {JSON data} that is sortted by "Device Timestamp"
 */
function sortByDate(data) {
    data.sort((a, b) => {
        const dataA = a["Device Timestamp"];
        const dataB = b["Device Timestamp"];
        return dataA - dataB;
    });
    return data;
}

/**
 * @param {JSON data} data 
 * @returns {JSON data} that is split into days
 */
function groupByDay(data) {
    var result = {};

    // Ensure the timestamps are in local time
    data.forEach(item => item["Device Timestamp"] = new Date(item["Device Timestamp"]));

    // Group data by day
    data.forEach(item => {
        var itemDate = new Date(item["Device Timestamp"]);
        var d = itemDate.getDate();
        d = d <= 9 ? '0' + d : d;
        var m = itemDate.getMonth() + 1;
        m = m <= 9 ? '0' + m : m;
        var y = itemDate.getFullYear();

        var dayString = y + "-" + m + "-" + d;


        if (!result[dayString]) {
            result[dayString] = {
                day: dayString,
                daysdata: []
            };
        }

        result[dayString].daysdata.push(item);
    });

    return result;
}
/**
 * @param {Object} groupedData - The output object from the groupByDay function.
 * @returns {Object} - JSON object with data split into hours and processed.
 */
function groupByHour(groupedData) {
    var result = {};

    // Process each day
    for (var day in groupedData) {
        var dayData = groupedData[day].daysdata;

        var hourlyData = {};

        // Group data by hour
        for (var hour = 0; hour < 24; hour++) {
            var hourStart = new Date(day + `T${String(hour).padStart(2, '0')}:00:00`);
            var hourEnd = new Date(day + `T${String(hour + 1).padStart(2, '0')}:00:00`);
            var hourKey = hourStart.toLocaleTimeString('en-CA', { hour: '2-digit', hour12: false });

            // Initialize hourly data
            hourlyData[hourKey] = {
                maxGlucose: null,
                minGlucose: null,
                nonNumericFood: false,
                insulin: null,
                notes: '',
                hoursdata: [],
                glData: []
            };

            // Filter data for the current hour
            var filteredData = dayData.filter(item => {
                var timestamp = new Date(item["Device Timestamp"]);
                return timestamp >= hourStart && timestamp < hourEnd;
            });

            // Continue with processing as before...

            if (filteredData.length > 0) {
                hourlyData[hourKey].hoursdata = filteredData.map(item => ({ ...item }));

                hourlyData[hourKey].nonNumericFood = filteredData.some(item => item["Non-numeric Food"] == 1);

                filteredData.forEach(item => {
                    var scanGlucose = parseFloat(item["Scan Glucose mmol/L"]);
                    var historicGlucose = parseFloat(item["Historic Glucose mmol/L"]);

                    if (!isNaN(scanGlucose) || !isNaN(historicGlucose)) {
                        var combinedGlucose = [scanGlucose, historicGlucose].filter(v => !isNaN(v));

                        var dateString = dateToStr(item["Device Timestamp"]);

                        var glblock = { "x": dateString, "y": combinedGlucose[0],"flag": false};
                        hourlyData[hourKey].glData.push(glblock);

                        if (combinedGlucose.length > 0) {
                            var maxGlucose = Math.max(...combinedGlucose);
                            var minGlucose = Math.min(...combinedGlucose);

                            if (hourlyData[hourKey].maxGlucose === null || maxGlucose > hourlyData[hourKey].maxGlucose) {
                                hourlyData[hourKey].maxGlucose = maxGlucose;
                            }
                            if (hourlyData[hourKey].minGlucose === null || minGlucose < hourlyData[hourKey].minGlucose) {
                                hourlyData[hourKey].minGlucose = minGlucose;
                            }
                        }
                    }

                    if (item["Long-Acting Insulin (units)"] !== null
                        && item["Long-Acting Insulin (units)"] !== ''
                        && item["Long-Acting Insulin (units)"] !== 'null') {
                        hourlyData[hourKey].insulin = parseFloat(item["Long-Acting Insulin (units)"]);
                    }

                    if (item["Notes"] !== null && item["Notes"] !== '') {
                        hourlyData[hourKey].notes += item["Notes"] + ' ';
                    }
                });

                hourlyData[hourKey].notes = hourlyData[hourKey].notes.trim();
            }
        }

        result[day] = hourlyData;
    }

    return result;
}


function generateDayTables(data) {
    const container = document.getElementById('chart-container');

    for (const [day, hourlyData] of Object.entries(data)) {
        // Create a new div for each day
        const dayDiv = document.createElement('div');
        dayDiv.className = 'day-table-container';
        dayDiv.setAttribute('data-day', day); // Set data-day attribute for identification

        // Create the table
        const table = document.createElement('table');
        table.className = 'day-table';

        // Create table header
        const headerRow = document.createElement('tr');
        const dateHeader = document.createElement('th');
        var d = new Date(day);
        d.setDate(d.getDate() + 1);
        const weekday = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const month = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const niceDate = weekday[d.getDay()] + ", " + month[d.getMonth()] + " " + d.getDate();
        dateHeader.innerText = niceDate;
        dateHeader.style.width = '100px'; // Adjust width as needed
        dateHeader.colSpan = 25;
        headerRow.appendChild(dateHeader);

        // for (let hour = 0; hour < 24; hour++) {
        //     const th = document.createElement('th');
        //     headerRow.appendChild(th);
        // }
        table.appendChild(headerRow);

        // Create table rows
        const rows = [
            { class: 'blank-row', text: '' },
            { class: 'max-glucose-row', text: 'Max Glucose' },
            { class: 'min-glucose-row', text: 'Min Glucose' },
            { class: 'non-numeric-food-row', text: 'Food' },
            { class: 'insulin-row', text: 'Long Acting Insulin' },
            { class: 'notes-row', text: 'Notes' }
        ];

        rows.forEach(row => {
            const tr = document.createElement('tr');
            tr.className = row.class;

            // Create the date cell
            const dateCell = document.createElement('td');
            dateCell.innerText = row.text;
            if (row.class === 'blank-row') {
                dateCell.colSpan = 25;
            }
            tr.appendChild(dateCell);

            // Create the data cells
            for (let hour = 0; hour < 24; hour++) {
                if (row.class !== 'blank-row') {
                    const td = document.createElement('td');
                    // Add cell content based on the row type
                    if (row.class === 'max-glucose-row') {
                        td.innerText = data[day][String(hour).padStart(2, '0')]?.maxGlucose ?? '';
                    } else if (row.class === 'min-glucose-row') {
                        td.innerText = data[day][String(hour).padStart(2, '0')]?.minGlucose ?? '';
                    } else if (row.class === 'non-numeric-food-row') {
                        td.innerHTML = data[day][String(hour).padStart(2, '0')]?.nonNumericFood ? '🍎' : '';
                    } else if (row.class === 'insulin-row') {
                        td.innerText = data[day][String(hour).padStart(2, '0')]?.insulin ?? '';
                    } else if (row.class === 'notes-row') {
                        var tepnote = data[day][String(hour).padStart(2, '0')]?.notes;
                        td.innerText = tepnote ? "►" + tepnote : '';
                    }
                    tr.appendChild(td);
                }
            }

            table.appendChild(tr);


        });

        dayDiv.appendChild(table);
        container.appendChild(dayDiv);
        addChartToDay(day, hourlyData);
    }
}

/**
 * Adds a Chart.js chart to the blank row of each day's table, spanning across the whole day.
 * @param {string} day - The day for which the chart is being added.
 * @param {Object} hourlyData - Data to be displayed in the chart.
 */
function addChartToDay(day, hourlyData) {
    // Get the day container
    const dayDiv = document.querySelector(`.day-table-container[data-day="${day}"]`);

    if (!dayDiv) return; // Exit if the day container doesn't exist

    // Find the blank row in the table
    const blankRow = dayDiv.querySelector('.blank-row');
    if (!blankRow) return; // Exit if the blank row doesn't exist

    // Create a canvas element for the chart
    const canvasCell = blankRow.querySelector('td:last-child'); // Get the last cell in the blank row
    canvasCell.innerHTML = ''; // Clear any existing content

    const canvas = document.createElement('canvas');
    canvas.id = `chart-${day}`;
    const canvasDiv = document.createElement('div');
    canvasDiv.className = "canvasDiv";
    canvasDiv.appendChild(canvas);
    canvasCell.colSpan = 25; // Span across all hours
    canvasCell.appendChild(canvasDiv);

    // Initialize Chart.js
    const ctx = canvas.getContext('2d');

    var chartDATA = [];
    for (var i = 0; i < 24; i++) {
        var cur = i = i <= 9 ? '0' + i : i
        for (var j = 0; j < hourlyData[cur].glData.length; j++) {
            chartDATA.push(hourlyData[cur].glData[j]);
        }
    }
    //sort this by date

    function sortByDate(arr) {
        return arr.sort((a, b) => new Date(a.x) - new Date(b.x));
    }
    chartDATA = sortByDate(chartDATA);
    const startDate = day + " 00:00:00";
    const mornning= day + " 06:00:00";
    const noon= day + " 12:00:00";
    const afternoon= day + " 18:00:00";
    const endDate = day + " 23:59:00";

    const xTicks = [
        (new Date(startDate)).getTime(),
        (new Date(mornning)).getTime(),
        (new Date(noon)).getTime(),
        (new Date(afternoon)).getTime(),
        (new Date(endDate)).getTime()
    ]

    new Chart(ctx, {
        type: 'line',
        data: {
            //labels: chartDATA, // Hours as labels
            datasets: [{
                label: 'Glucose Levels',
                data: chartDATA,
                pointRadius: function(context){
                    return 0;
                },
                borderColor: 'rgba(75, 192, 192, 1)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                layout: {
                    padding: 0,
                },
                annotation: {
                    annotations: {
                        box1: {
                            type: 'box',
                            xMin: startDate, // Set this to the minimum x value of your chart
                            xMax: endDate, // Set this to the maximum x value of your chart
                            yMin: 3.9,
                            yMax: 10,
                            backgroundColor: 'rgba(128, 200, 128, 0.2)', // Light gray background
                            borderColor: 'rgba(128, 200, 128, 0.5)', // Gray border color
                            borderWidth: 1
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            return `Glucose Level: ${context.raw.y}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'time',
                    position: 'top',
                    time: {
                        displayFormats: {
                            hour: ' HH:mm'
                        }
                    },
                    title: {
                        display: false,
                        text: 'Hour'
                    },
                    ticks:{
                        align: 'start',
                    },
                    grid: {
                        color: function(context) {
                            switch (context.tick.value) {
                                case xTicks[0]:
                                case xTicks[1]:
                                case xTicks[2]:
                                case xTicks[3]:
                                case xTicks[4]:    
                                    return '#000000';
                                default:
                                    return '#777777';
                            }
                        },
                        lineWidth: function(context) {
                            switch (context.tick.value) {
                                case xTicks[0]:
                                case xTicks[2]:
                                case xTicks[4]:    
                                    return '1';
                                case xTicks[1]:
                                case xTicks[3]:
                                    return '2';
                                default:
                                    return '1';
                            }
                        },
                        
                        
                    },
                    border: {
                        dash: function(context) {
                            switch (context.tick.value) {
                                case xTicks[0]:
                                case xTicks[2]:
                                case xTicks[4]:    
                                    return [1,0];
                                case xTicks[1]:
                                case xTicks[3]:
                                    return [1,0];
                                default:
                                    return [8,4];
                            }
                        },
                    },
                },
                y: {
                    title: {
                        display: true,
                        text: 'Glucose Level'
                    },
                    min: 0, // Set the minimum bound for y-axis
                    max: 23, // Set the maximum bound for y-axis
                    afterBuildTicks: axis => axis.ticks = [21, 10, 3.9, 0].map(v => ({ value: v }))
                }
            }
        }
        
    });
}


function dateToStr(datestring) {
    var date = new Date(datestring);

    var d = date.getDate();
    d = d <= 9 ? '0' + d : d;
    var m = date.getMonth() + 1;
    m = m <= 9 ? '0' + m : m;
    var y = date.getFullYear();
    var h = date.getHours();
    h = h <= 9 ? '0' + h : h;
    var n = date.getMinutes();
    n = n <= 9 ? '0' + n : n;
    var s = date.getSeconds();
    s = s <= 9 ? '0' + s : s;

    var dateString = y + "-" + m + "-" + d + " " + h + ":" + n + ":" + s;
    return dateString;
}
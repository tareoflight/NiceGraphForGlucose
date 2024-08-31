document.getElementById('csvFileInput').addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const text = e.target.result;
            const parsedData = parseCSV(text);
            generateCharts(parsedData);
        };
        reader.readAsText(file);
    }
});

function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split('\t'); // Assuming the data is tab-separated

    const data = lines.slice(1).map(line => {
        const values = line.split('\t');
        let entry = {};
        headers.forEach((header, index) => {
            entry[header.trim()] = values[index] ? values[index].trim() : null;
        });
        return entry;
    });

    const groupedByRecordType = {};

    data.forEach(entry => {
        const recordType = entry['Record Type'];
        if (!groupedByRecordType[recordType]) {
            groupedByRecordType[recordType] = [];
        }
        groupedByRecordType[recordType].push(entry);
    });

    for (const recordType in groupedByRecordType) {
        groupedByRecordType[recordType].sort((a, b) => {
            return new Date(a['Device Timestamp']) - new Date(b['Device Timestamp']);
        });
    }

    return groupedByRecordType;
}

function prepareChartData(parsedData) {
    const datasets = Object.keys(parsedData).map(recordType => {
        return {
            label: `Record Type ${recordType}`,
            data: parsedData[recordType].map(entry => ({
                x: new Date(entry['Device Timestamp']),
                y: parseFloat(entry['Historic Glucose mmol/L'] || entry['Scan Glucose mmol/L'] || 0)
            })),
            borderColor: getRandomColor(),
            fill: false
        };
    });

    return datasets;
}

function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

function generateCharts(parsedData) {
    const chartData = prepareChartData(parsedData);

    const ctx = document.getElementById('myChart').getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            datasets: chartData
        },
        options: {
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'minute'
                    },
                    title: {
                        display: true,
                        text: 'Time'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Glucose mmol/L'
                    }
                }
            }
        }
    });
}
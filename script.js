document.getElementById('csvFileInput').addEventListener('change', function (e) {
    const file = e.target.files[0];
    const reader = new FileReader();
    
    reader.onload = function(event) {
        const text = event.target.result;
        const data = parseCSV(text);
        renderChart(data);
    };
    
    reader.readAsText(file);
});

function parseCSV(text) {
    const rows = text.split('\n').filter(Boolean);
    const headers = rows[0].split(',');

    // Assuming the first row is headers, and data starts from the second row
    const data = rows.slice(1).map(row => {
        const values = row.split(',');
        const entry = {};
        headers.forEach((header, i) => {
            entry[header.trim()] = values[i].trim();
        });
        return entry;
    });

    return data;
}

function renderChart(data) {
    const ctx = document.getElementById('myChart').getContext('2d');
    const labels = data.map(entry => entry['Device Timestamp']); // Assuming the timestamp column is named 'Device Timestamp'
    const glucoseLevels = data.map(entry => parseFloat(entry['Historic Glucose mmol/L'])); // Adjust this to the correct column name

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Glucose Levels',
                data: glucoseLevels,
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1,
                fill: false,
            }]
        },
        options: {
            scales: {
                x: {
                    type: 'time',
                    time: {
                        parser: 'YYYY-MM-DD HH:mm', // Adjust according to your timestamp format
                        unit: 'hour',
                        displayFormats: {
                            hour: 'YYYY-MM-DD HH:mm'
                        }
                    },
                    title: {
                        display: true,
                        text: 'Timestamp'
                    }
                },
                y: {
                    beginAtZero: false,
                    title: {
                        display: true,
                        text: 'Glucose (mmol/L)'
                    }
                }
            }
        }
    });
}

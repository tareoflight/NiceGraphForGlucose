document.getElementById('csvFileInput').addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const text = e.target.result;
            const data = parseCSV(text);
            generateCharts(data);
        };
        reader.readAsText(file);
    }
});

function parseCSV(text) {
    const lines = text.split('\n');
    const headers = lines[1].split(',');
    const data = [];

    for (let i = 2; i < lines.length; i++) {
        const row = lines[i].split(',');
        const record = {
            timestamp: row[2],
            glucose: parseFloat(row[4]) || parseFloat(row[5]) || null,
            carbs: parseFloat(row[10]) || null,
            insulin: parseFloat(row[8]) || parseFloat(row[12]) || null,
        };
        data.push(record);
    }

    return data;
}

function generateCharts(data) {
    const timestamps = data.map(d => d.timestamp);
    const glucoseLevels = data.map(d => d.glucose);
    const carbs = data.map(d => d.carbs);
    const insulin = data.map(d => d.insulin);

    const glucoseCtx = document.getElementById('glucoseChart').getContext('2d');
    new Chart(glucoseCtx, {
        type: 'line',
        data: {
            labels: timestamps,
            datasets: [{
                label: 'Glucose Levels (mmol/L)',
                data: glucoseLevels,
                borderColor: 'rgba(255, 99, 132, 1)',
                backgroundColor: 'rgba(255, 99, 132, 0.2)',
                fill: false
            }]
        }
    });

    const carbsCtx = document.getElementById('carbsChart').getContext('2d');
    new Chart(carbsCtx, {
        type: 'bar',
        data: {
            labels: timestamps,
            datasets: [{
                label: 'Carbohydrates (grams)',
                data: carbs,
                backgroundColor: 'rgba(54, 162, 235, 0.2)',
                borderColor: 'rgba(54, 162, 235, 1)',
                fill: false
            }]
        }
    });

    const insulinCtx = document.getElementById('insulinChart').getContext('2d');
    new Chart(insulinCtx, {
        type: 'line',
        data: {
            labels: timestamps,
            datasets: [{
                label: 'Insulin (units)',
                data: insulin,
                borderColor: 'rgba(75, 192, 192, 1)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                fill: false
            }]
        }
    });
}
